import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";
import {
    EDITOR_SYSTEM_MESSAGE,
    COMPILE_CONTENT_PROMPT,
    CONTENT_SWEEP_SYSTEM_MESSAGE,
    CONTENT_SWEEP_PROMPT
} from "../prompts.js";

export const editor = async (state) => {
    const company = state.company || 'Unknown Company';
    const jobId = state.job_id;
    console.log(`Editor running for ${company}`);

    const context = {
        company: company,
        industry: state.industry || 'Unknown',
        hq_location: state.hq_location || 'Unknown'
    };

    const llm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0,
        streaming: true
    });

    // Compile briefings
    const briefingKeys = {
        'company': 'company_briefing',
        'industry': 'industry_briefing',
        'financial': 'financial_briefing',
        'news': 'news_briefing'
    };

    const individualBriefings = [];
    for (const [category, key] of Object.entries(briefingKeys)) {
        if (state[key]) {
            individualBriefings.push(state[key]);
        }
    }

    if (individualBriefings.length === 0) {
        console.log("No briefings to compile");
        return { report: "No research data found to generate report." };
    }

    const combinedContent = individualBriefings.join("\n\n");

    if (jobId && jobStatus[jobId]) {
        await emitEvent(jobId, {
            type: "report_compilation",
            message: `Compiling final report for ${company}`,
            step: "Editor"
        });
    }


    // Step 1: Compile
    const compilePrompt = ChatPromptTemplate.fromMessages([
        ["system", EDITOR_SYSTEM_MESSAGE],
        ["user", COMPILE_CONTENT_PROMPT]
    ]);

    let initialReport = "";
    try {
        const chain = compilePrompt.pipe(llm).pipe(new StringOutputParser());
        initialReport = await chain.invoke({
            company: context.company,
            industry: context.industry,
            hq_location: context.hq_location,
            combined_content: combinedContent
        });
    } catch (e) {
        console.error("Error in initial compilation:", e);
        return { report: "Error generating report." };
    }

    // Step 2: Sweep/Format
    const sweepPrompt = ChatPromptTemplate.fromMessages([
        ["system", CONTENT_SWEEP_SYSTEM_MESSAGE],
        ["user", CONTENT_SWEEP_PROMPT]
    ]);

    const sweepChain = sweepPrompt.pipe(llm).pipe(new StringOutputParser());

    let finalReport = {};

    try {
        const resultString = await sweepChain.invoke({
            company: context.company,
            industry: context.industry,
            hq_location: context.hq_location,
            content: initialReport
        });

        // Output might be wrapped in ```json ... ``` or just raw json
        const cleanJson = resultString.replace(/```json/g, '').replace(/```/g, '').trim();
        finalReport = JSON.parse(cleanJson);

    } catch (e) {
        console.error("Error in sweep/json parse:", e);
        finalReport = { error: "Failed to parse report JSON", raw: initialReport };
    }

    // 3. Inject References (URLs) from state to ensure they are always present
    const references = new Set();
    const sources = [
        'curated_company_data',
        'curated_industry_data',
        'curated_financial_data',
        'curated_news_data'
    ];

    sources.forEach(sourceKey => {
        const sourceData = state[sourceKey];
        if (sourceData) {
            Object.values(sourceData).forEach(doc => {
                if (doc.url) {
                    references.add(JSON.stringify({ title: doc.title || doc.url, url: doc.url }));
                }
            });
        }
    });

    if (references.size > 0) {
        if (references.size > 0) {
            finalReport.references = Array.from(references).map(r => JSON.parse(r));
        }
    }

    return {
        report: JSON.stringify(finalReport), // Return as string to fit schema if needed, or object
        editor: { report: finalReport }
    };
};
