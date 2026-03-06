/**
 * Real Slack flow for "Important Feature Request" task.
 * See docs/IMPORTANT_FEATURE_REQUEST_FLOW.md for the 8-step flow.
 * Both Jordans receive each message; one reply from either advances the flow. Both James get the final message.
 * Messages from config/slackMessages.js.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { openDMChannel, postMessage, sendDM, uploadFileToChannel } from './slack.js';
import { getSlackMessage, taskUpdateOnReturn } from './config/slackMessages.js';
import { TRACE_STEPS } from './config/featureRequestTraceSteps.js';
import * as flowStateStore from './flowStateStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCIM_PDF_PATH = path.join(__dirname, 'SCIM_provisoning_feature.pdf');

const DAN_SIMULATION_DELAY_MS = typeof process !== 'undefined' && process.env.AWS_LAMBDA_FUNCTION_NAME ? 0 : 4000;
const TASK_ID = 'important-feature-request';

const PHASE = {
  IDLE: 'idle',
  SENT_FIRST_TO_JORDAN: 'sent_first_to_jordan',
  WAITING_JORDAN_FIRST_REPLY: 'waiting_jordan_first_reply',
  SENT_SECOND_TO_JORDAN: 'sent_second_to_jordan',
  WAITING_JORDAN_SECOND_REPLY: 'waiting_jordan_second_reply',
  DONE: 'done',
};

let state = {
  phase: PHASE.IDLE,
  jordans: [],
  jamesUserIds: [],
  events: [],
  moveTo: null,
  lastEventId: 0,
  danSimulationTimerId: null,
};

function nextId() {
  state.lastEventId += 1;
  return state.lastEventId;
}

function addEvent(message, status = 'completed', opts = {}) {
  const ts = Date.now();
  state.events.push({
    id: `fr-${nextId()}`,
    ts,
    message,
    status,
    source: 'slack',
    link: opts.link,
    traceSource: opts.traceSource || 'Slack',
  });
  return ts;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

/** Post one message to all Jordans: use blocks if present, else text. */
async function sendToAllJordans(token, messageKey) {
  const { fallback, text, blocks } = getSlackMessage(messageKey);
  const fallbackText = fallback || text || '';
  for (const j of state.jordans) {
    if (blocks && blocks.length) {
      await postMessage(token, j.channelId, fallbackText, { blocks });
    } else {
      await postMessage(token, j.channelId, text || fallbackText);
    }
  }
}

export async function startFlow(token, jordanUserId1, jordanUserId2, danUserId, jamesUserId1, jamesUserId2) {
  const jordanIds = [jordanUserId1, jordanUserId2].filter(Boolean);
  if (!token || jordanIds.length === 0) {
    console.log('[featureRequestFlow] Skipping: no token or Jordan user ID(s)');
    return { started: false };
  }

  if (state.danSimulationTimerId) {
    clearTimeout(state.danSimulationTimerId);
    state.danSimulationTimerId = null;
  }

  state = {
    phase: PHASE.IDLE,
    jordans: [],
    jamesUserIds: [jamesUserId1, jamesUserId2].filter(Boolean),
    events: [],
    moveTo: null,
    lastEventId: state.lastEventId,
    danSimulationTimerId: null,
  };

  try {
    console.log('[featureRequestFlow] Opening DM channels for', jordanIds.length, 'Jordan(s)');
    for (const jordanUserId of jordanIds) {
      const { channelId } = await openDMChannel(token, jordanUserId);
      state.jordans.push({ userId: jordanUserId, channelId });
    }
    console.log('[featureRequestFlow] Sending JORDAN_FIRST_QUESTION');
    await sendToAllJordans(token, 'JORDAN_FIRST_QUESTION');
    try {
      console.log('[featureRequestFlow] Attaching PDF to Jordan DMs');
      for (const j of state.jordans) {
        await uploadFileToChannel(token, j.channelId, SCIM_PDF_PATH, 'SCIM_provisoning_feature.pdf');
      }
    } catch (err) {
      console.warn('[featureRequestFlow] PDF attach failed:', err.message);
    }
  } catch (err) {
    const msg = err.message || String(err);
    console.error('[featureRequestFlow] Slack error:', msg);
    throw new Error('Slack: ' + msg);
  }

  addEvent(TRACE_STEPS.DRAFT_RESPONSE, 'completed', { link: 'view', traceSource: 'Drive' });
  addEvent(TRACE_STEPS.SENT_TO_JORDAN, 'completed', { traceSource: 'Slack' });
  state.phase = PHASE.WAITING_JORDAN_FIRST_REPLY;

  try {
    console.log('[featureRequestFlow] Saving flow state');
    await flowStateStore.save(state);
  } catch (storeErr) {
    console.warn('[featureRequestFlow] Flow state save failed (flow will still run):', storeErr.message || storeErr);
  }

  console.log('[featureRequestFlow] startFlow done: first message sent to', state.jordans.length, 'Jordan(s)');
  return { started: true };
}

async function runDanSimulationAndFinish(token) {
  addEvent(TRACE_STEPS.SENT_TO_DAN, 'running', { traceSource: 'Slack' });
  if (DAN_SIMULATION_DELAY_MS > 0) {
    await new Promise((r) => setTimeout(r, DAN_SIMULATION_DELAY_MS));
  }
  addEvent(TRACE_STEPS.RECEIVED_DAN_APPROVAL, 'completed');
  addEvent(TRACE_STEPS.DRAFTED_EMAIL, 'completed', { link: 'view', traceSource: 'Slack' });
  addEvent(TRACE_STEPS.SENDING_TO_JAMES, 'completed', { traceSource: 'Slack' });
  state.moveTo = 'requiresAttention';
  const { text } = getSlackMessage('MESSAGE_TO_JAMES');
  if (token && state.jamesUserIds.length > 0 && text) {
    for (const jamesUserId of state.jamesUserIds) {
      try {
        await sendDM(token, jamesUserId, text);
        console.log('[featureRequestFlow] MESSAGE_TO_JAMES sent to', jamesUserId);
      } catch (err) {
        console.error('[featureRequestFlow] Send to James failed for', jamesUserId, ':', err.message);
      }
    }
  }
  state.phase = PHASE.DONE;
  const channelUserKeys = (state.jordans || []).map((j) => `${j.channelId}:${j.userId}`);
  await flowStateStore.save(state);
  await flowStateStore.clear(channelUserKeys);
  console.log('[featureRequestFlow] Dan approval simulated; task returning to Requires Attention; James(es) notified');
}

function scheduleDanSimulationAndFinish(token) {
  if (state.danSimulationTimerId) return;
  if (DAN_SIMULATION_DELAY_MS <= 0) {
    return runDanSimulationAndFinish(token);
  }
  state.danSimulationTimerId = setTimeout(() => {
    state.danSimulationTimerId = null;
    runDanSimulationAndFinish(token).catch((err) => console.error('[featureRequestFlow] runDanSimulationAndFinish error:', err));
  }, DAN_SIMULATION_DELAY_MS);
}

export async function handleMessage(token, channelId, userId, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  let fromJordan = state.jordans.find((j) => j.channelId === channelId && j.userId === userId);
  if (!fromJordan) {
    const loaded = await flowStateStore.getByChannel(channelId, userId);
    if (!loaded) return false;
    state.phase = loaded.phase;
    state.jordans = loaded.jordans || [];
    state.jamesUserIds = loaded.jamesUserIds || [];
    state.events = loaded.events || [];
    state.moveTo = loaded.moveTo;
    state.lastEventId = loaded.lastEventId ?? state.lastEventId;
    fromJordan = state.jordans.find((j) => j.channelId === channelId && j.userId === userId);
    if (!fromJordan) return false;
  }

  if (state.phase === PHASE.WAITING_JORDAN_FIRST_REPLY) {
    await sendToAllJordans(token, 'JORDAN_SECOND_QUESTION');
    state.phase = PHASE.WAITING_JORDAN_SECOND_REPLY;
    await flowStateStore.save(state);
    return true;
  }

  if (state.phase === PHASE.WAITING_JORDAN_SECOND_REPLY) {
    await sendToAllJordans(token, 'JORDAN_ACK_FINAL');
    addEvent(TRACE_STEPS.RECEIVED_JORDAN_APPROVAL, 'completed', { traceSource: 'Slack' });
    addEvent(TRACE_STEPS.WAITING_DAN, 'waiting');
    await flowStateStore.save(state);
    await scheduleDanSimulationAndFinish(token);
    return true;
  }

  return false;
}

export async function isFeatureRequestChannel(channelId, userId) {
  if (state.jordans.some((j) => j.channelId === channelId && j.userId === userId)) return true;
  const stored = await flowStateStore.getByChannel(channelId, userId);
  return stored !== null;
}

export async function getState() {
  let s = state;
  const hasLocalState = s.events?.length > 0 || s.moveTo != null;
  if (!hasLocalState) {
    const stored = await flowStateStore.getFlowState();
    if (stored) s = stored;
  }
  const base = {
    taskId: TASK_ID,
    events: (s.events || []).map((e) => ({
      id: e.id,
      taskId: TASK_ID,
      taskTitle: 'Important Feature Request',
      timestamp: formatTimestamp(e.ts),
      message: e.message,
      status: e.status,
      source: e.source,
      link: e.link,
      traceSource: e.traceSource,
    })),
    moveTo: s.moveTo,
    phase: s.phase,
  };
  if (s.moveTo === 'requiresAttention') {
    base.taskUpdate = {
      whyItMatters: taskUpdateOnReturn.TASK_WHY_IT_MATTERS_RETURNED || '',
      whatPrepared: taskUpdateOnReturn.TASK_WHAT_PREPARED_RETURNED || '',
      neededFromYou: taskUpdateOnReturn.TASK_NEEDED_FROM_YOU_RETURNED || '',
    };
  }
  return base;
}
