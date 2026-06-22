export function generateICS(opts: {
  title: string
  date: string   // "2024-07-15"
  time: string   // "14:30"
  timezone: string
  meetLink?: string
  description?: string
}): string {
  // Parse into UTC (approximate — subtract IST offset for default)
  const [year, month, day] = opts.date.split('-').map(Number)
  const [hour, min] = opts.time.split(':').map(Number)
  const dt = new Date(Date.UTC(year!, month! - 1, day!, hour!, min!, 0))
  const dtEnd = new Date(dt.getTime() + 60 * 60 * 1000)

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'

  const desc = [opts.description || '', opts.meetLink ? `Meet: ${opts.meetLink}` : '']
    .filter(Boolean)
    .join('\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Intervue//Intervue//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(dtEnd)}`,
    `SUMMARY:${opts.title}`,
    `DESCRIPTION:${desc}`,
    opts.meetLink ? `URL:${opts.meetLink}` : '',
    `UID:${dt.getTime()}@intervue.io`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.filter(Boolean).join('\r\n')
}
