
export const COMPANY_BRIEFING_PROMPT = `Create a focused, yet comprehensive company briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Start with: "{company} is a [what] that [does what] for [whom]"
2. Structure using these headers and bullet points:

### Core Product/Service
* List distinct products/features
* Include only verified technical capabilities

### Leadership Team
* List key leadership team members
* Include their roles and expertise

### Target Market
* List specific target audiences
* List verified use cases
* List confirmed customers/partners

### Key Differentiators
* List unique features
* List proven advantages

### Business Model
* Discuss product / service pricing
* List distribution channels

3. Each bullet must be a single, complete fact
4. Never mention "no information found" or "no data available"
5. No paragraphs, only bullet points
6. Provide only the briefing. No explanations or commentary.`;

export const INDUSTRY_BRIEFING_PROMPT = `Create a focused, yet comprehensive industry briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these exact headers and bullet points:

### Market Overview
* State {company}'s exact market segment
* List market size with year
* List growth rate with year range

### Direct Competition
* List named direct competitors
* List specific competing products
* List market positions

### Competitive Advantages
* List unique technical features
* List proven advantages

### Market Challenges
* List specific verified challenges

2. Each bullet must be a single, complete news event.
3. No paragraphs, only bullet points
4. Never mention "no information found" or "no data available"
5. Provide only the briefing. No explanation.`;

export const FINANCIAL_BRIEFING_PROMPT = `Create a focused, yet comprehensive financial briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure using these headers and bullet points:

### Funding & Investment
* Total funding amount with date
* List each funding round with date
* List named investors

### Revenue Model
* Discuss product / service pricing if applicable

2. Include specific numbers when possible
3. No paragraphs, only bullet points
4. Never mention "no information found" or "no data available"
5. NEVER repeat the same round of funding multiple times. ALWAYS assume that multiple funding rounds in the same month are the same round.
6. NEVER include a range of funding amounts. Use your best judgement to determine the exact amount based on the information provided.
6. Provide only the briefing. No explanation or commentary.`;

export const NEWS_BRIEFING_PROMPT = `Create a focused, yet comprehensive news briefing for {company}, a {industry} company based in {hq_location}.
Key requirements:
1. Structure into these categories using bullet points:

### Major Announcements
* Product / service launches
* New initiatives

### Partnerships
* Integrations
* Collaborations

### Recognition
* Awards
* Press coverage

2. Sort newest to oldest
3. One event per bullet point
4. Do not mention "no information found" or "no data available"
5. Never use ### headers, only bullet points
6. Provide only the briefing. Do not provide explanations or commentary.`;

export const BRIEFING_ANALYSIS_INSTRUCTION = `Analyze the following documents and extract key information. Provide only the briefing, no explanations or commentary:`;

export const EDITOR_SYSTEM_MESSAGE = "You are an expert report editor that compiles research briefings into comprehensive company reports.";

export const COMPILE_CONTENT_PROMPT = `You are compiling a comprehensive research report about {company}.

Compiled briefings:
{combined_content}

Create a deep, comprehensive, and thorough report on {company}, a {industry} company headquartered in {hq_location} that:
1. Integrates information from all sections into a cohesive non-repetitive narrative
2. Maintains important details from each section
3. Logically organizes information and removes transitional commentary / explanations
4. Uses clear section headers and structure

Formatting rules:
Strictly enforce this EXACT JSON output format:

{{
  "company_overview": [
    {{ "heading": "Heading", "content": "Content" }}
  ],
  "industry_overview": [
    {{ "heading": "Heading", "content": "Content" }}
  ],
  "financial_overview": [
     {{ "heading": "Heading", "content": "Content" }}
  ],
  "news_overview": [
     {{ "heading": "Heading", "content": "Content" }}
  ]
}}

Return ONLY the raw JSON. No markdown formatting, no code blocks, no explanations.`;

export const CONTENT_SWEEP_SYSTEM_MESSAGE = "You are an expert markdown formatter that ensures consistent document structure.";

export const CONTENT_SWEEP_PROMPT = `You are an expert briefing editor. You are given a report on {company}.

Current report:
{content}

1. Remove redundant or repetitive information
2. Remove information that is not relevant to {company}, the {industry} company headquartered in {hq_location}.
3. Remove sections lacking substantial content
4. Remove any meta-commentary (e.g. "Here is the news...")

Strictly enforce this EXACT JSON structure:

{{
  "company_overview": [
    {{ "heading": "Heading", "content": "Bullet point 1" }},
    {{ "heading": "Heading", "content": "Bullet point 2" }}
  ],
  "industry_overview": [ ... ],
  "financial_overview": [ ... ],
  "news_overview": [ ... ],
  "references": [ "Ref 1", "Ref 2" ]
}}

Critical rules:
1. Output must be valid JSON.
2. Remove redundant info.
3. Ensure all content is relevant to {company}.
4. "references" must be a simple list of strings.

Return ONLY the raw JSON. No markdown formatting, no code blocks.`;

export const COMPANY_ANALYZER_QUERY_PROMPT = `Generate queries on the company fundamentals of {company} in the {industry} industry such as:
- Core products and services
- Company history and milestones
- Leadership team
- Business model and strategy
`;

export const FINANCIAL_ANALYZER_QUERY_PROMPT = `Generate queries on the financial analysis of {company} in the {industry} industry such as:
- Fundraising history and valuation
- Financial statements and key metrics
- Revenue and profit sources
`;

export const INDUSTRY_ANALYZER_QUERY_PROMPT = `Generate queries on the industry analysis of {company} in the {industry} industry such as:
- Market position
- Competitors
- {industry} industry trends and challenges
- Market size and growth
`;

export const NEWS_SCANNER_QUERY_PROMPT = `Generate queries on the recent news coverage of {company} such as:
- Recent company announcements
- Press releases
- New partnerships
`;

export const QUERY_FORMAT_GUIDELINES = `
Important Guidelines:
- Focus ONLY on {company}-specific information
- Make queries very brief and to the point
- Provide exactly 4 search queries (one per line), with no hyphens or dashes
- DO NOT make assumptions about the industry - use only the provided industry information`;
