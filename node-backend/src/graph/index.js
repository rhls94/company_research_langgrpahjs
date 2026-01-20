import { StateGraph, END, START, Annotation, MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
import { grounding } from "./nodes/grounding.js";
import { financialAnalyst } from "./nodes/financial_analyst.js";
import { newsScanner } from "./nodes/news_scanner.js";
import { industryAnalyst } from "./nodes/industry_analyst.js";
import { companyAnalyst } from "./nodes/company_analyst.js";
import { collector } from "./nodes/collector.js";
import { curator } from "./nodes/curator.js";
import { enricher } from "./nodes/enricher.js";
import { briefing } from "./nodes/briefing.js";
import { editor } from "./nodes/editor.js";

// Define the Research State with Zod for robust CLI schema extraction
export const ResearchState = Annotation.Root({
    company: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => ""
    }),
    company_url: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    hq_location: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    industry: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    job_id: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    messages: Annotation({
        reducer: (x, y) => (x || []).concat(y || []),
        default: () => []
    }),

    // Research Data
    site_scrape: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),
    financial_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),
    news_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),
    industry_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),
    company_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),

    // Curated Data
    curated_financial_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),
    curated_news_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),
    curated_industry_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),
    curated_company_data: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),

    // Briefings
    financial_briefing: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    news_briefing: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    industry_briefing: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    company_briefing: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),
    references: Annotation({
        reducer: (x, y) => (x || []).concat(y || []),
        default: () => []
    }),
    briefings: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    }),

    report: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => undefined
    }),

    // Human-in-the-loop interrupt state
    interrupt: Annotation({
        reducer: (x, y) => y, // Allow clearing with null
        default: () => null
    })

});

// Routing function to handle interrupts
const routeAfterGrounding = (state) => {
    if (state.interrupt) {
        console.log(`[Router] Interrupt detected: ${JSON.stringify(state.interrupt)}`);
        return END;
    }
    console.log("[Router] No interrupt, proceeding to analysis");
    return ["financial_analyst", "news_scanner", "industry_analyst", "company_analyst"];
};


// Build the workflow
const workflow = new StateGraph(ResearchState)
    .addNode("grounding", grounding)
    .addNode("financial_analyst", financialAnalyst)
    .addNode("news_scanner", newsScanner)
    .addNode("industry_analyst", industryAnalyst)
    .addNode("company_analyst", companyAnalyst)
    .addNode("collector", collector)
    .addNode("curator", curator)
    .addNode("enricher", enricher)
    .addNode("briefing", briefing)
    .addNode("editor", editor)
    .addEdge(START, "grounding")
    // Conditional edge replace static edges to parallel nodes
    .addConditionalEdges("grounding", routeAfterGrounding)
    .addEdge("financial_analyst", "collector")
    .addEdge("news_scanner", "collector")
    .addEdge("industry_analyst", "collector")
    .addEdge("company_analyst", "collector")
    .addEdge("collector", "curator")
    .addEdge("curator", "enricher")
    .addEdge("enricher", "briefing")
    .addEdge("briefing", "editor")
    .addEdge("editor", END);


// Export the compiled graph for both the app and the CLI
// Use MemorySaver to enable checkpointing and Human-in-the-loop
const checkpointer = new MemorySaver();
export const graph = workflow.compile({ checkpointer });


