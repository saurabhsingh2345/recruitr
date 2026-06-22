const GITHUB_API = 'https://api.github.com'

interface GitHubRepo {
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  fork: boolean
  html_url: string
  topics: string[]
  updated_at: string
  size: number
}

export interface ParsedRepo {
  repoName: string
  description: string
  language: string
  stars: number
  githubUrl: string
  techStack: string[]
  complexityScore: number
}

function makeHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Intervue-App/1.0',
  }
  if (process.env.GITHUB_TOKEN) {
    h['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  }
  return h
}

export async function fetchGitHubRepos(username: string): Promise<ParsedRepo[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/users/${username}/repos?sort=updated&per_page=30&type=owner`,
      { headers: makeHeaders(), next: { revalidate: 3600 } }
    )
    if (!res.ok) return []

    const repos: GitHubRepo[] = await res.json()

    return repos
      .filter((r) => !r.fork)
      .slice(0, 12)
      .map((r) => {
        const techStack = [r.language, ...r.topics]
          .filter(Boolean)
          .map((t) => (t as string).toLowerCase())
          .filter((t, i, a) => a.indexOf(t) === i)
          .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
          .slice(0, 5)

        const complexityScore = Math.min(
          100,
          40 + Math.min(30, r.stargazers_count * 2) + Math.min(20, r.size / 100) + (r.topics.length > 2 ? 10 : 0)
        )

        return {
          repoName: r.name,
          description: r.description || '',
          language: r.language || 'Unknown',
          stars: r.stargazers_count,
          githubUrl: r.html_url,
          techStack,
          complexityScore: Math.round(complexityScore),
        }
      })
  } catch {
    return []
  }
}

export function reposToSummary(repos: ParsedRepo[]): string {
  if (repos.length === 0) return 'No public repositories found.'
  return repos
    .map(
      (r) =>
        `- ${r.repoName} (${r.language}${r.stars > 0 ? `, ${r.stars}★` : ''}): ${r.description || 'No description'}`
    )
    .join('\n')
}

export function extractTopLanguages(repos: ParsedRepo[]): string[] {
  const freq: Record<string, number> = {}
  for (const r of repos) {
    if (r.language && r.language !== 'Unknown') {
      freq[r.language] = (freq[r.language] || 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang)
}
