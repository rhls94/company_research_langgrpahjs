import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tavily } from "@tavily/core";
import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";
import { FINANCIAL_ANALYZER_QUERY_PROMPT, QUERY_FORMAT_GUIDELINES } from "../prompts.js";

export const financialAnalyst = async (state) => {
    const company = state.company;
    const jobId = state.job_id;

    console.log("Financial Analyst running");

    const event = {
        type: "analysis_start",
        message: "Conducting financial analysis...",
        step: "Financial Analysis"
    };

    if (jobId && jobStatus[jobId]) {
        await emitEvent(jobId, event);
    }

    const llm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0
    });

    // 1. Generate Queries
    const prompt = `${FINANCIAL_ANALYZER_QUERY_PROMPT.replaceAll("{company}", company).replaceAll("{industry}", state.industry || "Unknown")}
    ${QUERY_FORMAT_GUIDELINES.replaceAll("{company}", company)}`;

    const messages = [
        new SystemMessage("You are a financial analyst expert."),
        new HumanMessage(prompt)
    ];

    let financialData = {};

    try {
        const response = await llm.invoke(messages);
        const content = response.content;

        // Parse queries (Expected format: JSON object with "queries" array or list)
        // Prompts usually enforce { "queries": ["query1", "query2"] }
        let queries = [];
        try {
            // Attempt to finding JSON block
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                queries = parsed.queries || [];
            } else {
                // Fallback parsing if not valid JSON
                console.warn("Could not parse JSON queries, falling back to line splitting");
                queries = content.split('\n').filter(line => line.trim().length > 5).slice(0, 3);
            }
        } catch (e) {
            console.error("Error parsing queries:", e);
            queries = [`${company} financial performance revenue profit`, `${company} stock analysis`];
        }

        console.log(`Financial Analyst generated ${queries.length} queries:`, queries);

        // Emit query generation events
        for (const [i, q] of queries.entries()) {
            if (jobId && jobStatus[jobId]) {
                await emitEvent(jobId, {
                    type: "query_generated",
                    query: q,
                    query_number: i + 1,
                    category: "financial"
                });
            }
        }


        // 2. Execute Searches
        const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const searchResults = [];

        for (const query of queries.slice(0, 3)) { // Limit to 3 queries
            try {
                const result = await tvly.search(query, {
                    searchDepth: "advanced",
                    maxResults: 3
                });

                if (result.results) {
                    searchResults.push(...result.results);
                }
            } catch (err) {
                console.error(`Search error for query '${query}':`, err);
            }
        }

        // 3. Aggregate Finding
        // In python version it passes raw docs. 
        // We will structure them similarly so Curator can pick them up.
        // We convert list to a dict keyed by URL to match state structure expected by curator

        searchResults.forEach(doc => {
            financialData[doc.url] = {
                url: doc.url,
                content: doc.content,
                raw_content: doc.rawContent || doc.content,
                title: doc.title,
                score: doc.score,
                source: "tavily_search",
                query: "financial analysis"
            };
        });

        if (jobId && jobStatus[jobId]) {
            await emitEvent(jobId, {
                type: "analysis_complete",
                findings_count: Object.keys(financialData).length,
                step: "Financial Analysis"
            });
        }


    } catch (e) {
        console.error("Financial analyst error:", e);
    }

    return { financial_data: financialData };

};
