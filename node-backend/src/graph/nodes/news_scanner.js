import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tavily } from "@tavily/core";
import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";
import { NEWS_SCANNER_QUERY_PROMPT, QUERY_FORMAT_GUIDELINES } from "../prompts.js";

export const newsScanner = async (state) => {
    const company = state.company;
    const jobId = state.job_id;

    console.log("News Scanner running");

    const event = {
        type: "news_analysis_start",
        message: "Scanning news coverage...",
        step: "News Analysis"
    };

    if (jobId && jobStatus[jobId]) {
        await emitEvent(jobId, event);
    }

    const llm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0
    });

    const prompt = `${NEWS_SCANNER_QUERY_PROMPT.replaceAll("{company}", company)}
    ${QUERY_FORMAT_GUIDELINES.replaceAll("{company}", company)}`;

    const messages = [
        new SystemMessage("You are a news analyst expert."),
        new HumanMessage(prompt)
    ];

    let newsData = {};

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
                queries = [`${company} recent news`, `${company} controversies problems`];
            }
        } catch (e) {
            console.error("Error parsing queries:", e);
            queries = [`${company} recent news`];
        }

        console.log(`News Scanner generated ${queries.length} queries`);

        for (const [i, q] of queries.entries()) {
            if (jobId && jobStatus[jobId]) {
                await emitEvent(jobId, {
                    type: "query_generated",
                    query: q,
                    query_number: i + 1,
                    category: "news"
                });
            }
        }


        const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
        const searchResults = [];

        for (const query of queries.slice(0, 3)) {
            try {
                const result = await tvly.search(query, {
                    topic: "news",
                    days: 30, // Last 30 days
                    maxResults: 3
                });
                if (result.results) searchResults.push(...result.results);
            } catch (err) {
                console.error(`Search error for query '${query}':`, err);
            }
        }

        searchResults.forEach(doc => {
            newsData[doc.url] = {
                url: doc.url,
                content: doc.content,
                raw_content: doc.rawContent || doc.content,
                title: doc.title,
                score: doc.score,
                published_date: doc.publishedDate,
                source: "tavily_news",
                query: "news scan"
            };
        });

    } catch (e) {
        console.error("News scanner error:", e);
    }

    return { news_data: newsData };
};
