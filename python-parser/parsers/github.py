import os
from github import Github, GithubException


def parse_github(username: str) -> dict:
    token = os.getenv("GITHUB_TOKEN")
    g = Github(token) if token else Github()

    try:
        user = g.get_user(username)
        repos = list(user.get_repos(type="owner", sort="updated"))[:20]

        parsed_repos = []
        language_counts: dict[str, int] = {}
        summary_parts = []

        for repo in repos:
            if repo.private:
                continue

            try:
                langs = repo.get_languages()
                for lang, bytes_count in langs.items():
                    language_counts[lang] = language_counts.get(lang, 0) + bytes_count

                readme_summary = ""
                try:
                    readme = repo.get_readme()
                    content = readme.decoded_content.decode("utf-8", errors="ignore")
                    readme_summary = content[:500].strip()
                except Exception:
                    pass

                tech_stack = list(langs.keys())[:5]
                complexity = min(100, len(tech_stack) * 15 + (1 if repo.stargazers_count > 10 else 0) * 10)

                parsed_repos.append({
                    "repoName": repo.name,
                    "description": repo.description or "",
                    "techStack": tech_stack,
                    "complexityScore": complexity,
                    "readmeSummary": readme_summary,
                    "githubUrl": repo.html_url,
                    "stars": repo.stargazers_count,
                    "language": repo.language or "",
                })

                if repo.description:
                    summary_parts.append(f"- {repo.name}: {repo.description[:100]} ({', '.join(tech_stack[:3])})")

            except GithubException:
                continue

        top_languages = sorted(language_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        summary = f"Top repositories:\n" + "\n".join(summary_parts[:10])
        summary += f"\n\nTop languages by code volume: {', '.join([l[0] for l in top_languages])}"

        return {
            "repos": parsed_repos,
            "summary": summary,
            "topLanguages": [l[0] for l in top_languages],
            "totalRepos": len(parsed_repos),
        }

    except GithubException as e:
        return {
            "repos": [],
            "summary": f"Could not fetch GitHub profile for {username}",
            "topLanguages": [],
            "totalRepos": 0,
            "error": str(e),
        }
