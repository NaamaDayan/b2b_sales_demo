import { useCallback } from 'react';
import ValidatorsCell from './ValidatorsCell';
import LabelsCell from './LabelsCell';

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

export default function TaskTable({
  tasks,
  tabKey,
  executingTaskIds,
  onExecute,
  onChat,
  onUpdateTask,
}) {
  const editable = tabKey === 'attention';
  const showExecute = tabKey === 'attention';
  const showChat = tabKey === 'attention' || tabKey === 'control';

  const handleFieldBlur = useCallback(
    (taskId, field, value) => {
      onUpdateTask(taskId, field, value);
    },
    [onUpdateTask]
  );

  return (
    <div className="portal-table-wrap">
      <table className="portal-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Labels</th>
            <th>Why it matters</th>
            <th>What I prepared</th>
            <th>Needed from you</th>
            <th>Validators</th>
            <th>ETA</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} data-id={task.id} data-tab={tabKey}>
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
              <td>
                {task.whyItMatters}
              </td>
              <td>
                {task.whatPrepared}
              </td>
              <td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
