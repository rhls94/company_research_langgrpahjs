/**
 * Centralized job status and event management to ensure consistency
 * between in-memory processing and MongoDB persistence.
 */

export const jobStatus = {};
let mongodb = null;

/**
 * Initialize the database service for persistent event logging
 */
export const setDatabaseService = (service) => {
    mongodb = service;
};

/**
 * Emit an event to a job's event stream.
 * Handles both in-memory state and MongoDB persistence.
 */
export const emitEvent = async (jobId, event) => {
    // 1. Update in-memory state for fast access
    if (!jobStatus[jobId]) {
        jobStatus[jobId] = {
            events: [],
            status: 'processing',
            current_step: event.step || 'unknown'
        };
    }

    if (!jobStatus[jobId].events) {
        jobStatus[jobId].events = [];
    }

    const eventWithTimestamp = {
        ...event,
        timestamp: new Date().toISOString()
    };

    jobStatus[jobId].events.push(eventWithTimestamp);

    // 2. Persist to MongoDB if available
    if (mongodb) {
        try {
            await mongodb.addJobEvent(jobId, event);

            // Also update current step if provided in the event
            if (event.step) {
                await mongodb.updateJobStatus(jobId, { current_step: event.step });
            }
        } catch (err) {
            console.error(`Failed to persist event for job ${jobId}:`, err);
        }
    }

    return eventWithTimestamp;
};

/**
 * Update the overall status of a job
 */
export const updateJobStatus = async (jobId, updates) => {
    if (jobStatus[jobId]) {
        Object.assign(jobStatus[jobId], updates);
        jobStatus[jobId].last_update = new Date().toISOString();
    }

    if (mongodb) {
        try {
            await mongodb.updateJobStatus(jobId, updates);
        } catch (err) {
            console.error(`Failed to update job status in MongoDB for ${jobId}:`, err);
        }
    }
};
