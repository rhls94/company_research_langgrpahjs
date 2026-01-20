import { graph, ResearchState } from './index.js';

/**
 * Backward compatibility wrapper for the Graph class.
 * This class is used by the main application to compile the graph
 * with or without a checkpointer.
 */
export class Graph {
    constructor(input, checkpointer = null) {
        this.inputState = input;
        this.checkpointer = checkpointer;
    }

    compile() {
        if (this.checkpointer) {
            // Re-importing workflow if we need to re-compile with a checkpointer
            // This is a bit redundant but keeps index.js clean for the CLI
            return graph; // For now returning the pre-compiled graph
        }
        return graph;
    }
}
