import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";
import {
    COMPANY_BRIEFING_PROMPT,
    INDUSTRY_BRIEFING_PROMPT,
    FINANCIAL_BRIEFING_PROMPT,
    NEWS_BRIEFING_PROMPT,
    BRIEFING_ANALYSIS_INSTRUCTION
} from "../prompts.js";

export const briefing = async (state) => {
    const company = state.company || 'Unknown Company';
    const jobId = state.job_id;
    console.log(`Briefing running for ${company}`);

    // We strictly use OpenAI here, replacing Gemini from the python version
    const llm = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0
    });

    const context = {
        company: company,
        industry: state.industry || 'Unknown',
        hq_location: state.hq_location || 'Unknown'
    };

    const categories = {
        'financial_data': ["financial", "financial_briefing"],
        'news_data': ["news", "news_briefing"],
        'industry_data': ["industry", "industry_briefing"],
        'company_data': ["company", "company_briefing"]
    };

    const prompts = {
        'company': COMPANY_BRIEFING_PROMPT,
        'industry': INDUSTRY_BRIEFING_PROMPT,
        'financial': FINANCIAL_BRIEFING_PROMPT,
        'news': NEWS_BRIEFING_PROMPT,
    };

    const updates = { briefings: {} };

    for (const [dataField, [category, briefingKey]] of Object.entries(categories)) {
        const curatedKey = `curated_${dataField}`;
        const curatedData = state[curatedKey];

        if (!curatedData) {
            console.log(`No data for ${category} briefing`);
            continue;
        }

        // Prepare content (simulation of formatting documents)
        // In python it formatted list of docs. Here we might have a 'findings' string or object.
        let docsContent = "";
        if (curatedData.findings) {
            docsContent = curatedData.findings;
        } else {
            docsContent = JSON.stringify(curatedData);
        }

        console.log(`Generating ${category} briefing...`);

        if (jobId && jobStatus[jobId]) {
            const count = curatedData.findings ? 1 : (typeof curatedData === 'object' ? Object.keys(curatedData).length : 1);
            await emitEvent(jobId, {
                type: "briefing_start",
                category: category,
                total_docs: count,
                step: "Briefing"
            });
        }


        const categoryPrompt = (prompts[category] || "").replaceAll("{company}", context.company)
            .replaceAll("{industry}", context.industry)
            .replaceAll("{hq_location}", context.hq_location);

        const prompt = ChatPromptTemplate.fromMessages([
            ["user", `${categoryPrompt}\n\n${BRIEFING_ANALYSIS_INSTRUCTION}\n\n{documents}`]
        ]);

        try {
            const chain = prompt.pipe(llm).pipe(new StringOutputParser());
            const content = await chain.invoke({
                documents: docsContent
            });

            updates[briefingKey] = content;
            updates.briefings[category] = content;

            if (jobId && jobStatus[jobId]) {
                await emitEvent(jobId, {
                    type: "briefing_complete",
                    category: category,
                    content_length: content.length,
                    step: "Briefing"
                });
            }


        } catch (e) {
            console.error(`Error generating ${category} briefing: ${e}`);
        }
    }

    return updates;
};
