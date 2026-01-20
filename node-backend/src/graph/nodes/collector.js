import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";

export const collector = async (state) => {
    const jobId = state.job_id;

    const company = state.company || 'Unknown Company';
    console.log(`📦 Collecting research data for ${company}`);

    // Check each type of research data
    const researchTypes = {
        'financial_data': '💰 Financial',
        'news_data': '📰 News',
        'industry_data': '🏭 Industry',
        'company_data': '🏢 Company'
    };

    const messages = [];
    messages.push(`📦 Collecting research data for ${company}:`);

    for (const [dataField, label] of Object.entries(researchTypes)) {
        const data = state[dataField];
        if (data && Object.keys(data).length > 0) {
            // Simplified count check since our data structure might differ slightly in port
            // Assuming data is an object with results or findings
            const count = data.findings ? 1 : Object.keys(data).length;
            messages.push(`• ${label}: ${count} documents/findings collected`);
        } else {
            messages.push(`• ${label}: No data found`);
        }
    }

    // In a real implementation we would merge messages properly into the state
    // For now logging them
    console.log(messages.join('\n'));

    if (jobId && jobStatus[jobId]) {
        await emitEvent(jobId, {
            type: "collection_complete",
            message: `Collected data for ${company}`,
            step: "Collection"
        });
    }

    return {};
};
