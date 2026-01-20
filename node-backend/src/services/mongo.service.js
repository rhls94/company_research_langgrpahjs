import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
    uuid: { type: String, required: true, unique: true },
    status: { type: String, required: true, default: 'pending' },
    company: { type: String },
    current_step: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    report: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    events: [{ type: mongoose.Schema.Types.Mixed }],
    interrupt: { type: mongoose.Schema.Types.Mixed },
    last_update: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});


const JobModel = mongoose.model('Job', JobSchema);

export class MongoDBService {
    constructor(uri) {
        mongoose.connect(uri)
            .then(() => console.log('Connected to MongoDB'))
            .catch((err) => console.error('Could not connect to MongoDB', err));
    }

    async createJob(jobIds, data) {
        const job = new JobModel({
            uuid: jobIds,
            data: data,
            status: 'pending'
        });
        await job.save();
        return job;
    }

    async getJob(jobId) {
        return await JobModel.findOne({ uuid: jobId });
    }

    async updateJob(jobId, updates) {
        updates.updated_at = new Date();
        return await JobModel.findOneAndUpdate({ uuid: jobId }, updates, { new: true });
    }

    async storeReport(jobId, reportData) {
        return await this.updateJob(jobId, { report: reportData });
    }


    /**
     * Update job status (for progress tracking)
     */
    async updateJobStatus(jobId, statusUpdate) {
        const updates = {
            updated_at: new Date(),
            last_update: new Date()
        };

        if (statusUpdate.status) updates.status = statusUpdate.status;
        if (statusUpdate.current_step) updates.current_step = statusUpdate.current_step;
        if (statusUpdate.company) updates.company = statusUpdate.company;
        if (statusUpdate.interrupt) updates.interrupt = statusUpdate.interrupt;
        if (statusUpdate.error) updates.error = statusUpdate.error;
        if (statusUpdate.report) updates.report = statusUpdate.report;

        return await JobModel.findOneAndUpdate(
            { uuid: jobId },
            { $set: updates },
            { new: true, upsert: false }
        );
    }

    /**
     * Add an event to the job's event stream
     */
    async addJobEvent(jobId, event) {
        return await JobModel.findOneAndUpdate(
            { uuid: jobId },
            {
                $push: { events: { ...event, timestamp: new Date() } },
                $set: { last_update: new Date(), updated_at: new Date() }
            },
            { new: true }
        );
    }

    /**
     * Get job status including events
     */
    async getJobStatus(jobId) {
        const job = await JobModel.findOne({ uuid: jobId });
        if (!job) return null;

        return {
            status: job.status,
            company: job.company,
            current_step: job.current_step,
            events: job.events || [],
            interrupt: job.interrupt,
            error: job.error,
            report: job.report,
            last_update: job.last_update
        };

    }
}
