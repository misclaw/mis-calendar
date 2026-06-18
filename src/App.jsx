import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileDown,
  Info,
  MapPin,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { conferenceEvent, eventGroups, flattenEvents } from './data/events.js';
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

// Equirectangular projection → percentage position on the 2:1 world map.
function projectCoordinates({ lat, lng }) {
  return { x: ((lng + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}

function App() {
  const events = useMemo(
    () => flattenEvents().sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
    [],
  );
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('calendar');
  const [activeYear, setActiveYear] = useState(() => new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState(() => new Date().getMonth());
  const [detailGroupId, setDetailGroupId] = useState(null);
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

  // Years the calendar can browse: at least this year through ~10 years out,
  // widened to cover any event already on file. New years need no code change.
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const eventYears = eventGroups.map((group) => group.year).filter(Boolean);
    const min = Math.min(current, ...eventYears);
    const max = Math.max(current + 10, ...eventYears);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!activeGroups.has(event.groupId)) return false;
      return kindFilter === 'all' || event.kind === kindFilter;
    });
  }, [events, activeGroups, kindFilter]);

  const selectedEvents = useMemo(
    () => events.filter((event) => selectedIds.has(event.id)),
    [events, selectedIds],
  );

  const monthEvents = useMemo(() => {
    const monthStart = new Date(activeYear, activeMonth, 1);
    const monthEnd = new Date(activeYear, activeMonth + 1, 0);
    return filteredEvents.filter((event) => {
      const start = parseDate(event.date);
      const end = parseDate(event.endDate || event.date);
      return start <= monthEnd && end >= monthStart;
    });
  }, [activeYear, activeMonth, filteredEvents]);

  const mapGroups = useMemo(
    () => eventGroups.filter((group) => activeGroups.has(group.id)),
    [activeGroups],
  );

  const detailGroup = useMemo(
    () => eventGroups.find((group) => group.id === detailGroupId) || null,
    [detailGroupId],
  );

  useEffect(() => {
    if (!detailGroup) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setDetailGroupId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailGroup]);

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

  function exportIcs() {
    if (selectedEvents.length === 0) return;
    downloadTextFile('mis-scholar-calendar.ics', buildIcs(selectedEvents), 'text/calendar;charset=utf-8');
  }

  function exportCsv() {
    if (selectedEvents.length === 0) return;
    downloadTextFile('mis-scholar-calendar.csv', buildCsv(selectedEvents), 'text/csv;charset=utf-8');
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
          <button className={activeTab === 'map' ? 'active' : ''} onClick={() => setActiveTab('map')}>
            Map
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
            <h1 id="page-title">Conference calendar</h1>
          </div>
        </section>

        <section className="conference-chooser" aria-label="Choose conferences">
          <div className="chip-row" role="group" aria-label="Conference selection">
            {eventGroups.map((group) => (
              <ConferenceChip
                key={group.id}
                group={group}
                checked={activeGroups.has(group.id)}
                past={!group.events.some((event) => !isPastEvent(event))}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
          </div>

          <div className="chooser-controls">
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

            <div className="export-group" aria-label="Export selected dates">
              <span className="export-count">{selectedEvents.length} selected</span>
              <button
                className="export-btn"
                onClick={exportIcs}
                disabled={selectedEvents.length === 0}
                title="Download an .ics calendar of the selected dates"
              >
                <Download size={15} />
                .ics
              </button>
              <button
                className="export-btn"
                onClick={exportCsv}
                disabled={selectedEvents.length === 0}
                title="Download a .csv spreadsheet of the selected dates"
              >
                <FileDown size={15} />
                .csv
              </button>
            </div>
          </div>
        </section>

        {activeTab === 'calendar' && (
          <CalendarView
            activeMonth={activeMonth}
            setActiveMonth={setActiveMonth}
            activeYear={activeYear}
            setActiveYear={setActiveYear}
            years={years}
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
            onOpenDetail={setDetailGroupId}
          />
        )}

        {activeTab === 'map' && <MapView groups={mapGroups} onOpenDetail={setDetailGroupId} />}

        <section className="notice" role="note">
          <AlertTriangle size={18} />
          <span>
            Conference websites change frequently. This calendar is a source-backed starting point, not a guarantee of
            accuracy. Verify details on the official event site before submitting, registering, or traveling.
          </span>
        </section>
      </main>

      {detailGroup && (
        <ConferenceDetail
          group={detailGroup}
          onClose={() => setDetailGroupId(null)}
          selectedIds={selectedIds}
          toggleEvent={toggleEvent}
        />
      )}
    </div>
  );
}

function CalendarView({
  activeMonth,
  setActiveMonth,
  activeYear,
  setActiveYear,
  years,
  filteredEvents,
  monthEvents,
  selectedIds,
  toggleEvent,
}) {
  const days = monthMatrix(activeYear, activeMonth);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const canPrev = activeYear > minYear || activeMonth > 0;
  const canNext = activeYear < maxYear || activeMonth < 11;

  function goPrev() {
    if (!canPrev) return;
    if (activeMonth === 0) {
      setActiveYear(activeYear - 1);
      setActiveMonth(11);
    } else {
      setActiveMonth(activeMonth - 1);
    }
  }

  function goNext() {
    if (!canNext) return;
    if (activeMonth === 11) {
      setActiveYear(activeYear + 1);
      setActiveMonth(0);
    } else {
      setActiveMonth(activeMonth + 1);
    }
  }

  return (
    <section className="calendar-layout">
      <div className="calendar-panel">
        <div className="month-switcher">
          <button className="icon-button" onClick={goPrev} disabled={!canPrev} title="Previous month" aria-label="Previous month">
            <ChevronLeft size={19} />
          </button>
          <div className="switcher-center">
            <label className="year-pick">
              <select value={activeYear} onChange={(event) => setActiveYear(Number(event.target.value))} aria-label="Year">
                {years.map((year) => (
                  <option value={year} key={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <h2>{monthNames[activeMonth]}</h2>
          </div>
          <button className="icon-button" onClick={goNext} disabled={!canNext} title="Next month" aria-label="Next month">
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
        <h2 id="month-agenda-title">
          {monthNames[activeMonth]} {activeYear}
        </h2>
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

function EventsView({ filteredEvents, activeGroups, selectedIds, toggleEvent, onOpenDetail }) {
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
            <div className="heading-actions">
              <button type="button" className="detail-btn" onClick={() => onOpenDetail(group.id)}>
                <Info size={15} />
                Details
              </button>
              <a href={group.website} target="_blank" rel="noreferrer" className="source-link">
                Official site
                <ExternalLink size={15} />
              </a>
            </div>
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

function MapView({ groups, onOpenDetail }) {
  // Co-located venues (e.g. ICIS, WITS, WISE all in Lisbon) share a point;
  // fan their markers around it so each stays clickable.
  const clusters = useMemo(() => {
    const map = new Map();
    groups.forEach((group) => {
      const key = `${group.coordinates.lat.toFixed(1)},${group.coordinates.lng.toFixed(1)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(group.id);
    });
    return map;
  }, [groups]);

  function markerOffset(group) {
    const key = `${group.coordinates.lat.toFixed(1)},${group.coordinates.lng.toFixed(1)}`;
    const members = clusters.get(key) || [group.id];
    if (members.length < 2) return { dx: 0, dy: 0 };
    const index = members.indexOf(group.id);
    const angle = (index / members.length) * Math.PI * 2;
    const radius = 15;
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  }

  return (
    <section className="map-layout">
      <div className="map-panel">
        <div className="world-map" role="img" aria-label="World map of conference host cities">
          <div className="world-map-land" aria-hidden="true" />
          {groups.map((group) => {
            const { x, y } = projectCoordinates(group.coordinates);
            const { dx, dy } = markerOffset(group);
            return (
              <button
                type="button"
                className="map-marker"
                key={group.id}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  '--event-color': group.color,
                  transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                }}
                onClick={() => onOpenDetail(group.id)}
                title={`${group.acronym} — ${group.location}`}
              >
                <span className="map-marker-dot" aria-hidden="true" />
                <span className="map-marker-label">{group.acronym}</span>
              </button>
            );
          })}
        </div>
        <p className="map-hint">Markers show each conference’s host city. Select a pin for details.</p>
      </div>

      <aside className="map-list" aria-label="Conference locations">
        {groups.length === 0 ? (
          <p className="empty-state">No conferences match your filters.</p>
        ) : (
          groups.map((group) => {
            const conf = conferenceEvent(group);
            return (
              <button type="button" className="map-list-item" key={group.id} onClick={() => onOpenDetail(group.id)}>
                <span className="event-chip" style={{ '--event-color': group.color }}>
                  {group.acronym}
                </span>
                <span className="map-list-main">
                  <strong>{group.location}</strong>
                  <small>
                    {conf ? formatDisplayDate(conf) : ''}
                    {conf && isPastEvent(conf) ? ' · past' : ''}
                  </small>
                </span>
                <MapPin size={16} />
              </button>
            );
          })
        )}
      </aside>
    </section>
  );
}

function ConferenceDetail({ group, onClose, selectedIds, toggleEvent }) {
  const conf = conferenceEvent(group);
  const { x, y } = projectCoordinates(group.coordinates);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${group.coordinates.lat},${group.coordinates.lng}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={group.name} onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <div className="modal-title">
            <span className="event-chip" style={{ '--event-color': group.color }}>
              {group.acronym}
            </span>
            <h2>{group.name}</h2>
            {group.theme && <p className="modal-theme">{group.theme}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-facts">
            <div className="fact">
              <MapPin size={15} />
              <span>{group.venue || group.location}</span>
            </div>
            {conf && (
              <div className="fact">
                <CalendarDays size={15} />
                <span>
                  {formatDisplayDate(conf)}
                  {isPastEvent(conf) ? ' · past' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="detail-map" aria-hidden="true">
            <div className="world-map-land" />
            <span
              className="map-marker static"
              style={{ left: `${x}%`, top: `${y}%`, '--event-color': group.color }}
            >
              <span className="map-marker-dot" />
            </span>
          </div>
          <div className="detail-map-links">
            <a className="source-link" href={mapsUrl} target="_blank" rel="noreferrer">
              View venue on map
              <ExternalLink size={14} />
            </a>
            <a className="source-link" href={group.website} target="_blank" rel="noreferrer">
              Official site
              <ExternalLink size={14} />
            </a>
          </div>

          {group.description && <p className="modal-section-copy">{group.description}</p>}

          {group.topics?.length > 0 && (
            <section className="modal-section">
              <h3>Topics</h3>
              <div className="topic-row">
                {group.topics.map((topic) => (
                  <span className="topic-chip" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          {group.committee?.length > 0 && (
            <section className="modal-section">
              <h3>Organizing committee</h3>
              <ul className="committee-list">
                {group.committee.map((member) => (
                  <li key={member.name}>
                    <strong>{member.name}</strong>
                    <span>
                      {member.role}
                      {member.affiliation ? ` · ${member.affiliation}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {group.callForPapers && (
            <section className="modal-section">
              <h3>Call for papers</h3>
              {group.callForPapers.summary && (
                <p className="modal-section-copy">{group.callForPapers.summary}</p>
              )}
              {group.callForPapers.url && (
                <a className="source-link" href={group.callForPapers.url} target="_blank" rel="noreferrer">
                  Call for papers
                  <ExternalLink size={14} />
                </a>
              )}
            </section>
          )}

          <section className="modal-section">
            <h3>Key dates</h3>
            <div className="event-list">
              {group.events.map((event) => {
                const id = `${group.id}:${event.id}`;
                const flat = {
                  ...event,
                  id,
                  acronym: group.acronym,
                  color: group.color,
                  conferenceName: group.name,
                };
                return (
                  <EventRow
                    event={flat}
                    checked={selectedIds.has(id)}
                    onChange={() => toggleEvent(id)}
                    key={id}
                  />
                );
              })}
            </div>
          </section>

          <div className="source-note">
            Source checked {group.sourceChecked}:{' '}
            <a href={group.sourceUrl} target="_blank" rel="noreferrer">
              {group.sourceLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConferenceChip({ group, checked, past, onToggle }) {
  return (
    <button
      type="button"
      className={`conf-chip ${checked ? 'checked' : ''} ${past ? 'past' : ''}`}
      style={{ '--event-color': group.color }}
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      title={past ? `${group.name} — all dates have passed` : group.name}
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
