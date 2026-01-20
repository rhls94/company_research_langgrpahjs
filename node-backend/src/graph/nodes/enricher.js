import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";

export const enricher = async (state) => {
    const jobId = state.job_id;
    console.log("Enricher running");

    // Since we don't have actual enrichment logic, we immediately mark all curated documents as "enriched"
    const categories = [
        { key: 'curated_company_data', name: 'company' },
        { key: 'curated_industry_data', name: 'industry' },
        { key: 'curated_financial_data', name: 'financial' },
        { key: 'curated_news_data', name: 'news' }
    ];

    for (const { key, name } of categories) {
        const data = state[key];
        if (data && typeof data === 'object') {
            const count = Object.keys(data).length;

            if (count > 0 && jobId && jobStatus[jobId]) {
                // Emit enrichment complete event
                await emitEvent(jobId, {
                    type: "enrichment",
                    category: name,
                    enriched: count,
                    total: count,
                    message: `Enriched ${count} ${name} documents`
                });
                console.log(`✨ Enriched ${count} ${name} documents`);
            }

        }
    }

    return state;
};
