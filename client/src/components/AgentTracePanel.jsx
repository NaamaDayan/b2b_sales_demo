export default function AgentTracePanel({ trace, executingTaskIds }) {
  return (
    <aside className="trace-panel">
      <h3 className="trace-panel-title">Agent Reasoning Trace</h3>
      <p className="trace-panel-subtitle">Thought &amp; Action Trace — Jessica</p>
      {trace.length === 0 ? (
        <p className="trace-empty">No active execution. Click Execute on a task to see the agent&apos;s reasoning.</p>
      ) : (
        <ul className="trace-list">
          {trace.map((entry) => (
            <li
              key={entry.id}
              className={`trace-entry trace-entry--${entry.status || 'running'}`}
              data-task-id={entry.taskId}
            >
              <span className="trace-time">{entry.timestamp}</span>
              <span className="trace-entry-heading">
                <span className="trace-task-badge" title={entry.taskTitle}>
                  {entry.taskTitle.length > 28 ? entry.taskTitle.slice(0, 25) + '…' : entry.taskTitle}
                </span>
              </span>
              <span className="trace-message">{entry.message}</span>
              {entry.status === 'waiting' && <span className="trace-waiting"> …</span>}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
