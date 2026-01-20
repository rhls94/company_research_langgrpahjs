/**
 * Helper functions to abstract jobStatus access (MongoDB or in-memory)
 */

/**
 * Update job status
 */
export async function updateStatus(mongodb, jobId, updates) {
    if (mongodb) {
        await mongodb.updateJobStatus(jobId, updates);
    } else if (global.jobStatus && global.jobStatus[jobId]) {
        Object.assign(global.jobStatus[jobId], updates);
        global.jobStatus[jobId].last_update = new Date().toISOString();
    }
}

/**
 * Add an event to the job
 */
export async function addEvent(mongodb, jobId, event) {
    if (mongodb) {
        await mongodb.addJobEvent(jobId, event);
    } else if (global.jobStatus && global.jobStatus[jobId]) {
        if (!global.jobStatus[jobId].events) {
            global.jobStatus[jobId].events = [];
        }
        global.jobStatus[jobId].events.push(event);
    }
}

/**
 * Get job status
 */
export async function getStatus(mongodb, jobId) {
    if (mongodb) {
        return await mongodb.getJobStatus(jobId);
    } else if (global.jobStatus && global.jobStatus[jobId]) {
        return global.jobStatus[jobId];
    }
    return null;
}
