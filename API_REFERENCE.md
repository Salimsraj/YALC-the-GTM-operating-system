# YALC Complete API Reference

## All Integrated APIs & Providers

### 1. **LinkUp** — Web Search
- **Status**: ✅ Configured
- **API Key**: `LINKUP_API_KEY`
- **Base URL**: `https://api.linkup.so`
- **Main Endpoints**:
  - `GET /search` — Single-pass web search (sub-second)
  - `GET /research` — Multi-step research with synthesis (beta)
  - `GET /extract` — Data extraction (closed beta)
- **Use Case**: Finding companies and content online
- **Auth**: Bearer token
- **Response**: JSON with search results

---

### 2. **Crustdata** — B2B Company Data
- **Status**: ✅ Configured
- **API Key**: `CRUSTDATA_API_KEY`
- **Base URL**: `https://api.crustdata.com/v2`
- **Main Endpoints**:
  - `POST /companies/search` — Search companies by criteria
  - `GET /companies/:id` — Get company details
  - `POST /people/search` — Search people at companies
  - `GET /people/:id` — Get person details
  - `POST /jobs/search` — Search job openings
- **Use Case**: Find companies by size, funding, industry, location
- **Auth**: Bearer token
- **Required Headers**: 
  - `Authorization: Bearer <key>`
  - `x-api-version: 2025-11-01`
- **Data Available**: 16+ datasets (headcount, reviews, traffic, jobs, news, funding)

---

### 3. **Prospeo** — Find People & Enrich Emails/Phone
- **Status**: ✅ Configured
- **API Key**: `PROSPEO_API_KEY`
- **Base URL**: `https://api.prospeo.io/v2`
- **Main Endpoints**:
  - `GET /people/search` — Find people at companies
    - Params: `company`, `domain`, `title`, `first_name`, `last_name`, `limit`
  - `GET /people/enrich` — Enrich person with email/phone
    - Params: `first_name`, `last_name`, `company`, `domain`, `linkedin_url`
  - `GET /credits` — Check API credits
- **Use Case**: Find people at target companies with verified emails & phone numbers
- **Auth**: API key in query params
- **Response Time**: Real-time
- **Output**: Name, email, phone, company, title, LinkedIn URL, confidence score

---

### 4. **Apify** — Web Scraping & Actors
- **Status**: ✅ Configured
- **API Key**: `APIFY_API_KEY`
- **Base URL**: `https://api.apify.com/v2`
- **Main Endpoints**:
  - `POST /actors/:actorId/run-sync` — Run actor synchronously
  - `POST /actors/:actorId/runs` — Run actor asynchronously
  - `GET /runs/:runId` — Get run status
  - `GET /datasets/:datasetId/items` — Get results
  - `GET /users/me` — Get account info
- **Use Case**: Scrape LinkedIn profiles, websites, extract structured data
- **Auth**: Bearer token
- **Response**: JSON with run status and data
- **Notable Actors**:
  - LinkedIn Profile Scraper
  - Website Scraper
  - Google Search Results

---

### 5. **Firecrawl** — LLM-Powered Web Context API
- **Status**: ✅ Configured
- **API Key**: `FIRECRAWL_API_KEY`
- **Base URL**: `https://api.firecrawl.dev`
- **Main Endpoints**:
  - `POST /scrape` — Scrape single page
  - `POST /crawl` — Crawl entire website
  - `POST /map` — Map site structure
  - `POST /extract` — Extract structured data
- **Use Case**: Deep web research, content extraction, site mapping
- **Auth**: Bearer token
- **Response Format**: Markdown + structured data

---

### 6. **FullEnrich** — Email & Phone Enrichment
- **Status**: ✅ Configured
- **API Key**: `FULLENRICH_API_KEY`
- **Base URL**: `https://api.fullenrich.com/v2`
- **Main Endpoints**:
  - `POST /enrich` — Find emails & phone numbers (async)
  - `POST /reverse-email-lookup` — Identify person from email (async)
  - `GET /search` — Synchronous search
- **Use Case**: Find verified business emails and phone numbers
- **Auth**: Bearer token
- **Input Requirements**: Name + Company OR LinkedIn URL
- **Response Time**: 30-90 seconds (async via webhooks)
- **Output**: Email, phone, confidence score

---

### 7. **Unipile** — Multi-Channel Messaging & LinkedIn
- **Status**: ✅ Configured
- **API Key**: `UNIPILE_API_KEY`
- **Base URL**: `https://api13.unipile.com:14355/api/v1`
- **Main Endpoints**:
  - `GET /accounts` — List connected accounts
  - `POST /linkedin/connections` — Send connection requests
  - `POST /linkedin/messages` — Send DMs
  - `GET /linkedin/profile` — Get profile data
  - `GET /email/messages` — Get email messages
- **Use Case**: LinkedIn outreach, messaging, profile scraping
- **Auth**: Bearer token in `X-API-KEY` header
- **Supports**: LinkedIn, WhatsApp, Email, Instagram, Telegram
- **LLM Format**: Available at `/llms.txt` (OpenAPI)

---

### 8. **Unipile LinkedIn Scraping** — LinkedIn Profile Data
- **Status**: ✅ Configured (via Unipile)
- **Endpoint**: `GET /linkedin/profile`
- **Input**: LinkedIn URL
- **Output**:
  - Name, headline, current title
  - Company, location
  - Recent posts and activity
  - Connections count
  - Career history
  - Skills
- **Use Case**: Get detailed LinkedIn profile data for personalization

---

### 9. **ColdIQ** — Unified GTM API (39 Providers)
- **Status**: ✅ Configured
- **API Key**: `COLDIQ_API_KEY`
- **Base URL**: `https://api.coldiq.com/v1`
- **Unified Access To**:
  - Apollo, PDL, Exa, FullEnrich, Findymail
  - Wiza, Signalbase, Prospeo, and 31 others
- **Main Endpoints**:
  - `POST /chat` — Natural language orchestration
  - Individual provider endpoints via unified gateway
- **Use Case**: One API for 39 different data sources
- **Auth**: Bearer token
- **700+ total endpoints** across all providers

---

### 10. **Anthropic Claude API** — AI Orchestration & Copywriting
- **Status**: ✅ Configured
- **API Key**: `ANTHROPIC_API_KEY`
- **Model**: `claude-opus-4-8`
- **Base URL**: `https://api.anthropic.com/v1`
- **Main Endpoints**:
  - `POST /messages` — Chat/completion
  - `POST /batches` — Batch processing
- **Use Case**:
  - Plan which providers to use (orchestration)
  - Rank prospects by seniority
  - Generate personalized outreach copy
  - Create email subjects, LinkedIn messages, call scripts
- **Auth**: Bearer token
- **Max Tokens**: 4096 per request

---

## Complete Workflow API Flow

```
User Query
    ↓
POST /api/orchestrate
    ↓
Step 1: LinkUp search → Find companies
Step 2: Crustdata → Enrich company data
Step 3: Prospeo → Find people + emails/phone
Step 4: Claude (Ranking) → Rank by seniority
Step 5: Apify → Scrape LinkedIn profiles
Step 6: Claude (Copywriting) → Generate outreach
    ↓
Response with all data + templates
```

---

## API Configuration Summary

| API | Configured | Env Variable | Primary Use |
|-----|-----------|-------------|------------|
| LinkUp | ✅ | `LINKUP_API_KEY` | Web search |
| Crustdata | ✅ | `CRUSTDATA_API_KEY` | Company data |
| Prospeo | ✅ | `PROSPEO_API_KEY` | Find people |
| Apify | ✅ | `APIFY_API_KEY` | Web scraping |
| Firecrawl | ✅ | `FIRECRAWL_API_KEY` | Research |
| FullEnrich | ✅ | `FULLENRICH_API_KEY` | Email/phone |
| Unipile | ✅ | `UNIPILE_API_KEY` | LinkedIn/messaging |
| ColdIQ | ✅ | `COLDIQ_API_KEY` | Unified gateway |
| Anthropic | ✅ | `ANTHROPIC_API_KEY` | Orchestration |
| Clay | ❌ | N/A | (Not configured) |

---

## API Providers in YALC Codebase

### Built-in Providers (src/lib/providers/builtin/)

```
✅ LinkupProvider (linkup-provider.ts)
✅ CrustdataProvider (crustdata-provider.ts)
✅ ProspeoProvider (prospeo-provider.ts)
✅ ApifyProvider (apify-provider.ts)
✅ FirecrawlProvider (firecrawl-provider.ts)
✅ FullEnrichProvider (fullenrich-provider.ts)
✅ UnipileProvider (unipile-provider.ts)
✅ ColdIQProvider (coldiq-provider.ts)
✅ ResearchProvider (research-provider.ts)
✅ NotionProvider (notion-provider.ts)
✅ InstantlyProvider (instantly-provider.ts)
```

### Services (src/lib/services/)

```
✅ linkup.ts - LinkUp API client
✅ crustdata.ts - Crustdata API client
✅ prospeo.ts - Prospeo API client
✅ apify.ts - Apify API client
✅ firecrawl.ts - Firecrawl API client
✅ fullenrich.ts - FullEnrich API client
✅ unipile.ts - Unipile API client
✅ coldiq.ts - ColdIQ API client
```

---

## Example API Calls

### Find Companies (LinkUp + Crustdata)
```bash
# LinkUp
GET https://api.linkup.so/search?q=SaaS+NYC+funding

# Crustdata
POST https://api.crustdata.com/v2/companies/search
{
  "filters": {
    "location": "New York",
    "industry": "SaaS",
    "employee_count": [50, 200]
  }
}
```

### Find People (Prospeo)
```bash
GET https://api.prospeo.io/v2/people/search
?company=Acme+Corp
&domain=acme.com
&limit=50
```

### Scrape LinkedIn (Apify)
```bash
POST https://api.apify.com/v2/actors/linkedin-profile-scraper/run-sync
{
  "input": {
    "profiles": ["linkedin.com/in/johnsmith"]
  }
}
```

### Generate Outreach (Claude)
```bash
POST https://api.anthropic.com/v1/messages
{
  "model": "claude-opus-4-8",
  "messages": [{
    "role": "user",
    "content": "Generate cold email for John Smith at Acme Corp..."
  }]
}
```

---

## Rate Limits & Credits

| API | Rate Limit | Credit Model |
|-----|-----------|--------------|
| LinkUp | 100 req/min | Pay-per-request |
| Crustdata | 1000 req/day | 1 credit/result |
| Prospeo | 50 req/min | ~1 credit/search |
| Apify | Depends on actor | Credits/run |
| Firecrawl | 50 req/day | Credits/request |
| FullEnrich | 100 req/day | 0.5 credits/result |
| Unipile | 100 req/min | 1 credit/request |
| ColdIQ | 100 req/min | Unified credits |
| Anthropic | 100k tokens/min | Token-based |

---

## How to Use in Orchestration

The `/api/orchestrate` endpoint chains these APIs automatically:

```bash
curl -X POST http://localhost:3847/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find 5 SaaS companies in NYC and create outreach",
    "generateOutreach": true
  }'
```

Response includes:
- ✅ Companies (from LinkUp + Crustdata)
- ✅ People (from Prospeo)
- ✅ Ranking scores (from Claude)
- ✅ LinkedIn data (from Apify)
- ✅ Outreach templates (from Claude)

---

## Environment File (.env.local)

```bash
ANTHROPIC_API_KEY=sk-ant-...
LINKUP_API_KEY=...
CRUSTDATA_API_KEY=...
PROSPEO_API_KEY=pk_...
APIFY_API_KEY=apify_api_...
FIRECRAWL_API_KEY=fc-...
FULLENRICH_API_KEY=...
UNIPILE_API_KEY=xAlcrm2u...
COLDIQ_API_KEY=ciq_live_...
```

---

## Next Steps

1. **Test in Chat**: http://localhost:3847/chat
2. **Try a query**: "Find 5 SaaS companies in NYC and create outreach"
3. **Monitor API calls** in console for execution flow
4. **Check response** for companies, people, rankings, and templates

All APIs are live and integrated! 🚀
