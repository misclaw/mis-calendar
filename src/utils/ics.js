import { addDays } from './date.js';

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function toIcsDate(dateString) {
  return dateString.replaceAll('-', '');
}

function toIcsDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('');
}

function foldLine(line) {
  const limit = 74;
  if (line.length <= limit) return line;

  const chunks = [];
  let remaining = line;
  while (remaining.length > limit) {
    chunks.push(remaining.slice(0, limit));
    remaining = ` ${remaining.slice(limit)}`;
  }
  chunks.push(remaining);
  return chunks.join('\r\n');
}

function buildDescription(event) {
  return [
    `${event.acronym} - ${event.conferenceName}`,
    event.theme ? `Theme: ${event.theme}` : '',
    event.timeLabel ? `Time: ${event.timeLabel}` : '',
    event.note || '',
    `Source: ${event.sourceLabel}`,
    event.sourceUrl,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildIcsEvent(event) {
  const uid = `${event.id}@mis-scholar-calendar`;
  const summary = `${event.acronym}: ${event.title}`;
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${toIcsDateTime(new Date().toISOString())}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(buildDescription(event))}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `URL:${escapeIcsText(event.website)}`,
    `CATEGORIES:${escapeIcsText(`MIS,${event.acronym},${event.kind}`)}`,
  ];

  if (event.startDateTime) {
    const start = new Date(event.startDateTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    lines.push(`DTSTART:${toIcsDateTime(start.toISOString())}`);
    lines.push(`DTEND:${toIcsDateTime(end.toISOString())}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.date)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(addDays(event.endDate || event.date, 1))}`);
  }

  lines.push('END:VEVENT');
  return lines.map(foldLine).join('\r\n');
}

export function buildIcs(events) {
  const calendarLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MIS Scholar Calendar//2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MIS Scholar Calendar 2026',
    ...events.map(buildIcsEvent),
    'END:VCALENDAR',
  ];

  return `${calendarLines.join('\r\n')}\r\n`;
}

export function downloadTextFile(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildCsv(events) {
  const headers = [
    'conference',
    'event',
    'kind',
    'start_date',
    'end_date',
    'time',
    'location',
    'website',
    'source',
  ];

  const escapeCsv = (value) => `"${String(value || '').replaceAll('"', '""')}"`;
  const rows = events.map((event) =>
    [
      event.acronym,
      event.title,
      event.kind,
      event.date,
      event.endDate || event.date,
      event.timeLabel || '',
      event.location,
      event.website,
      event.sourceUrl,
    ].map(escapeCsv),
  );

  return [headers.map(escapeCsv), ...rows].map((row) => row.join(',')).join('\n');
}
