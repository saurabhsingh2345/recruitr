/**
 * Cron: rebuild the Typesense semantic index from all public profiles.
 * Safe no-op when Typesense isn't configured. Run nightly.
 */
import { NextResponse } from 'next/server'
import { reindexAllProfiles } from '@/lib/search-index'
import { typesenseEnabled } from '@/lib/typesense'

export const maxDuration = 120

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!typesenseEnabled) {
    return NextResponse.json({ skipped: true, reason: 'Typesense not configured' })
  }
  const result = await reindexAllProfiles()
  return NextResponse.json({ ok: true, ...result })
}
