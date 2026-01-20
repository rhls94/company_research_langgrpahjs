import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";

export const curator = async (state) => {
    const company = state.company || 'Unknown Company';
    const jobId = state.job_id;
    console.log(`🔍 Curating research data for ${company}`);

    const context = {
        company: company,
        industry: state.industry || 'Unknown',
        hq_location: state.hq_location || 'Unknown'
    };

    const dataTypes = {
        'financial_data': ['💰 Financial', 'financial'],
        'news_data': ['📰 News', 'news'],
        'industry_data': ['🏭 Industry', 'industry'],
        'company_data': ['🏢 Company', 'company']
    };

    // For this port, since we are using simulated data or direct LLM findings 
    // without genuine Tavily search results (urls, scores), we will primarily 
    // pass through the 'findings' from the analysts.

    const curatedUpdates = {};

    for (const [dataField, [emoji, docType]] of Object.entries(dataTypes)) {
        const data = state[dataField];

        // Emit curation event
        if (jobId && jobStatus[jobId]) {
            const count = data ? Object.keys(data).length : 0;
            await emitEvent(jobId, {
                type: "curation",
                category: docType,
                total: count,
                message: `Curating ${docType} documents`
            });
        }


        if (data) {
            // In the python version, this filtered by score. 
            // Here we simple pass it to the curated bucket.
            curatedUpdates[`curated_${dataField}`] = data;
            console.log(`${emoji}: Kept data for ${docType}`);
        } else {
            console.log(`${emoji}: No data for ${docType}`);
        }
    }

    return curatedUpdates;
};
