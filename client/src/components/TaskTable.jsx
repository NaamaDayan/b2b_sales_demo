import { useCallback, useState, Fragment } from 'react';
import ValidatorsCell from './ValidatorsCell';
import LabelsCell from './LabelsCell';

const TABLE_COLUMNS_ATTENTION = 8; // expand + Task, Track, Labels, Deal Risk, Assign to, ETA, Suggested action
const TABLE_COLUMNS_CONTROL = 7; // expand + Task, Track, Labels, Deal Risk, Assign to, ETA (no Suggested action)
const TABLE_COLUMNS_DONE = 5; // expand + Task, Track, Label, Collaborators

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

function trackSlug(track) {
  if (!track || typeof track !== 'string') return 'default';
  return track.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'default';
}

function TrackCell({ track }) {
  const slug = trackSlug(track);
  return (
    <td className="td-track">
      <span className={`track-pill track-pill--${slug}`}>
        {track || '—'}
      </span>
    </td>
  );
}

function DealRiskCell({ urgency, dealRiskReason, whyItMatters }) {
  const level = (urgency || '').toLowerCase();
  const className = level ? `urgency-pill urgency-pill--${level}` : 'urgency-pill';
  const hoverText = dealRiskReason || whyItMatters || urgency || '';
  return (
    <td className="td-urgency">
      <span className={className} title={hoverText}>
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
  const showApprove = tabKey === 'attention';

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
  const isControlTab = tabKey === 'control';
  const tableColumns = isDoneTab
    ? TABLE_COLUMNS_DONE
    : isControlTab
      ? TABLE_COLUMNS_CONTROL
      : TABLE_COLUMNS_ATTENTION;

  return (
    <div className="portal-table-wrap">
      <table className="portal-table">
        <thead>
          <tr>
            <th className="th-expand" aria-label="Expand row" />
            {isDoneTab ? (
              <>
                <th>Task</th>
                <th>Track</th>
                <th>Label</th>
                <th>Collaborators</th>
              </>
            ) : (
              <>
                <th>Task</th>
                <th>Track</th>
                <th>Labels</th>
                <th>Deal Risk</th>
                <th>Assign to</th>
                <th>ETA</th>
                {!isControlTab && <th>Suggested action</th>}
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
                    <TrackCell track={task.track} />
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
                    <td>
                      {editable ? (
                        <EditableCell
                          value={task.title}
                          placeholder="Task"
                          onBlur={(v) => handleFieldBlur(task.id, 'title', v)}
                        />
                      ) : (
                        task.title
                      )}
                    </td>
                    <TrackCell track={task.track} />
                    <td className="labels-td">
                      <LabelsCell
                        taskId={task.id}
                        labels={task.labels}
                        editable={editable}
                        onUpdate={onUpdateTask}
                      />
                    </td>
                    <DealRiskCell
                      urgency={task.urgency}
                      dealRiskReason={task.dealRiskReason}
                      whyItMatters={task.whyItMatters}
                    />
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
                    {!isControlTab && (
                      <td className="td-suggested-action">
                        <div className="suggested-action-content">
                          <span className="suggested-action-text">{task.neededFromYou}</span>
                          {showApprove && (
                            <button
                              type="button"
                              className="btn-approve-task"
                              onClick={() => onExecute(task)}
                              disabled={executingTaskIds.has(task.id)}
                            >
                              {executingTaskIds.has(task.id) ? 'Running…' : 'Approve'}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
