import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { MongoDBService } from './services/mongo.service.js';
import { PDFService } from './services/pdf.service.js';
import { Graph } from './graph/graph_wrapper.js';


import { jobStatus, setDatabaseService, updateJobStatus, emitEvent } from './services/job_state.service.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Services
const mongoUri = process.env.MONGODB_URI;
let mongodb = null;
if (mongoUri) {
    try {
        mongodb = new MongoDBService(mongoUri);
        setDatabaseService(mongodb);
        console.log("MongoDB integration enabled");
    } catch (e) {
        console.warn(`Failed to initialize MongoDB: ${e}. Continuing without persistence.`);
    }
}


// Routes

app.get('/', (req, res) => {
    res.json({ message: "Alive" });
});

app.post('/research', async (req, res) => {
    try {
        const { company, company_url, industry, hq_location } = req.body;
        console.log(`Received research request for ${company}`);

        const jobId = uuidv4();

        if (mongodb) {
            // Create job in MongoDB with initial status
            await mongodb.createJob(jobId, req.body);
            await mongodb.updateJobStatus(jobId, {
                status: 'pending',
                company: company,
                current_step: 'starting'
            });
        } else {
            // Fallback to in-memory if MongoDB not available
            jobStatus[jobId] = {
                status: "pending",
                company,
                events: [],
                current_step: "starting",
                last_update: new Date().toISOString()
            };
        }

        // Start processing in background
        processResearch(jobId, { company, company_url, industry, hq_location });

        res.json({
            status: "accepted",
            job_id: jobId,
            message: "Research started. Connect to /research/{job_id}/stream for updates."
        });

    } catch (e) {
        console.error(`Error initiating research: ${e}`);
        res.status(500).json({ detail: String(e) });
    }
});

async function processResearch(jobId, data) {
    try {
        console.log(`Starting research for ${data.company}`);

        if (mongodb) {
            await mongodb.updateJobStatus(jobId, { status: 'processing' });
        } else if (jobStatus[jobId]) {
            jobStatus[jobId].status = 'processing';
        }

        // Initialize checkpointer if MongoDB is available
        // TODO: Complete MongoDBSaver implementation with putWrites, etc.
        // const checkpointer = mongodb ? new (await import('./services/checkpoint.service.js')).MongoDBSaver() : null;
        const checkpointer = null; // Disabled until full implementation

        const graph = new Graph({
            company: data.company,
            company_url: data.company_url,
            industry: data.industry,
            hq_location: data.hq_location,
            job_id: jobId
        }, checkpointer);

        const app = graph.compile();

        const inputState = graph.inputState;

        // Initialize checkpointer if MongoDB is available
        const config = {
            recursionLimit: 50,
            configurable: { thread_id: jobId }
        };

        // Determine if we should resume or start fresh
        // If it's a resumption, we pass null as input to pick up from checkpoint
        const state = await app.getState(config);
        const isResuming = state && state.values && Object.keys(state.values).length > 0;

        console.log(isResuming ? `🔄 Resuming job ${jobId} from checkpoint` : `🆕 Starting fresh job ${jobId}`);

        const stream = await app.stream(isResuming ? null : inputState, config);


        let finalState = {};

        for await (const chunk of stream) {
            const nodeName = Object.keys(chunk)[0];
            const state = chunk[nodeName];

            finalState = { ...finalState, ...state };

            console.log(`Node completed: ${nodeName}`);
            await updateJobStatus(jobId, { current_step: nodeName });

            // Check for interrupt
            if (state.interrupt) {

                await updateJobStatus(jobId, {
                    status: 'awaiting_approval',
                    interrupt: state.interrupt
                });

                await emitEvent(jobId, {
                    type: 'interrupt',
                    interrupt_type: state.interrupt.type,
                    message: state.interrupt.message,
                    data: state.interrupt.data
                });

                console.log(`⏸️  Workflow interrupted: ${state.interrupt.type}`);
                return; // Pause here, waiting for user approval
            }
        }


        // Extract report
        const reportContent = finalState.report || (finalState.editor && finalState.editor.report);

        if (reportContent) {

            console.log(`Research completed. Report length: ${reportContent.length}`);
            await updateJobStatus(jobId, { status: 'completed', report: reportContent });
        } else {
            console.error("Research completed without report.");
            await updateJobStatus(jobId, { status: 'failed', error: 'No report generated' });
        }

    } catch (error) {
        console.error(`Research failed: ${error}`);
        await updateJobStatus(jobId, { status: 'failed', error: String(error) });
    }

}

app.get('/research/:job_id', async (req, res) => {
    if (!mongodb) {
        res.status(501).json({ detail: "Database persistence not configured" });
        return;
    }
    const job = await mongodb.getJob(req.params.job_id);
    if (!job) {
        res.status(404).json({ detail: "Research job not found" });
        return;
    }
    res.json(job);
});


// Check if job is awaiting human approval
app.get('/research/:job_id/pending', (req, res) => {
    const jobId = req.params.job_id;
    const status = jobStatus[jobId];

    if (!status) {
        res.status(404).json({ detail: "Job not found" });
        return;
    }

    res.json({
        status: status.status,
        interrupt: status.interrupt || null,
        awaiting_approval: status.status === 'awaiting_approval'
    });
});

// Approve and resume workflow
app.post('/research/:job_id/approve', async (req, res) => {
    const jobId = req.params.job_id;
    const { approved, data } = req.body;

    // Get current job status from MongoDB or in-memory
    let currentStatus;
    if (mongodb) {
        currentStatus = await mongodb.getJobStatus(jobId);
    } else {
        currentStatus = jobStatus[jobId];
    }

    if (!currentStatus || currentStatus.status !== 'awaiting_approval') {
        res.status(400).json({ detail: "Job is not awaiting approval" });
        return;
    }

    if (!approved) {
        // User rejected, mark as failed
        if (mongodb) {
            await mongodb.updateJobStatus(jobId, {
                status: 'rejected',
                error: 'User rejected approval'
            });
        } else if (jobStatus[jobId]) {
            jobStatus[jobId].status = 'rejected';
            jobStatus[jobId].error = 'User rejected approval';
        }
        res.json({ status: 'rejected' });
        return;
    }

    try {
        console.log(`Resuming workflow for ${jobId} with user data:`, data);

        let currentJob;
        if (mongodb) {
            currentJob = await mongodb.getJob(jobId);
        } else {
            currentJob = jobStatus[jobId] ? { data: jobStatus[jobId] } : null;
        }

        if (!currentJob) {
            res.status(404).json({ detail: "Job data not found" });
            return;
        }

        const updatedData = {
            ...currentJob.data,
            company_url: data.company_url || currentJob.data.company_url,
            hq_location: data.hq_location || currentJob.data.hq_location,
            industry: data.industry || currentJob.data.industry
        };

        // Update persistence
        if (mongodb) {
            await mongodb.updateJob(jobId, { data: updatedData });
            await mongodb.updateJobStatus(jobId, {
                status: 'processing',
                error: null,
                interrupt: null
            });
        } else if (jobStatus[jobId]) {
            Object.assign(jobStatus[jobId], updatedData, {
                status: 'processing',
                error: null,
                interrupt: null
            });
        }

        // RESUME THE GRAPH
        // Important: We need to use the graph instance with the checkpointer
        const appInstance = new Graph({}, null).compile();
        const config = { configurable: { thread_id: jobId } };

        // 1. Update the state in the checkpointer with the new data and CLEAR the interrupt
        await appInstance.updateState(config, {
            ...updatedData,
            interrupt: null
        });

        // 2. Restart the processing loop
        processResearch(jobId, updatedData);

        res.json({ status: 'processing' });

    } catch (err) {
        console.error(`Resumption error for job ${jobId}:`, err);
        res.status(500).json({ detail: String(err) });
    }
});


app.get('/research/:job_id/stream', async (req, res) => {
    const jobId = req.params.job_id;
    console.log(`[SSE] New stream request for job ${jobId}`);

    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    // Send an initial heartbeat to open the connection
    res.write(': heartbeat\n\n');

    let lastEventIndex = 0;
    let lastStep = null;
    let isFinished = false;

    const checkInterval = setInterval(async () => {
        if (isFinished) return;

        try {
            let status;
            // Get status from MongoDB or in-memory
            if (mongodb) {
                status = await mongodb.getJobStatus(jobId);
                if (!status) {
                    console.log(`[SSE] Job ${jobId} not found yet, waiting...`);
                    return;
                }
            } else {
                if (!jobStatus[jobId]) {
                    console.log(`[SSE] Job ${jobId} not found in memory, waiting...`);
                    return;
                }
                status = jobStatus[jobId];
            }

            // 1. Send any new events
            if (status.events && status.events.length > lastEventIndex) {
                const newEvents = status.events.slice(lastEventIndex);
                console.log(`[SSE] Sending ${newEvents.length} new events to job ${jobId}`);
                newEvents.forEach(event => {
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                });
                lastEventIndex = status.events.length;
            }

            // 2. Send step updates (legacy progress bar support)
            if (status.status === 'processing' && status.current_step && status.current_step !== lastStep) {
                console.log(`[SSE] Sending progress update: ${status.current_step}`);
                const data = JSON.stringify({ type: "progress", step: status.current_step });
                res.write(`data: ${data}\n\n`);
                lastStep = status.current_step;
            }

            // 3. Handle completion/failure
            if (status.status === 'completed') {
                console.log(`[SSE] Job ${jobId} completed, sending final report`);
                isFinished = true;

                // Ensure we extract the raw report string
                const reportContent = typeof status.report === 'object' && status.report.report
                    ? status.report.report
                    : status.report;

                const data = JSON.stringify({ type: "complete", report: reportContent });
                res.write(`data: ${data}\n\n`);

                clearInterval(checkInterval);
                res.end();
            } else if (status.status === 'failed' || status.status === 'rejected') {
                console.log(`[SSE] Job ${jobId} failed: ${status.error}`);
                isFinished = true;
                const data = JSON.stringify({ type: "error", error: status.error || "Research failed" });
                res.write(`data: ${data}\n\n`);

                clearInterval(checkInterval);
                res.end();
            } else {
                // Regular heartbeat to keep connection alive during slow LLM tasks
                res.write(': heartbeat\n\n');
            }
        } catch (err) {
            console.error(`[SSE] Stream error for job ${jobId}:`, err);
        }

    }, 2000); // 2 second interval is plenty for polling

    req.on('close', () => {
        console.log(`[SSE] Connection closed for job ${jobId}`);
        clearInterval(checkInterval);
        isFinished = true;
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
