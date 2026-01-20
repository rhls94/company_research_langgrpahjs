import { tavily } from "@tavily/core";
import { AIMessage } from "@langchain/core/messages";
import { jobStatus, emitEvent, updateJobStatus } from "../../services/job_state.service.js";


export const grounding = async (state) => {
    const company = state.company || 'Unknown Company';
    const jobId = state.job_id;
    let msg = `🎯 Initiating research for ${company}...\n`;

    // Emit initialization event
    const initEvent = {
        type: "research_init",
        company: company,
        message: `Initiating research for ${company}`,
        step: "Initializing"
    };

    if (jobId && jobStatus[jobId]) {
        await emitEvent(jobId, initEvent);
    }

    // Check for missing data - interrupt if URL or HQ is missing
    const missingFields = [];
    if (!state.company_url) missingFields.push('company_url');
    if (!state.hq_location) missingFields.push('hq_location');

    if (missingFields.length > 0) {
        console.log(`⏸️  Missing required fields: ${missingFields.join(', ')}`);

        return {
            interrupt: {
                type: 'missing_data',
                message: `Please provide missing information for ${company}`,
                data: {
                    missing_fields: missingFields,
                    company: company
                }
            }
        };
    }

    let siteScrape = {};
    const url = state.company_url;

    if (url) {
        msg += `\n🌐 Crawling company website: ${url}`;
        console.log(`Starting website analysis for ${url}`);

        const crawlStartEvent = {
            type: "crawl_start",
            url: url,
            message: `Crawling company website: ${url}`,
            step: "Website Crawl"
        };

        if (jobId && jobStatus[jobId]) {
            await emitEvent(jobId, crawlStartEvent);
        }

        try {
            console.log("Initiating Tavily crawl");
            const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
            const query = `site:${url} ${company}`;
            const response = await tvly.search(query, {
                includeRawContent: true,
                maxResults: 5
            });

            if (response.results && response.results.length > 0) {
                response.results.forEach(result => {
                    const pageUrl = result.url;
                    if (result.rawContent) {
                        siteScrape[pageUrl] = {
                            raw_content: result.rawContent,
                            source: 'company_website',
                            url: pageUrl,
                            title: result.title
                        };
                    }
                });
                msg += `\n✅ Crawled ${Object.keys(siteScrape).length} pages from ${url}`;

                if (jobId && jobStatus[jobId]) {
                    await emitEvent(jobId, {
                        type: "crawl_complete",
                        pages_count: Object.keys(siteScrape).length,
                        step: "Website Crawl"
                    });
                }

            } else {
                msg += "\n⚠️ No content found in website crawl";
            }

        } catch (e) {
            console.error(`Website crawl error: ${e}`);
            msg += `\n⚠️ Error crawling website content: ${e}`;
            if (jobId && jobStatus[jobId]) {
                await emitEvent(jobId, {
                    type: "crawl_error",
                    error: String(e),
                    message: `⚠️ Error crawling website content: ${e}`,
                    step: "Initial Site Scrape",
                    continue_research: true
                });
            }

        }

    } else {
        // Fallback: Perform general search for company homepage/info if no URL provided
        msg += "\n🔍 No company URL provided, performing general search...";
        console.log(`No URL provided, searching for ${company}`);

        const searchStartEvent = {
            type: "crawl_start", // Re-use event type for UI compatibility
            url: "General Search",
            message: `Searching for ${company} information`,
            step: "Website Crawl"
        };

        if (jobId && jobStatus[jobId]) {
            await emitEvent(jobId, searchStartEvent);
        }

        try {
            const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
            const response = await tvly.search(`${company} official website homepage`, {
                includeRawContent: true,
                maxResults: 3
            });

            if (response.results && response.results.length > 0) {
                response.results.forEach(result => {
                    if (result.rawContent) {
                        siteScrape[result.url] = {
                            raw_content: result.rawContent,
                            source: 'general_search',
                            url: result.url,
                            title: result.title
                        };
                    }
                });
                msg += `\n✅ Found ${Object.keys(siteScrape).length} relevant pages`;
                if (jobId && jobStatus[jobId]) {
                    await emitEvent(jobId, {
                        type: "crawl_complete",
                        pages_count: Object.keys(siteScrape).length,
                        step: "Website Crawl"
                    });
                }
            } else {
                msg += "\n⚠️ No results found in general search";
            }
        } catch (e) {
            console.error(`General search error: ${e}`);
            msg += `\n⚠️ Error searching: ${e}`;
        }
    }

    if (state.hq_location) {
        msg += `\n📍 Company HQ: ${state.hq_location}`;
    }
    if (state.industry) {
        msg += `\n🏭 Industry: ${state.industry}`;
    }

    return {
        messages: [new AIMessage({ content: msg })],
        site_scrape: siteScrape,
        interrupt: null // CLEAR INTERRUPT ON SUCCESSFUL EXECUTION
    };

};
