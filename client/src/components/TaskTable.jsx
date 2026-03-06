import { useCallback, useState, Fragment } from 'react';
import ValidatorsCell from './ValidatorsCell';
import LabelsCell from './LabelsCell';

const TABLE_COLUMNS_ATTENTION = 9; // expand + Sources, Title, Labels, Urgency, Needed, Assign to, ETA, Actions
const TABLE_COLUMNS_DONE = 4; // expand + Task, Label, Assign to

// Icons from client/public/icons — in Vite dev public is at root (/icons/); in build we use base (e.g. /sales-room/icons/)
const ICON_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === false && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL + 'icons/'
    : '/icons/';
const SOURCE_ICONS = {
  Salesforce: ICON_BASE + 'salesforce.svg',
  Gong: ICON_BASE + 'gong.svg',
  Drive: ICON_BASE + 'drive.svg',
  Email: ICON_BASE + 'email.svg',
  Slack: ICON_BASE + 'slack.svg',
};

function EditableCell({ value, placeholder, onBlur }) {
  const handleBlur = useCallback(
    (e) => {
      const v = e.target.textContent.trim();
      if (v !== value) onBlur(v);
    },
    [value, onBlur]
  );
  return (
    <span
      className="editable-cell"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={handleBlur}
    >
      {value || ''}
    </span>
  );
}

function ActivityLog({ agentLog }) {
  const log = Array.isArray(agentLog) ? agentLog : [];
  if (log.length === 0) {
    return (
      <div className="demi-activity-log">
        <h4 className="demi-activity-log-title">Demi Activity Log</h4>
        <p className="demi-activity-log-empty">No activity recorded yet.</p>
      </div>
    );
  }
  return (
    <div className="demi-activity-log">
      <h4 className="demi-activity-log-title">Demi Activity Log</h4>
      <ul className="demi-activity-log-list">
        {log.map((entry, i) => (
          <li key={i} className="demi-activity-log-entry">
            <span className="demi-activity-log-time">{entry.time}</span>
            <span
              className="demi-activity-log-source"
              title={entry.source ? `Source: ${entry.source}` : null}
              data-source={entry.source || ''}
            >
              {entry.source && SOURCE_ICONS[entry.source] ? (
                <img
                  src={SOURCE_ICONS[entry.source]}
                  alt=""
                  className="demi-activity-log-icon"
                  width={20}
                  height={20}
                />
              ) : (
                <span className="demi-activity-log-icon demi-activity-log-icon-empty" aria-hidden />
              )}
            </span>
            <span className="demi-activity-log-action">{entry.action}</span>
            <span className="demi-activity-log-meta">
              {entry.link && (
                <a href="#" className="demi-activity-log-link" onClick={(e) => e.preventDefault()}>
                  {entry.link}
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Unique source names from task.agentLog (for Sources column preview) */
function getTaskSources(task) {
  const log = Array.isArray(task.agentLog) ? task.agentLog : [];
  const sources = [...new Set(log.map((e) => e.source).filter(Boolean))];
  return sources;
}

function SourcesCell({ task }) {
  const sources = getTaskSources(task);
  if (sources.length === 0) {
    return <td className="td-sources sources-cell">—</td>;
  }
  return (
    <td className="td-sources sources-cell" title={sources.map((s) => `Source: ${s}`).join(', ')}>
      <span className="sources-preview">
        {sources.map((source) =>
          SOURCE_ICONS[source] ? (
            <img
              key={source}
              src={SOURCE_ICONS[source]}
              alt=""
              className="sources-preview-icon"
              width={20}
              height={20}
              title={source}
            />
          ) : null
        )}
      </span>
    </td>
  );
}

function UrgencyCell({ urgency }) {
  const level = (urgency || '').toLowerCase();
  const className = level ? `urgency-pill urgency-pill--${level}` : 'urgency-pill';
  return (
    <td className="td-urgency">
      <span className={className} title={urgency || ''}>
        {urgency || '—'}
      </span>
    </td>
  );
}

export default function TaskTable({
  tasks,
  tabKey,
  executingTaskIds,
  onExecute,
  onChat,
  onUpdateTask,
}) {
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const editable = tabKey === 'attention';
  const showExecute = tabKey === 'attention';
  const showChat = tabKey === 'attention' || tabKey === 'control';

  const handleFieldBlur = useCallback(
    (taskId, field, value) => {
      onUpdateTask(taskId, field, value);
    },
    [onUpdateTask]
  );

  const toggleExpanded = useCallback((taskId) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  }, []);

  const isDoneTab = tabKey === 'done';
  const tableColumns = isDoneTab ? TABLE_COLUMNS_DONE : TABLE_COLUMNS_ATTENTION;

  return (
    <div className="portal-table-wrap">
      <table className="portal-table">
        <thead>
          <tr>
            <th className="th-expand" aria-label="Expand row" />
            {isDoneTab ? (
              <>
                <th>Task</th>
                <th>Label</th>
                <th>Assign to</th>
              </>
            ) : (
              <>
                <th>Sources</th>
                <th>Title</th>
                <th>Labels</th>
                <th>Urgency</th>
                <th>Needed from you</th>
                <th>Assign to</th>
                <th>ETA</th>
                <th>Actions</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <Fragment key={task.id}>
              <tr
                key={task.id}
                data-id={task.id}
                data-tab={tabKey}
                className={expandedTaskId === task.id ? 'task-row-expanded' : ''}
              >
                <td className="td-expand">
                  <button
                    type="button"
                    className="btn-expand-row"
                    onClick={() => toggleExpanded(task.id)}
                    aria-expanded={expandedTaskId === task.id}
                    aria-label={expandedTaskId === task.id ? 'Collapse activity log' : 'Expand activity log'}
                    title={expandedTaskId === task.id ? 'Collapse' : 'Expand Demi Activity Log'}
                  >
                    {expandedTaskId === task.id ? '▼' : '▶'}
                  </button>
                </td>
                {isDoneTab ? (
                  <>
                    <td>{task.title}</td>
                    <td className="labels-td">
                      <LabelsCell
                        taskId={task.id}
                        labels={task.labels}
                        editable={false}
                        onUpdate={onUpdateTask}
                      />
                    </td>
                    <td className="validators-td">
                      <ValidatorsCell
                        taskId={task.id}
                        validators={task.validators}
                        editable={false}
                        onUpdate={onUpdateTask}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <SourcesCell task={task} />
                    <td>
                      {editable ? (
                        <EditableCell
                          value={task.title}
                          placeholder="Title"
                          onBlur={(v) => handleFieldBlur(task.id, 'title', v)}
                        />
                      ) : (
                        task.title
                      )}
                    </td>
                    <td className="labels-td">
                      <LabelsCell
                        taskId={task.id}
                        labels={task.labels}
                        editable={editable}
                        onUpdate={onUpdateTask}
                      />
                    </td>
                    <UrgencyCell urgency={task.urgency} />
                    <td className="read-only-cell">
                      {task.neededFromYou}
                    </td>
                    <td className="validators-td">
                      <ValidatorsCell
                        taskId={task.id}
                        validators={task.validators}
                        editable={editable}
                        onUpdate={onUpdateTask}
                      />
                    </td>
                    <td>
                      {editable ? (
                        <EditableCell
                          value={task.eta}
                          placeholder="—"
                          onBlur={(v) => handleFieldBlur(task.id, 'eta', v)}
                        />
                      ) : (
                        task.eta
                      )}
                    </td>
                    <td>
                      <div className="btn-row">
                        {showExecute && (
                          <button
                            type="button"
                            className="btn-execute-task"
                            onClick={() => onExecute(task)}
                            disabled={executingTaskIds.has(task.id)}
                          >
                            {executingTaskIds.has(task.id) ? 'Running…' : 'Execute'}
                          </button>
                        )}
                        {showChat && (
                          <button
                            type="button"
                            className="btn-chat btn-chat-task"
                            onClick={() => onChat(task)}
                          >
                            {tabKey === 'control' ? '💬 Chat' : 'Chat'}
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
              {expandedTaskId === task.id && (
                <tr key={`${task.id}-log`} className="task-row-activity-log">
                  <td colSpan={tableColumns} className="td-activity-log">
                    <ActivityLog agentLog={task.agentLog} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
