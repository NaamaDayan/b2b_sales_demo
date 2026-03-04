/**
 * Mock agent workflows and execution driver.
 * Designed so real synchronous events (e.g. Slack) can be injected later:
 * - runTaskExecution() can call backend POST /api/tasks/:id/execute and subscribe to trace updates.
 * - "Wait for X" steps can be replaced with wait-for-event from backend (e.g. SSE/WebSocket).
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

/**
 * @typedef {Object} TraceEntry
 * @property {string} id
 * @property {string} taskId
 * @property {string} taskTitle
 * @property {string} timestamp
 * @property {string} message
 * @property {'running'|'waiting'|'completed'} [status]
 * @property {'agent'|'slack'|'user'} [source]
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {string} message
 * @property {number} [delayMs]
 * @property {'done'|'requiresAttention'|null} [moveTo]
 * @property {'running'|'waiting'|'completed'} [status]
 */

const WORKFLOWS = {
  'security-questionnaire': [
    { message: 'Draft response based on updated documents', status: 'running' },
    { message: 'Send to @Sarah for approval', status: 'running' },
    { message: 'Waiting for @Sarah…', delayMs: 1800, status: 'waiting' },
    { message: 'Received approval from @Sarah', status: 'completed' },
    { message: 'Send to @Nina for approval', status: 'running' },
    { message: 'Waiting for @Nina…', delayMs: 1800, status: 'waiting' },
    { message: 'Received approval from @Nina', status: 'completed' },
    { message: 'Update security questionnaire file in workspace', status: 'running' },
    { message: 'Task completed.', moveTo: 'done', status: 'completed' },
  ],
  'discount-exception': [
    { message: 'Evaluate whether to grant discount', status: 'running' },
    { message: 'Ask @DealDesk for recommendation', status: 'running' },
    { message: 'Wait for @DealDesk reply', status: 'waiting' },
    { message: 'Waiting for @DealDesk…', delayMs: 2500, status: 'waiting' },
    { message: 'Received reply from @DealDesk', status: 'completed' },
    { message: 'Task remains under review.', status: 'completed' },
    // moveTo omitted — task stays in Under Control
  ],
  'scim-provisioning': [
    { message: 'Check SCIM support', status: 'running' },
    { message: 'Send proposed answer to Product', status: 'running' },
    { message: 'Wait for Product reply', status: 'waiting' },
    { message: 'Waiting for Product…', delayMs: 2000, status: 'waiting' },
    { message: 'Product responded', status: 'completed' },
    { message: 'Draft email to customer', status: 'running' },
    { message: 'Returning task to Requires Attention so AE can send the email.', moveTo: 'requiresAttention', status: 'completed' },
  ],
};

let traceIdCounter = 0;
function nextTraceId() {
  traceIdCounter += 1;
  return `trace-${traceIdCounter}`;
}

/**
 * Run mock workflow for a task. Pushes trace entries and optionally moves task at end.
 * @param {Object} task - { id, title, workflowId }
 * @param {Object} callbacks - { onTraceEntry: (entry: TraceEntry) => void, onMoveTask: (taskId: string, moveTo: 'done'|'requiresAttention') => void }
 */
export async function runMockWorkflow(task, callbacks) {
  const { onTraceEntry, onMoveTask } = callbacks;
  onTraceEntry({
    id: nextTraceId(),
    taskId: task.id,
    taskTitle: task.title,
    timestamp: formatTime(),
    message: 'Agent (Jessica) started working on this task.',
    status: 'running',
    source: 'agent',
  });

  const steps = WORKFLOWS[task.workflowId];
  if (!steps) {
    onTraceEntry({
      id: nextTraceId(),
      taskId: task.id,
      taskTitle: task.title,
      timestamp: formatTime(),
      message: `No workflow defined for "${task.workflowId}".`,
      status: 'completed',
    });
    return;
  }

  for (const step of steps) {
    if (step.delayMs) {
      await delay(step.delayMs);
    }
    const entry = {
      id: nextTraceId(),
      taskId: task.id,
      taskTitle: task.title,
      timestamp: formatTime(),
      message: step.message,
      status: step.status || 'running',
      source: 'agent',
    };
    onTraceEntry(entry);
    if (step.moveTo) {
      onMoveTask(task.id, step.moveTo);
    }
  }
}

const POLL_INTERVAL_MS = 2500;

/**
 * Hybrid workflow for Important Feature Request: two mock steps, then start real Slack flow and poll for events.
 * @param {Object} task - { id, title, workflowId }
 * @param {Object} callbacks - { onTraceEntry, onMoveTask }
 */
export async function runImportantFeatureRequestWorkflow(task, callbacks) {
  const { onTraceEntry, onMoveTask } = callbacks;

  onTraceEntry({
    id: nextTraceId(),
    taskId: task.id,
    taskTitle: task.title,
    timestamp: formatTime(),
    message: 'Agent (Jessica) started working on this task.',
    status: 'running',
    source: 'agent',
  });
  onTraceEntry({
    id: nextTraceId(),
    taskId: task.id,
    taskTitle: task.title,
    timestamp: formatTime(),
    message: 'Drafted response to feature request question for approval',
    status: 'running',
    source: 'agent',
  });
  onTraceEntry({
    id: nextTraceId(),
    taskId: task.id,
    taskTitle: task.title,
    timestamp: formatTime(),
    message: 'Sent proposed response to Jordan for approval',
    status: 'running',
    source: 'agent',
  });

  let lastSeenEventCount = 0;
  let pollTimerId = null;

  try {
    const startRes = await fetch('/api/tasks/important-feature-request/start', { method: 'POST' });
    const text = await startRes.text();
    let startData = { ok: false, started: false };
    if (text && text.trim()) {
      try {
        startData = JSON.parse(text);
      } catch (_) {
        startData = { ok: false, started: false, error: 'Invalid server response' };
      }
    } else if (!startRes.ok) {
      startData = { ok: false, started: false, error: startRes.statusText || 'Server error' };
    }
    if (!startData.ok || !startData.started) {
      const reason = startData.error || (startData.reason || 'check JORDAN_USER_ID and SLACK_BOT_TOKEN');
      onTraceEntry({
        id: nextTraceId(),
        taskId: task.id,
        taskTitle: task.title,
        timestamp: formatTime(),
        message: 'Could not start real Slack flow: ' + reason,
        status: 'completed',
        source: 'agent',
      });
      return;
    }
  } catch (err) {
    onTraceEntry({
      id: nextTraceId(),
      taskId: task.id,
      taskTitle: task.title,
      timestamp: formatTime(),
      message: 'Failed to start Slack flow: ' + (err.message || 'network error'),
      status: 'completed',
      source: 'agent',
    });
    return;
  }

  const stopPolling = () => {
    if (pollTimerId) {
      clearInterval(pollTimerId);
      pollTimerId = null;
    }
  };

  const poll = async () => {
    try {
      const res = await fetch('/api/tasks/important-feature-request/state');
      const data = await res.json();
      if (!res.ok || !data.events) return;

      const events = data.events || [];
      for (let i = lastSeenEventCount; i < events.length; i++) {
        const e = events[i];
        onTraceEntry({
          id: e.id || nextTraceId(),
          taskId: e.taskId || task.id,
          taskTitle: e.taskTitle || task.title,
          timestamp: e.timestamp || formatTime(),
          message: e.message,
          status: e.status || 'completed',
          source: e.source || 'slack',
        });
      }
      lastSeenEventCount = events.length;

      if (data.moveTo === 'requiresAttention') {
        stopPolling();
        onMoveTask(task.id, 'requiresAttention');
      }
    } catch (_) {
      // ignore poll errors
    }
  };

  pollTimerId = setInterval(poll, POLL_INTERVAL_MS);
  await poll();
}

/**
 * Execution driver: mock workflow or hybrid (Important Feature Request) real Slack flow.
 * @param {Object} task
 * @param {Object} callbacks - same as runMockWorkflow
 */
export function runTaskExecution(task, callbacks) {
  if (task.workflowId === 'important-feature-request') {
    return runImportantFeatureRequestWorkflow(task, callbacks);
  }
  return runMockWorkflow(task, callbacks);
}
