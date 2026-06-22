from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import pathlib
from dotenv import load_dotenv
load_dotenv(pathlib.Path(__file__).parent / '.env', override=True)
from parsers.resume import parse_resume
from parsers.github import parse_github
from parsers.linkedin import parse_linkedin

app = FastAPI(title="Intervue Parser Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PARSER_SECRET = os.getenv("PARSER_SERVICE_SECRET", "")


def verify_secret(x_secret: str = Header(default="")):
    if PARSER_SECRET and x_secret != PARSER_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")


class GithubRequest(BaseModel):
    username: str


class LinkedInRequest(BaseModel):
    profile_url: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse/resume")
async def upload_resume(
    file: UploadFile = File(...),
    x_secret: str = Header(default=""),
):
    verify_secret(x_secret)

    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")

    content = await file.read()
    result = parse_resume(content)
    return result


@app.post("/parse/github")
async def parse_github_profile(
    body: GithubRequest,
    x_secret: str = Header(default=""),
):
    verify_secret(x_secret)

    result = parse_github(body.username)
    return result


@app.post("/parse/linkedin")
async def parse_linkedin_profile(
    body: LinkedInRequest,
    x_secret: str = Header(default=""),
):
    verify_secret(x_secret)

    # Async Playwright scrape — returns SourceResult-shaped dict
    result = await parse_linkedin(body.profile_url)
    return result
