/**
 * Mock agent workflows and execution driver.
 * Workflow steps from config/reasoningTraceWorkflows.js.
 */

import { WORKFLOWS, EMPLOYEE_RESPONSE_DELAY_MS } from './config/reasoningTraceWorkflows.js';

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
 * @property {string} [link] - e.g. "view", "open source"
 * @property {string} [source] - icon key: Drive, Salesforce, Gong, Email, Slack
 */

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
    message: 'Demi started working on this task.',
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
      link: step.link,
      traceSource: step.source,
      fileRef: step.fileRef,
      detail: step.detail,
      quote: step.quote,
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
 * @param {string|null} roomId - room identifier (null = legacy unscoped)
 */
export async function runImportantFeatureRequestWorkflow(task, callbacks, roomId) {
  const { onTraceEntry, onMoveTask } = callbacks;

  const startUrl = roomId
    ? `/api/room/${roomId}/execute`
    : '/api/tasks/important-feature-request/start';
  const pollUrl = roomId
    ? `/api/room/${roomId}/flow-state`
    : '/api/tasks/important-feature-request/state';

  onTraceEntry({
    id: nextTraceId(),
    taskId: task.id,
    taskTitle: task.title,
    timestamp: formatTime(),
    message: 'Demi started working on this task.',
    status: 'running',
    source: 'agent',
  });

  let lastSeenEventCount = 0;
  let pollTimerId = null;

  try {
    const startRes = await fetch(startUrl, { method: 'POST' });
    const text = await startRes.text();
    let startData = { ok: false, started: false };
    if (text && text.trim()) {
      try {
        startData = JSON.parse(text);
      } catch (_) {
        startData = { ok: false, started: false, error: text.slice(0, 200) || 'Invalid server response' };
      }
    }
    if (!startRes.ok && !startData.error) {
      startData.error = (text && text.trim()) ? text.slice(0, 200) : (startRes.statusText || 'Server error');
    }
    if (!startData.ok || !startData.started) {
      const reason = startData.error || startData.message || startData.reason || (typeof text === 'string' && text.length < 300 ? text : null) || 'check JORDAN_USER_ID / JORDAN_2_USER_ID and SLACK_BOT_TOKEN';
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
      const res = await fetch(pollUrl);
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
          link: e.link,
          traceSource: e.traceSource || (e.source === 'slack' ? 'Slack' : undefined),
          quote: e.quote,
          detail: e.detail,
          fileRef: e.fileRef,
        });
      }
      lastSeenEventCount = events.length;

      if (data.moveTo === 'requiresAttention') {
        stopPolling();
        onMoveTask(task.id, 'requiresAttention', data.taskUpdate);
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
 * @param {string|null} roomId - room identifier for room-scoped endpoints
 */
export function runTaskExecution(task, callbacks, roomId = null) {
  if (task.workflowId === 'important-feature-request') {
    return runImportantFeatureRequestWorkflow(task, callbacks, roomId);
  }
  return runMockWorkflow(task, callbacks);
}
