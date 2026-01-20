import { Graph } from './src/graph/index.js';
import fs from 'fs';

async function generateVisual() {
    try {
        const graphObj = new Graph({ company: 'Test' });
        const compiledGraph = graphObj.compile();

        // Use getGraph().drawMermaid() to get the mermaid source
        const mermaidSource = compiledGraph.getGraph().drawMermaid();

        console.log('--- MERMAID SOURCE START ---');
        console.log(mermaidSource);
        console.log('--- MERMAID SOURCE END ---');

        fs.writeFileSync('graph_visual.md', '```mermaid\n' + mermaidSource + '\n```');
        console.log('Saved visual to graph_visual.md');
    } catch (error) {
        console.error('Error generating visual:', error);
    }
}

generateVisual();
