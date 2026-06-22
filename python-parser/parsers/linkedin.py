"""
LinkedIn parser — HTTP-only via LinkedIn's internal Voyager API.

No browser required. The li_at session cookie is sufficient to call LinkedIn's
internal JSON API (the same one the web app uses). This avoids all bot-detection
issues that cause ERR_TOO_MANY_REDIRECTS in automated browsers.

Steps:
  1. Hit /voyager/api/me to resolve JSESSIONID (needed as csrf-token)
  2. Query /voyager/api/identity/profiles/{username}/profileView for full profile
"""

import os
import re
from typing import Any

import requests as _req

try:
    from parsers.resume import TECH_SKILLS
except Exception:
    TECH_SKILLS = [
        "Python", "JavaScript", "TypeScript", "Go", "Java", "Rust", "C++",
        "React", "Node.js", "Kubernetes", "AWS", "GCP", "PostgreSQL", "Kafka",
        "System Design", "Distributed Systems", "Microservices", "Machine Learning",
    ]

_BASE = "https://www.linkedin.com"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/vnd.linkedin.normalized+json+2.1",
    "Accept-Language": "en-US,en;q=0.9",
    "x-restli-protocol-version": "2.0.0",
    "x-li-lang": "en_US",
    "x-li-track": '{"clientVersion":"1.13.14174","mpVersion":"1.13.14174","osName":"web","timezoneOffset":5.5,"timezone":"Asia/Calcutta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":1,"displayWidth":1440,"displayHeight":900}',
}


def _extract_skill_signals(text: str) -> list[dict[str, Any]]:
    if not text:
        return []
    lowered = text.lower()
    signals = []
    for skill in TECH_SKILLS:
        if skill.lower() in lowered:
            signals.append({
                "name": "Go" if skill == "Golang" else skill,
                "evidenceLine": "Listed on LinkedIn profile",
                "weight": 52,
            })
    seen: set[str] = set()
    deduped = []
    for s in signals:
        if s["name"] not in seen:
            seen.add(s["name"])
            deduped.append(s)
    return deduped


def _username_from_url(url: str) -> str:
    m = re.search(r"linkedin\.com/in/([^/?#]+)", url)
    return m.group(1).rstrip("/") if m else ""


def _scrape_voyager(username: str, li_at: str) -> dict[str, Any]:
    session = _req.Session()
    session.headers.update(_HEADERS)
    session.cookies.set("li_at", li_at, domain=".linkedin.com", path="/")
    session.cookies.set("JSESSIONID", '"ajax:0"', domain=".linkedin.com", path="/")
    session.headers["csrf-token"] = "ajax:0"

    # Step 1: resolve real JSESSIONID — disable redirects so a login redirect
    # surfaces as a 302 rather than an infinite loop
    try:
        me_resp = session.get(f"{_BASE}/voyager/api/me", timeout=15, allow_redirects=False)
        if me_resp.status_code in (301, 302, 303, 307, 308):
            return {
                "ok": False,
                "error": (
                    "li_at cookie is expired or invalid — LinkedIn redirected the API request. "
                    "Open linkedin.com in your browser, copy a fresh li_at cookie from "
                    "DevTools → Application → Cookies, and update LINKEDIN_LI_AT in python-parser/.env"
                ),
            }
        raw = session.cookies.get("JSESSIONID", '"ajax:0"')
        jsid = raw.strip('"')
        session.cookies.set("JSESSIONID", raw, domain=".linkedin.com", path="/")
        session.headers["csrf-token"] = jsid
    except Exception:
        pass  # proceed with ajax:0 fallback

    # Step 2: fetch full profile via the current dash API
    # Try multiple endpoints since LinkedIn periodically deprecates them
    endpoints = [
        f"{_BASE}/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity={username}"
        f"&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93",
        f"{_BASE}/voyager/api/identity/profiles/{username}",
    ]

    profile_resp = None
    for endpoint in endpoints:
        r = session.get(endpoint, timeout=20, allow_redirects=False)
        if r.status_code in (301, 302, 303, 307, 308):
            return {"ok": False, "error": "li_at cookie is expired or invalid — please refresh it from DevTools"}
        if r.status_code in (200, 404):
            profile_resp = r
            break
        # 410 Gone / 400 / etc — try next endpoint

    if profile_resp is None:
        return {"ok": False, "error": "All LinkedIn API endpoints returned errors — cookie may be rate-limited or invalid"}

    if profile_resp.status_code == 401:
        return {"ok": False, "error": "li_at cookie is invalid or expired — please refresh it"}
    if profile_resp.status_code == 403:
        return {"ok": False, "error": "LinkedIn returned 403 — cookie may be rate-limited"}
    if profile_resp.status_code == 404:
        return {"ok": False, "error": f"Profile '{username}' not found or is private"}
    if not profile_resp.ok:
        return {"ok": False, "error": f"LinkedIn API returned {profile_resp.status_code}"}

    try:
        data = profile_resp.json()
    except Exception:
        return {"ok": False, "error": "LinkedIn returned non-JSON — possible bot detection"}

    # The dash API wraps results in "elements", the old API used "included"
    included = data.get("included", []) or []
    elements = data.get("elements", [])
    if elements:
        included = included + elements

    # ── Extract profile fields from the normalized JSON ───────────
    name = ""
    location = ""
    about = ""
    experiences: list[dict[str, str]] = []
    educations: list[dict[str, str]] = []

    for item in included:
        t = item.get("$type", "")

        # Profile summary (dash API uses firstName/lastName at top level)
        if not name and item.get("firstName") and ("Profile" in t or "MiniProfile" in t):
            name = f"{item.get('firstName', '')} {item.get('lastName', '')}".strip()
        if not location and item.get("locationName"):
            location = item["locationName"]
        if not location and item.get("geoLocationName"):
            location = item["geoLocationName"]
        if not about and item.get("summary"):
            about = item["summary"][:500]
        if not about and item.get("description"):
            about = item["description"][:500]

        # Positions (experience)
        if "Position" in t or "WorkExperience" in t:
            title = item.get("title", "") or item.get("positionTitle", "")
            company = ""
            for key in ("company", "companyName", "organizationName"):
                val = item.get(key)
                if isinstance(val, str) and val:
                    company = val
                    break
                elif isinstance(val, dict):
                    company = val.get("name", "")
                    if company:
                        break
            date_range = item.get("dateRange", {}) or {}
            start = date_range.get("start", {}) or {}
            end = date_range.get("end", {})
            duration = ""
            if start.get("year"):
                duration = f"{start['year']}–{end.get('year', 'present') if end else 'present'}"
            if title or company:
                experiences.append({"title": title, "company": company, "duration": duration})

        # Education
        if "Education" in t:
            institution = item.get("schoolName", "") or item.get("institutionName", "")
            degree = " ".join(filter(None, [item.get("degreeName", ""), item.get("fieldOfStudy", "")]))
            if institution:
                educations.append({"institution": institution, "degree": degree})

    # Fallback for dash API top-level element
    if not name and elements:
        el = elements[0] if elements else {}
        first = el.get("firstName", {})
        last = el.get("lastName", {})
        if isinstance(first, dict):
            first = first.get("text", "")
        if isinstance(last, dict):
            last = last.get("text", "")
        name = f"{first} {last}".strip()
        if not location:
            loc = el.get("geoLocation", {}) or {}
            location = loc.get("geo", {}).get("defaultLocalizedName", "") if isinstance(loc, dict) else ""
        if not about:
            summary = el.get("summary", {}) or {}
            about = (summary.get("text", "") if isinstance(summary, dict) else str(summary))[:500]

    if not name:
        return {"ok": False, "error": "Could not parse profile data — LinkedIn may have changed its API response format"}

    corpus_parts = [about]
    for exp in experiences:
        corpus_parts.extend([exp.get("title", ""), exp.get("company", "")])
    corpus = "\n".join(p for p in corpus_parts if p)

    signals = _extract_skill_signals(corpus)
    if experiences:
        first = experiences[0]
        role_line = f"{first.get('title', 'Engineer')} at {first.get('company', 'a company')}"
        signals.append({
            "name": "Professional Experience",
            "evidenceLine": f"LinkedIn: {role_line} · {len(experiences)} role(s)",
            "weight": min(85, 45 + len(experiences) * 6),
        })

    summary = f"{len(experiences)} roles" if experiences else "Profile parsed"
    if educations:
        summary += f" · {len(educations)} education"

    return {
        "ok": True,
        "summary": summary,
        "signals": signals,
        "profile": {
            "name": name,
            "location": location,
            "about": about,
            "experiences": experiences[:8],
            "educations": educations[:5],
        },
    }


async def parse_linkedin(profile_url: str) -> dict[str, Any]:
    li_at = os.getenv("LINKEDIN_LI_AT", "").strip()
    if not li_at:
        return {"ok": False, "summary": "", "signals": [],
                "error": "LINKEDIN_LI_AT not configured"}

    if "linkedin.com/in/" not in profile_url:
        return {"ok": False, "summary": "", "signals": [],
                "error": "Provide a full LinkedIn profile URL (…/in/username)"}

    username = _username_from_url(profile_url)
    if not username:
        return {"ok": False, "summary": "", "signals": [],
                "error": "Could not extract username from URL"}

    result = _scrape_voyager(username, li_at)
    if not result.get("ok"):
        return {"summary": "", "signals": "", **result}

    return result
