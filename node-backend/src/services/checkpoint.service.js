import { BaseCheckpointSaver } from "@langchain/langgraph";
import mongoose from 'mongoose';

// Define checkpoint schema
const checkpointSchema = new mongoose.Schema({
    thread_id: { type: String, required: true, index: true },
    checkpoint_id: { type: String, required: true },
    parent_checkpoint_id: { type: String },
    checkpoint: { type: Object, required: true },
    metadata: { type: Object, default: {} },
    created_at: { type: Date, default: Date.now }
});

// Create compound index for efficient lookups
checkpointSchema.index({ thread_id: 1, checkpoint_id: 1 }, { unique: true });

const CheckpointModel = mongoose.model('Checkpoint', checkpointSchema);

/**
 * MongoDB-based checkpoint saver for LangGraph persistence
 */
export class MongoDBSaver extends BaseCheckpointSaver {
    constructor() {
        super();
    }

    /**
     * Save a checkpoint to MongoDB
     */
    async put(config, checkpoint, metadata) {
        const thread_id = config.configurable?.thread_id;
        if (!thread_id) {
            throw new Error("thread_id is required in configurable");
        }

        const checkpoint_id = checkpoint.id;
        const parent_checkpoint_id = checkpoint.parent_id || null;

        await CheckpointModel.findOneAndUpdate(
            { thread_id, checkpoint_id },
            {
                thread_id,
                checkpoint_id,
                parent_checkpoint_id,
                checkpoint,
                metadata,
                created_at: new Date()
            },
            { upsert: true, new: true }
        );

        return {
            configurable: {
                thread_id,
                checkpoint_id
            }
        };
    }

    /**
     * Get a specific checkpoint or the latest checkpoint for a thread
     */
    async getTuple(config) {
        const thread_id = config.configurable?.thread_id;
        if (!thread_id) {
            return undefined;
        }

        const checkpoint_id = config.configurable?.checkpoint_id;

        let doc;
        if (checkpoint_id) {
            // Get specific checkpoint
            doc = await CheckpointModel.findOne({ thread_id, checkpoint_id });
        } else {
            // Get latest checkpoint for thread
            doc = await CheckpointModel.findOne({ thread_id })
                .sort({ created_at: -1 })
                .limit(1);
        }

        if (!doc) {
            return undefined;
        }

        return {
            config: {
                configurable: {
                    thread_id: doc.thread_id,
                    checkpoint_id: doc.checkpoint_id
                }
            },
            checkpoint: doc.checkpoint,
            metadata: doc.metadata || {},
            parentConfig: doc.parent_checkpoint_id ? {
                configurable: {
                    thread_id: doc.thread_id,
                    checkpoint_id: doc.parent_checkpoint_id
                }
            } : undefined
        };
    }

    /**
     * List all checkpoints for a thread
     */
    async *list(config, options) {
        const thread_id = config.configurable?.thread_id;
        if (!thread_id) {
            return;
        }

        const limit = options?.limit || 10;
        const docs = await CheckpointModel.find({ thread_id })
            .sort({ created_at: -1 })
            .limit(limit);

        for (const doc of docs) {
            yield {
                config: {
                    configurable: {
                        thread_id: doc.thread_id,
                        checkpoint_id: doc.checkpoint_id
                    }
                },
                checkpoint: doc.checkpoint,
                metadata: doc.metadata || {},
                parentConfig: doc.parent_checkpoint_id ? {
                    configurable: {
                        thread_id: doc.thread_id,
                        checkpoint_id: doc.parent_checkpoint_id
                    }
                } : undefined
            };
        }
    }
}
