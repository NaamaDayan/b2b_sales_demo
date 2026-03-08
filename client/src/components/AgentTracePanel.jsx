import { useRef, useEffect, useState, useCallback } from 'react';

// Icons from client/public/icons — in Vite dev public is at root (/icons/); in build we use base (e.g. /sales-room/icons/)
const ICON_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === false && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL + 'icons/'
    : '/icons/';
const TRACE_SOURCE_ICONS = {
  Salesforce: ICON_BASE + 'salesforce.svg',
  Gong: ICON_BASE + 'gong.svg',
  Drive: ICON_BASE + 'drive.svg',
  Email: ICON_BASE + 'email.svg',
  Slack: ICON_BASE + 'slack.svg',
};

function getTraceSource(entry) {
  if (entry.traceSource) return entry.traceSource;
  if (entry.source === 'slack') return 'Slack';
  return null;
}

function scrollToBottom(el, behavior = 'smooth') {
  if (!el) return;
  const maxScroll = el.scrollHeight - el.clientHeight;
  el.scrollTo({ top: maxScroll, behavior });
}

/** Split text by @mentions and return array of segments (strings and link elements). */
function messageWithMentionLinks(text) {
  if (!text || typeof text !== 'string') return [text || ''];
  const parts = [];
  const re = /@[\w]+/g;
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a key={`${match.index}-${match[0]}`} href="#" className="trace-mention-link" onClick={(e) => e.preventDefault()}>
        {match[0]}
      </a>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}

/** Build message content: optional file link (replace segment with fileName link) + optional trailing action link. */
function renderMessageContent(entry) {
  const { message, fileRef, link } = entry;
  let text = message || '';
  const segments = [];

  if (fileRef && fileRef.segment && fileRef.fileName) {
    const idx = text.indexOf(fileRef.segment);
    if (idx !== -1) {
      const before = text.slice(0, idx);
      const after = text.slice(idx + fileRef.segment.length);
      segments.push(...messageWithMentionLinks(before));
      segments.push(
        <a key="file" href="#" className="trace-file-link" onClick={(e) => e.preventDefault()} title={fileRef.link}>
          {fileRef.fileName}
        </a>
      );
      segments.push(...messageWithMentionLinks(after));
    } else {
      segments.push(...messageWithMentionLinks(text));
    }
  } else {
    segments.push(...messageWithMentionLinks(text));
  }

  return (
    <>
      <span className="trace-message">{segments}</span>
      {link && (
        <a href="#" className="trace-link" onClick={(e) => e.preventDefault()}>
          {link}
        </a>
      )}
    </>
  );
}

export default function AgentTracePanel({ trace, executingTaskIds }) {
  const scrollContainerRef = useRef(null);
  const prevTraceLengthRef = useRef(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpanded = useCallback((entryId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  // When a new action is added, scroll the feed to the bottom so the latest entry is visible.
  useEffect(() => {
    if (trace.length === 0) return;
    const prevLen = prevTraceLengthRef.current;
    const isNewEntry = trace.length > prevLen;
    prevTraceLengthRef.current = trace.length;

    if (!isNewEntry) return;

    const el = scrollContainerRef.current;
    scrollToBottom(el, 'smooth');
    const t = setTimeout(() => scrollToBottom(el, 'smooth'), 50);
    const t2 = setTimeout(() => scrollToBottom(el, 'auto'), 150);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [trace.length]);

  const togglePanel = useCallback(() => setPanelOpen((o) => !o), []);

  // Closed: only a small arrow toggle on the right edge (fixed; no panel in DOM, no layout space).
  if (!panelOpen) {
    return (
      <button
        type="button"
        className="trace-toggle trace-toggle--closed"
        onClick={togglePanel}
        aria-label="Open Demi Reasoning Trace"
        aria-expanded={false}
      >
        <span className="trace-toggle-arrow" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    );
  }

  // Open: full panel with toggle on the left edge (arrow flips to indicate close).
  return (
    <aside className="trace-panel trace-panel--open">
      <button
        type="button"
        className="trace-toggle trace-toggle--open"
        onClick={togglePanel}
        aria-label="Close Demi Reasoning Trace"
        aria-expanded={true}
      >
        <span className="trace-toggle-arrow" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div className="trace-panel-inner">
        <h3 className="trace-panel-title">Demi Reasoning Trace</h3>
        <p className="trace-panel-subtitle">Live activity — thought &amp; action trace</p>
        {trace.length === 0 ? (
          <p className="trace-empty">No active execution. Click Execute on a task to see the agent&apos;s reasoning.</p>
        ) : (
          <div className="trace-feed-wrap" ref={scrollContainerRef}>
            <ul className="trace-list">
              {trace.map((entry) => {
                const sourceKey = getTraceSource(entry);
                const iconSrc = sourceKey && TRACE_SOURCE_ICONS[sourceKey];
                const isExpanded = expandedIds.has(entry.id);
                const hasDetail = entry.detail;
                return (
                  <li
                    key={entry.id}
                    className={`trace-entry trace-entry--${entry.status || 'running'}`}
                    data-task-id={entry.taskId}
                  >
                    <div className="trace-entry-main">
                      <span className="trace-time">{entry.timestamp}</span>
                      <span className="trace-entry-heading">
                        <span className="trace-task-badge" title={entry.taskTitle}>
                          {entry.taskTitle}
                        </span>
                      </span>
                      <div className="trace-body">
                        {iconSrc && (
                          <img
                            src={iconSrc}
                            alt=""
                            className="trace-entry-icon"
                            width={18}
                            height={18}
                            title={sourceKey}
                          />
                        )}
                        <span className="trace-message-wrap">
                          {renderMessageContent(entry)}
                          {entry.status === 'waiting' && <span className="trace-waiting"> …</span>}
                        </span>
                        {hasDetail && (
                          <button
                            type="button"
                            className={`trace-expand-btn ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleExpanded(entry.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {entry.quote && (
                        <blockquote className="trace-quote">
                          {entry.quote}
                        </blockquote>
                      )}
                    </div>
                    {hasDetail && isExpanded && (
                      <div className="trace-detail">
                        {entry.detail}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
