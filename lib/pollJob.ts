/**
 * Client helper: poll a background job until it completes.
 * Used after an API returns { queued: true, jobId } so the UI can wait for the
 * worker (e.g. a slow LinkedIn scrape) without blocking the original request.
 */
export async function pollJob<T = unknown>(
  jobId: string,
  { intervalMs = 2000, timeoutMs = 180000 }: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<T> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.state === 'completed') return data.result as T
        if (data.state === 'failed') throw new Error(data.failedReason || 'Job failed')
      }
    } catch {
      // transient — keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error('Timed out waiting for the job to finish')
}
