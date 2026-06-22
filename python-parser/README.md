# Intervue Parser Service

FastAPI microservice that does the heavy parsing the Node app can't: PDF résumés,
deep GitHub analysis, and **LinkedIn scraping** (via `joeyism/linkedin_scraper`).

The Next.js app calls this over HTTP using `PARSER_SERVICE_URL` + `X-Secret: PARSER_SERVICE_SECRET`.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET  /health` | liveness |
| `POST /parse/resume` | PDF → skills (spaCy) |
| `POST /parse/github` | username → repos/languages |
| `POST /parse/linkedin` | profile URL → roles, education, skill signals |

## Setup

```bash
cd python-parser
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
playwright install chromium          # required for LinkedIn scraping
```

### Run

```bash
uvicorn main:app --port 8001 --reload
```

Then set in the Next app's `.env.local`:

```bash
PARSER_SERVICE_URL=http://localhost:8001
PARSER_SERVICE_SECRET=<shared secret, optional>
```

## LinkedIn scraping — auth

LinkedIn requires an authenticated session. We use a server-side `li_at` cookie.

1. Log into LinkedIn in a normal browser.
2. DevTools → Application → Cookies → `https://www.linkedin.com` → copy the **`li_at`** value.
3. Set it on the parser service environment:

```bash
export LINKEDIN_LI_AT="<li_at cookie value>"
```

(Or run `python samples/create_session.py` inside the cloned `linkedin_scraper` repo
to log in once and generate a session file.)

### Notes & limits
- LinkedIn actively rate-limits and blocks scrapers. Use a dedicated account, keep
  volume low, and expect occasional failures (surfaced cleanly to the user).
- The cookie expires periodically — refresh `LINKEDIN_LI_AT` when scrapes start failing.
- A scrape takes ~10–40s; the Node sync route allows up to 45s per LinkedIn call.
- If `LINKEDIN_LI_AT` or `PARSER_SERVICE_URL` is unset, LinkedIn connect fails gracefully
  with a clear message; all other sources (DEV.to, Stack Overflow, HN) still work.
