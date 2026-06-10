const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

export function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateString, days) {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(event) {
  const start = parseDate(event.date);
  if (!event.endDate || event.endDate === event.date) {
    return dateFormatter.format(start);
  }

  const end = parseDate(event.endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = sameYear ? compactDateFormatter.format(start) : dateFormatter.format(start);
  return `${startLabel} - ${dateFormatter.format(end)}`;
}

export function formatDayNumber(dateString) {
  return String(parseDate(dateString).getDate());
}

export function monthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      dateString: toDateString(date),
      inMonth: date.getMonth() === monthIndex,
      isToday: toDateString(date) === toDateString(new Date()),
    };
  });
}

export function eventSpansDate(event, dateString) {
  const end = event.endDate || event.date;
  return event.date <= dateString && dateString <= end;
}

export function isPastEvent(event) {
  return parseDate(event.endDate || event.date) < stripTime(new Date());
}

export function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
