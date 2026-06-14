import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileDown,
  Moon,
  Search,
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
  const [activeGroups, setActiveGroups] = useState(
    () => new Set(eventGroups.filter((group) => group.events.some((event) => !isPastEvent(event))).map((group) => group.id)),
  );
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(events.filter((event) => !isPastEvent(event)).map((event) => event.id)),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      if (!activeGroups.has(event.groupId)) return false;
      const matchesKind = kindFilter === 'all' || event.kind === kindFilter;
      const haystack = `${event.acronym} ${event.conferenceName} ${event.title} ${event.location} ${event.theme}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesKind && matchesQuery;
    });
  }, [events, activeGroups, kindFilter, query]);

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

  function toggleGroup(groupId) {
    const groupEvents = events.filter((event) => event.groupId === groupId);
    const isActive = activeGroups.has(groupId);
    setActiveGroups((current) => {
      const next = new Set(current);
      if (isActive) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
    setSelectedIds((current) => {
      const next = new Set(current);
      if (isActive) {
        groupEvents.forEach((event) => next.delete(event.id));
      } else {
        groupEvents.forEach((event) => {
          if (!isPastEvent(event)) next.add(event.id);
        });
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
        <div className="brand-group">
          <a className="mc-home" href="https://misclaw.app" title="misclaw.app — all projects">
            <img
              src={theme === 'dark' ? '/misclaw-dark.png' : '/misclaw.png'}
              alt=""
              width="30"
              height="30"
              className="mc-logo"
            />
            <span className="mc-home-name">
              misclaw<span>.app</span>
            </span>
          </a>
          <span className="mc-sep" aria-hidden="true">
            /
          </span>
          <a className="brand" href="#top" aria-label="MIS Scholar Calendar home">
            <span>
              <strong>MIS Scholar Calendar</strong>
              <small>2026 conference dates and deadlines</small>
            </span>
          </a>
        </div>

        <nav className="tabs" aria-label="Primary">
          <button className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>
            Calendar
          </button>
          <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
            Events
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
        <section className="page-intro" aria-labelledby="page-title">
          <div className="intro-head">
            <p className="eyebrow">MIS research planning</p>
            <h1 id="page-title">2026 conference calendar</h1>
            <p className="intro-copy">
              AIS regional conferences, ICIS, WITS, INFORMS Annual Meeting, and CHITA in one exportable calendar.
            </p>
          </div>
          <div className="intro-metrics" aria-label="Calendar summary">
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
        </section>

        <section className="conference-chooser" aria-label="Choose conferences">
          <div className="chooser-head">
            <span className="chooser-title">Conferences</span>
            <span className="chooser-hint">
              Toggle a conference to include or exclude its dates from your export.
            </span>
          </div>
          <div className="chip-row" role="group" aria-label="Conference selection">
            {eventGroups.map((group) => (
              <ConferenceChip
                key={group.id}
                group={group}
                checked={activeGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
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
            onClick={() =>
              setSelectedIds(new Set(events.filter((event) => activeGroups.has(event.groupId)).map((event) => event.id)))
            }
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
            activeGroups={activeGroups}
            selectedIds={selectedIds}
            toggleEvent={toggleEvent}
          />
        )}
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
                showKind={false}
                key={event.id}
              />
            ))
          )}
        </div>
      </aside>
    </section>
  );
}

function EventsView({ filteredEvents, activeGroups, selectedIds, toggleEvent }) {
  const grouped = eventGroups
    .filter((group) => activeGroups.has(group.id))
    .map((group) => ({
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

function ConferenceChip({ group, checked, onToggle }) {
  return (
    <button
      type="button"
      className={`conf-chip ${checked ? 'checked' : ''}`}
      style={{ '--event-color': group.color }}
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      title={group.name}
    >
      <span className="conf-chip-check" aria-hidden="true">{checked && <Check size={13} />}</span>
      <span className="conf-chip-label">{group.acronym}</span>
    </button>
  );
}

function EventRow({ event, checked, onChange, showKind = true }) {
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
      {showKind && (
        <span className={`kind-badge ${event.kind}`}>{kindLabels[event.kind] || event.kind}</span>
      )}
    </label>
  );
}

export default App;
