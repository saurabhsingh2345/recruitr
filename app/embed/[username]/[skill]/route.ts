import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; skill: string }> }
) {
  const { username, skill: rawSkill } = await params
  const skill = decodeURIComponent(rawSkill)

  let score = 0
  let label = 'Unverified'
  let found = false

  try {
    await connectDB()
    const user = await User.findOne({ username }).lean() as { _id: unknown } | null
    if (user) {
      const profile = await Profile.findOne({ userId: user._id, isPublic: true })
        .select('parsedSkills')
        .lean() as { parsedSkills: { name: string; proofScore: number }[] } | null
      const sk = profile?.parsedSkills?.find(
        (s) => s.name.toLowerCase() === skill.toLowerCase()
      )
      if (sk) {
        score = Math.round(sk.proofScore)
        label = getScoreLabel(score)
        found = true
      }
    }
  } catch {
    // return fallback
  }

  const color = found ? getScoreColor(score) : '#888FC0'
  const origin = process.env.NEXTAUTH_URL || 'https://intervue.in'
  const proofUrl = `${origin}/proof/${encodeURIComponent(username)}/${encodeURIComponent(skill)}`

  const r = 26
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=320">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{color-scheme:dark}
  body{
    background:#05060F;
    font-family:system-ui,-apple-system,sans-serif;
    height:80px;overflow:hidden;
  }
  a{
    display:flex;align-items:center;gap:12px;
    padding:12px 16px;height:80px;
    text-decoration:none;
    border:1.5px solid ${color}30;
    border-radius:12px;
    background:#05060F;
    color:#F8F9FA;
    transition:border-color .2s;
  }
  a:hover{border-color:${color}60}
  .ring{flex-shrink:0;position:relative;width:52px;height:52px}
  .ring svg{transform:rotate(-90deg)}
  .score{
    position:absolute;inset:0;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    line-height:1;
  }
  .num{font-size:16px;font-weight:800;color:${color};font-variant-numeric:tabular-nums}
  .denom{font-size:9px;color:${color};opacity:.6}
  .info{flex:1;min-width:0}
  .skill-name{font-size:14px;font-weight:700;color:#F8F9FA;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .meta{display:flex;align-items:center;gap:6px;margin-top:3px}
  .badge{font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;
    background:${color}18;color:${color};border:1px solid ${color}35}
  .verified{font-size:10px;color:rgba(255,255,255,.25)}
  @media(prefers-color-scheme:light){
    body,a{background:#fff;color:#111}
    a{border-color:${color}40}
    .skill-name{color:#111}
    .verified{color:rgba(0,0,0,.3)}
  }
</style>
</head>
<body>
<a href="${proofUrl}" target="_blank" rel="noopener">
  <div class="ring">
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="5"/>
      <circle cx="26" cy="26" r="${r}" fill="none" stroke="${color}" stroke-width="5"
        stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>
    </svg>
    <div class="score">
      <span class="num">${score}</span>
      <span class="denom">/100</span>
    </div>
  </div>
  <div class="info">
    <div class="skill-name">${skill}</div>
    <div class="meta">
      <span class="badge">${label}</span>
      <span class="verified">Verified · intervue.in</span>
    </div>
  </div>
</a>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
  })
}
