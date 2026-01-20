import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tavily } from "@tavily/core";
import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";
import { COMPANY_ANALYZER_QUERY_PROMPT, QUERY_FORMAT_GUIDELINES } from "../prompts.js";

export const companyAnalyst = async (state) => {
    const company = state.company;
    const jobId = state.job_id;

    console.log("Company Analyst running");

    const event = {
        type: "company_analysis_start",
        message: "Analyzing company profile...",
        step: "Company Analysis"
    };

    if (jobId && jobStatus[jobId]) {
        await emitEvent(jobId, event);
    }

    const llm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0
    });

    const prompt = `${COMPANY_ANALYZER_QUERY_PROMPT.replaceAll("{company}", company).replaceAll("{industry}", state.industry || "Unknown")}
    ${QUERY_FORMAT_GUIDELINES.replaceAll("{company}", company)}`;

    const messages = [
        new SystemMessage("You are a corporate analyst expert."),
        new HumanMessage(prompt)
    ];

    let companyData = {};

    try {
        const response = await llm.invoke(messages);
        const content = response.content;

        let queries = [];
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                queries = parsed.queries || [];
            } else {
                queries = [`${company} leadership team`, `${company} products and services`, `${company} strategy`];
            }
        } catch (e) {
            queries = [`${company} profile overview`];
        }

        console.log(`Company Analyst generated ${queries.length} queries`);

        for (const [i, q] of queries.entries()) {
            if (jobId && jobStatus[jobId]) {
                await emitEvent(jobId, {
                    type: "query_generated",
                    query: q,
                    query_number: i + 1,
                    category: "company"
                });
            }
        }


        const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const searchResults = [];

        for (const query of queries.slice(0, 3)) {
            try {
                const result = await tvly.search(query, {
                    searchDepth: "advanced",
                    maxResults: 3
                });
                if (result.results) searchResults.push(...result.results);
            } catch (err) {
                console.error(`Search error for query '${query}':`, err);
            }
        }

        searchResults.forEach(doc => {
            companyData[doc.url] = {
                url: doc.url,
                content: doc.content,
                raw_content: doc.rawContent || doc.content,
                title: doc.title,
                score: doc.score,
                source: "tavily_search",
                query: "company analysis"
            };
        });

    } catch (e) {
        console.error("Company analyst error:", e);
    }

    return { company_data: companyData };
};
