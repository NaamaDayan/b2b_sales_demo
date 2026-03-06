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

export default function AgentTracePanel({ trace, executingTaskIds }) {
  return (
    <aside className="trace-panel">
      <h3 className="trace-panel-title">Demi Reasoning Trace</h3>
      <p className="trace-panel-subtitle">Thought &amp; Action Trace — Demi</p>
      {trace.length === 0 ? (
        <p className="trace-empty">No active execution. Click Execute on a task to see the agent&apos;s reasoning.</p>
      ) : (
        <ul className="trace-list">
          {trace.map((entry) => {
            const sourceKey = getTraceSource(entry);
            const iconSrc = sourceKey && TRACE_SOURCE_ICONS[sourceKey];
            return (
              <li
                key={entry.id}
                className={`trace-entry trace-entry--${entry.status || 'running'}`}
                data-task-id={entry.taskId}
              >
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
                    <span className="trace-message">{entry.message}</span>
                    {entry.link && (
                      <a href="#" className="trace-link" onClick={(e) => e.preventDefault()}>
                        {entry.link}
                      </a>
                    )}
                    {entry.status === 'waiting' && <span className="trace-waiting"> …</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
