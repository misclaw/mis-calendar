import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileDown,
  Mail,
  Moon,
  Search,
  Send,
  Sun,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { eventGroups, flattenEvents } from './data/events.js';
import {
  eventSpansDate,
  formatDayNumber,
  formatDisplayDate,
  isPastEvent,
  monthMatrix,
  parseDate,
} from './utils/date.js';
import { buildCsv, buildIcs, downloadTextFile } from './utils/ics.js';

const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2026, month, 1)),
);

const kindLabels = {
  conference: 'Conference',
  deadline: 'Deadline',
  notification: 'Notification',
  opening: 'Opening',
  registration: 'Registration',
  workshop: 'Workshop',
  consortium: 'Consortium',
  symposium: 'Symposium',
  poster: 'Poster',
};

const todayString = new Date().toISOString().slice(0, 10);

function App() {
  const events = useMemo(
    () => flattenEvents().sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
    [],
  );
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('calendar');
  const [activeMonth, setActiveMonth] = useState(5);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(() => new Set(events.map((event) => event.id)));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesKind = kindFilter === 'all' || event.kind === kindFilter;
      const haystack = `${event.acronym} ${event.conferenceName} ${event.title} ${event.location} ${event.theme}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesKind && matchesQuery;
    });
  }, [events, kindFilter, query]);

  const selectedEvents = useMemo(
    () => events.filter((event) => selectedIds.has(event.id)),
    [events, selectedIds],
  );

  const monthEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      const start = parseDate(event.date);
      const end = parseDate(event.endDate || event.date);
      return start.getFullYear() === 2026 && start.getMonth() <= activeMonth && end.getMonth() >= activeMonth;
    });
  }, [activeMonth, filteredEvents]);

  const visibleSelectedCount = filteredEvents.filter((event) => selectedIds.has(event.id)).length;
  const allVisibleSelected = filteredEvents.length > 0 && visibleSelectedCount === filteredEvents.length;
  const upcomingCount = events.filter((event) => !isPastEvent(event)).length;

  function toggleEvent(eventId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  function setVisibleSelection(checked) {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredEvents.forEach((event) => {
        if (checked) {
          next.add(event.id);
        } else {
          next.delete(event.id);
        }
      });
      return next;
    });
  }

  function exportIcs() {
    if (selectedEvents.length === 0) return;
    downloadTextFile('mis-scholar-calendar-2026.ics', buildIcs(selectedEvents), 'text/calendar;charset=utf-8');
  }

  function exportCsv() {
    if (selectedEvents.length === 0) return;
    downloadTextFile('mis-scholar-calendar-2026.csv', buildCsv(selectedEvents), 'text/csv;charset=utf-8');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="MIS Scholar Calendar home">
          <span className="brand-mark">
            <CalendarDays size={22} />
          </span>
          <span>
            <strong>MIS Scholar Calendar</strong>
            <small>2026 conference dates and deadlines</small>
          </span>
        </a>

        <nav className="tabs" aria-label="Primary">
          <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>
            Calendar
          </button>
          <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
            Events
          </button>
          <button className={activeTab === 'feedback' ? 'active' : ''} onClick={() => setActiveTab('feedback')}>
            Feedback
          </button>
        </nav>

        <button
          className="icon-button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </header>

      <main id="top">
        <section className="hero-band" aria-labelledby="page-title">
          <img src="/mis-calendar-banner.png" alt="" />
          <div className="hero-overlay">
            <div>
              <p className="eyebrow">MIS research planning</p>
              <h1 id="page-title">2026 conference calendar</h1>
              <p className="hero-copy">
                AIS regional conferences, ICIS, WITS, INFORMS Annual Meeting, and CHITA in one exportable calendar.
              </p>
            </div>
            <div className="hero-metrics" aria-label="Calendar summary">
              <span>
                <strong>{eventGroups.length}</strong>
                conferences
              </span>
              <span>
                <strong>{events.length}</strong>
                dated items
              </span>
              <span>
                <strong>{upcomingCount}</strong>
                upcoming
              </span>
            </div>
          </div>
        </section>

        <section className="notice" role="note">
          <AlertTriangle size={18} />
          <span>
            Conference websites change frequently. This calendar is a source-backed starting point, not a guarantee of
            accuracy. Verify details on the official event site before submitting, registering, or traveling.
          </span>
        </section>

        <section className="controls" aria-label="Calendar controls">
          <label className="search-box">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conferences, dates, cities..."
            />
          </label>

          <label className="select-wrap">
            <span>Type</span>
            <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
              <option value="all">All types</option>
              {Object.entries(kindLabels).map(([kind, label]) => (
                <option value={kind} key={kind}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button className="button ghost" onClick={() => setVisibleSelection(!allVisibleSelected)}>
            <Check size={17} />
            {allVisibleSelected ? 'Clear visible' : 'Select visible'}
          </button>

          <button
            className="button ghost"
            onClick={() => setSelectedIds(new Set(events.map((event) => event.id)))}
          >
            Select all
          </button>

          <button className="button ghost" onClick={() => setSelectedIds(new Set())}>
            Clear all
          </button>

          <button className="button primary" onClick={exportIcs} disabled={selectedEvents.length === 0}>
            <Download size={17} />
            Export ICS
          </button>

          <button className="button secondary" onClick={exportCsv} disabled={selectedEvents.length === 0}>
            <FileDown size={17} />
            CSV
          </button>
        </section>

        <div className="selection-bar">
          <span>{selectedEvents.length} selected for export</span>
          <span>{filteredEvents.length} currently visible</span>
        </div>

        {activeTab === 'calendar' && (
          <CalendarView
            activeMonth={activeMonth}
            setActiveMonth={setActiveMonth}
            filteredEvents={filteredEvents}
            monthEvents={monthEvents}
            selectedIds={selectedIds}
            toggleEvent={toggleEvent}
          />
        )}

        {activeTab === 'events' && (
          <EventsView
            filteredEvents={filteredEvents}
            selectedIds={selectedIds}
            toggleEvent={toggleEvent}
          />
        )}

        {activeTab === 'feedback' && <FeedbackView />}
      </main>
    </div>
  );
}

function CalendarView({ activeMonth, setActiveMonth, filteredEvents, monthEvents, selectedIds, toggleEvent }) {
  const days = monthMatrix(2026, activeMonth);

  return (
    <section className="calendar-layout">
      <div className="calendar-panel">
        <div className="month-switcher">
          <button
            className="icon-button"
            onClick={() => setActiveMonth((month) => Math.max(0, month - 1))}
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft size={19} />
          </button>
          <div>
            <p>2026</p>
            <h2>{monthNames[activeMonth]}</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => setActiveMonth((month) => Math.min(11, month + 1))}
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight size={19} />
          </button>
        </div>

        <div className="month-pills" aria-label="Months">
          {monthNames.map((month, index) => (
            <button
              className={index === activeMonth ? 'active' : ''}
              key={month}
              onClick={() => setActiveMonth(index)}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}

          {days.map((day) => {
            const dayEvents = filteredEvents.filter((event) => eventSpansDate(event, day.dateString));
            return (
              <div
                className={`day-cell ${day.inMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''}`}
                key={day.dateString}
              >
                <span className="day-number">{formatDayNumber(day.dateString)}</span>
                <div className="day-events">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      className={`mini-event ${selectedIds.has(event.id) ? 'selected' : ''}`}
                      style={{ '--event-color': event.color }}
                      key={event.id}
                      onClick={() => toggleEvent(event.id)}
                      title={`${event.acronym}: ${event.title}`}
                    >
                      <span>{event.acronym}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && <small>+{dayEvents.length - 3}</small>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="month-agenda" aria-labelledby="month-agenda-title">
        <h2 id="month-agenda-title">{monthNames[activeMonth]} items</h2>
        <div className="agenda-list">
          {monthEvents.length === 0 ? (
            <p className="empty-state">No matching events in this month.</p>
          ) : (
            monthEvents.map((event) => (
              <EventRow
                event={event}
                checked={selectedIds.has(event.id)}
                onChange={() => toggleEvent(event.id)}
                key={event.id}
              />
            ))
          )}
        </div>
      </aside>
    </section>
  );
}

function EventsView({ filteredEvents, selectedIds, toggleEvent }) {
  const grouped = eventGroups.map((group) => ({
    ...group,
    items: filteredEvents.filter((event) => event.groupId === group.id),
  }));

  return (
    <section className="event-directory">
      {grouped.map((group) => (
        <article className="conference-block" key={group.id}>
          <div className="conference-heading">
            <div>
              <span className="event-chip" style={{ '--event-color': group.color }}>
                {group.acronym}
              </span>
              <h2>{group.name}</h2>
              <p>{group.location}</p>
            </div>
            <a href={group.website} target="_blank" rel="noreferrer" className="source-link">
              Official site
              <ExternalLink size={15} />
            </a>
          </div>

          {group.items.length === 0 ? (
            <p className="empty-state compact">No matching items.</p>
          ) : (
            <div className="event-list">
              {group.items.map((event) => (
                <EventRow
                  event={event}
                  checked={selectedIds.has(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  key={event.id}
                />
              ))}
            </div>
          )}

          <div className="source-note">
            Source checked {group.sourceChecked}:{' '}
            <a href={group.sourceUrl} target="_blank" rel="noreferrer">
              {group.sourceLabel}
            </a>
          </div>
        </article>
      ))}
    </section>
  );
}

function EventRow({ event, checked, onChange }) {
  return (
    <label className={`event-row ${checked ? 'checked' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="checkbox-visual" aria-hidden="true">
        <Check size={14} />
      </span>
      <span className="date-tile">
        <strong>{formatDayNumber(event.date)}</strong>
        <small>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(parseDate(event.date))}</small>
      </span>
      <span className="event-main">
        <span className="event-title">
          <span className="dot" style={{ '--event-color': event.color }} />
          {event.acronym}: {event.title}
        </span>
        <span className="event-meta">
          {formatDisplayDate(event)}
          {event.timeLabel ? ` · ${event.timeLabel}` : ''}
          {isPastEvent(event) ? ' · past' : ''}
        </span>
        {event.note && <span className="event-note">{event.note}</span>}
      </span>
      <span className={`kind-badge ${event.kind}`}>{kindLabels[event.kind] || event.kind}</span>
    </label>
  );
}

function FeedbackView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const subject = encodeURIComponent('MIS Scholar Calendar feedback');
  const body = encodeURIComponent(
    [`Name: ${name}`, `Email: ${email}`, '', message].filter((line) => line !== undefined).join('\n'),
  );
  const mailto = `mailto:misclaw77@outlook.com?subject=${subject}&body=${body}`;

  return (
    <section className="feedback-grid">
      <div className="feedback-panel">
        <div className="section-kicker">
          <Mail size={18} />
          Feedback
        </div>
        <h2>Send a correction or request</h2>
        <form action={mailto} method="post" encType="text/plain">
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
          </label>
          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.edu"
              type="email"
            />
          </label>
          <label>
            Message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add an event, report a changed deadline, or ask a question."
              rows="7"
            />
          </label>
          <a className="button primary mail-button" href={mailto}>
            <Send size={17} />
            Open email
          </a>
        </form>
      </div>

      <aside className="feedback-card">
        <h3>Contact</h3>
        <a href="mailto:misclaw77@outlook.com">misclaw77@outlook.com</a>
        <p>Include the official event URL when reporting a deadline change.</p>
        <div className="today-stamp">Today: {todayString}</div>
      </aside>
    </section>
  );
}

export default App;
