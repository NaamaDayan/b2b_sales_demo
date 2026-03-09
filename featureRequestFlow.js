/**
 * Real Slack flow for "Important Feature Request" task.
 * See docs/IMPORTANT_FEATURE_REQUEST_FLOW.md for the 8-step flow.
 * Both Jordans receive each message; one reply from either advances the flow. Both James get the final message.
 * Messages from config/slackMessages.js.
 *
 * State is scoped per room so multiple demo sessions can run concurrently.
 */

import { openDMChannel, postMessage, sendDM, sendDMWithBlocks } from './slack.js';
import { getSlackMessage, getMessageToJamesWithButton, taskUpdateOnReturn, AGENT_LOG_SCIM_RETURNED, DAN_APPROVAL_REPLY } from './config/slackMessages.js';
import { TRACE_STEPS } from './config/featureRequestTraceSteps.js';
import * as flowStateStore from './flowStateStore.js';

const DAN_SIMULATION_DELAY_MS = typeof process !== 'undefined' && process.env.AWS_LAMBDA_FUNCTION_NAME ? 0 : 4000;
const TASK_ID = 'important-feature-request';

const PHASE = {
  IDLE: 'idle',
  SENT_FIRST_TO_JORDAN: 'sent_first_to_jordan',
  WAITING_JORDAN_FIRST_REPLY: 'waiting_jordan_first_reply',
  SENT_SECOND_TO_JORDAN: 'sent_second_to_jordan',
  WAITING_JORDAN_SECOND_REPLY: 'waiting_jordan_second_reply',
  ACK_SENT_WAITING_DAN: 'ack_sent_waiting_dan',
  DONE: 'done',
};

const rooms = new Map();

function freshState(roomId) {
  return {
    roomId,
    phase: PHASE.IDLE,
    jordans: [],
    jamesUserIds: [],
    events: [],
    moveTo: null,
    lastEventId: 0,
    danSimulationTimerId: null,
  };
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, freshState(roomId));
  return rooms.get(roomId);
}

function nextId(s) {
  s.lastEventId += 1;
  return s.lastEventId;
}

function addEvent(s, message, status = 'completed', opts = {}) {
  const ts = Date.now();
  s.events.push({
    id: `fr-${nextId(s)}`,
    ts,
    message,
    status,
    source: 'slack',
    link: opts.link,
    traceSource: opts.traceSource || 'Slack',
    quote: opts.quote,
    detail: opts.detail,
  });
  return ts;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

async function sendToAllJordans(token, s, messageKey) {
  const { fallback, text, blocks } = getSlackMessage(messageKey);
  const fallbackText = fallback || text || '';
  for (const j of s.jordans) {
    if (blocks && blocks.length) {
      await postMessage(token, j.channelId, fallbackText, { blocks });
    } else {
      await postMessage(token, j.channelId, text || fallbackText);
    }
  }
}

async function persistState(s) {
  try {
    await flowStateStore.save(s);
  } catch (err) {
    console.warn('[featureRequestFlow] Flow state save failed (flow will still run):', err.message || err);
  }
}

export async function startFlow(token, jordanUserId1, jordanUserId2, danUserId, jamesUserId1, jamesUserId2, roomId = 'default') {
  const jordanIds = [jordanUserId1, jordanUserId2].filter(Boolean);
  if (!token || jordanIds.length === 0) {
    console.log('[featureRequestFlow] Skipping: no token or Jordan user ID(s)');
    return { started: false };
  }

  const prev = rooms.get(roomId);
  if (prev?.danSimulationTimerId) {
    clearTimeout(prev.danSimulationTimerId);
  }

  const s = freshState(roomId);
  s.jamesUserIds = [jamesUserId1, jamesUserId2].filter(Boolean);
  s.lastEventId = prev?.lastEventId || 0;
  rooms.set(roomId, s);

  try {
    console.log('[featureRequestFlow] Opening DM channels for', jordanIds.length, 'Jordan(s) room=%s', roomId);
    for (const jordanUserId of jordanIds) {
      const { channelId } = await openDMChannel(token, jordanUserId);
      s.jordans.push({ userId: jordanUserId, channelId });
    }
    console.log('[featureRequestFlow] Sending JORDAN_FIRST_QUESTION');
    await sendToAllJordans(token, s, 'JORDAN_FIRST_QUESTION');
  } catch (err) {
    const msg = err.message || String(err);
    console.error('[featureRequestFlow] Slack error:', msg);
    throw new Error('Slack: ' + msg);
  }

  addEvent(s, TRACE_STEPS.DRAFT_RESPONSE, 'completed', {
    link: 'view',
    traceSource: 'Drive',
    detail: 'Pulled the Identity Integrations Roadmap (Feb 12) and the SCIM provisioning doc from Drive, then drafted a customer-facing response that positions our current capabilities (SAML + API provisioning, certificate automation) and suggests the next step for the AE.',
  });
  addEvent(s, TRACE_STEPS.SENT_TO_JORDAN, 'completed', {
    traceSource: 'Slack',
    detail: 'Sent the proposed response and context to Jordan via Slack DM, including the source documents and the suggested positioning for the AE.',
  });
  s.phase = PHASE.WAITING_JORDAN_FIRST_REPLY;

  await persistState(s);

  console.log('[featureRequestFlow] startFlow done: first message sent to', s.jordans.length, 'Jordan(s) room=%s', roomId);
  return { started: true };
}

async function runDanSimulationAndFinish(s, token) {
  addEvent(s, TRACE_STEPS.SENT_TO_DAN, 'running', {
    traceSource: 'Slack',
    detail: 'Sent the Jordan-approved response to Dan (Security) for sign-off before we notify the AE.',
  });
  if (DAN_SIMULATION_DELAY_MS > 0) {
    await new Promise((r) => setTimeout(r, DAN_SIMULATION_DELAY_MS));
  }
  addEvent(s, TRACE_STEPS.RECEIVED_DAN_APPROVAL, 'completed', {
    detail: 'Dan confirmed Security sign-off. The response is ready to be handed off to the AE.',
    quote: DAN_APPROVAL_REPLY,
  });
  addEvent(s, TRACE_STEPS.DRAFTED_EMAIL, 'completed', {
    link: 'view',
    traceSource: 'Slack',
    detail: 'Drafted the customer-facing email using the approved wording from Jordan and attached the relevant context for the AE.',
  });
  addEvent(s, TRACE_STEPS.SENDING_TO_JAMES, 'completed', {
    traceSource: 'Slack',
    detail: 'Sent the final response and suggested next step to James so the AE can reply to the customer.',
  });
  s.moveTo = 'requiresAttention';
  const baseUrl = typeof process !== 'undefined' && process.env && process.env.BASE_URL ? process.env.BASE_URL : '';
  const roomParam = s.roomId ? `&room=${s.roomId}` : '';
  const salesRoomUrl = baseUrl ? `${String(baseUrl).replace(/\/$/, '')}/sales-room?customer=ACME${roomParam}` : '';
  const payload = getMessageToJamesWithButton(salesRoomUrl);
  if (token && s.jamesUserIds.length > 0) {
    for (const jamesUserId of s.jamesUserIds) {
      try {
        await sendDMWithBlocks(token, jamesUserId, payload.blocks, payload.fallback);
        console.log('[featureRequestFlow] MESSAGE_TO_JAMES sent to', jamesUserId, 'room=%s', s.roomId);
      } catch (err) {
        console.error('[featureRequestFlow] Send to James failed for', jamesUserId, ':', err.message);
      }
    }
  }
  s.phase = PHASE.DONE;
  const channelUserKeys = (s.jordans || []).map((j) => `${j.channelId}:${j.userId}`);
  await flowStateStore.save(s);
  await flowStateStore.clear(channelUserKeys);
  console.log('[featureRequestFlow] Dan approval simulated; task returning to Requires Attention; room=%s', s.roomId);
}

function scheduleDanSimulationAndFinish(s, token) {
  if (s.danSimulationTimerId) return;
  if (DAN_SIMULATION_DELAY_MS <= 0) {
    return runDanSimulationAndFinish(s, token);
  }
  s.danSimulationTimerId = setTimeout(() => {
    s.danSimulationTimerId = null;
    runDanSimulationAndFinish(s, token).catch((err) => console.error('[featureRequestFlow] runDanSimulationAndFinish error:', err));
  }, DAN_SIMULATION_DELAY_MS);
}

/**
 * Resolve the in-memory room state for a given channel+userId by checking all rooms,
 * then falling back to the persisted flow state store.
 */
function findRoomByChannel(channelId, userId) {
  for (const s of rooms.values()) {
    if (s.jordans.some((j) => j.channelId === channelId && j.userId === userId)) return s;
  }
  return null;
}

export async function handleMessage(token, channelId, userId, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  let s = findRoomByChannel(channelId, userId);
  if (!s) {
    const loaded = await flowStateStore.getByChannel(channelId, userId);
    if (!loaded) return false;
    const roomId = loaded.roomId || 'default';
    s = getRoom(roomId);
    s.phase = loaded.phase;
    s.jordans = loaded.jordans || [];
    s.jamesUserIds = loaded.jamesUserIds || [];
    s.events = loaded.events || [];
    s.moveTo = loaded.moveTo;
    s.lastEventId = loaded.lastEventId ?? s.lastEventId;
  }

  if (s.phase === PHASE.WAITING_JORDAN_FIRST_REPLY) {
    s.phase = PHASE.WAITING_JORDAN_SECOND_REPLY;
    await persistState(s);
    await sendToAllJordans(token, s, 'JORDAN_SECOND_QUESTION');
    return true;
  }

  if (s.phase === PHASE.WAITING_JORDAN_SECOND_REPLY) {
    addEvent(s, TRACE_STEPS.RECEIVED_JORDAN_APPROVAL, 'completed', {
      traceSource: 'Slack',
      quote: trimmed,
      detail: "Jordan approved the proposed response and provided the exact wording above. Next step is to get Dan's sign-off for Security before sending the final email to the customer.",
    });
    addEvent(s, TRACE_STEPS.WAITING_DAN, 'waiting');
    s.phase = PHASE.ACK_SENT_WAITING_DAN;
    await persistState(s);
    await sendToAllJordans(token, s, 'JORDAN_ACK_FINAL');
    await scheduleDanSimulationAndFinish(s, token);
    return true;
  }

  return false;
}

export async function isFeatureRequestChannel(channelId, userId) {
  if (findRoomByChannel(channelId, userId)) return true;
  const stored = await flowStateStore.getByChannel(channelId, userId);
  return stored !== null;
}

export async function getState(roomId = 'default') {
  let s = rooms.get(roomId);
  const hasLocalState = s && (s.events?.length > 0 || s.moveTo != null);
  if (!hasLocalState) {
    const stored = await flowStateStore.getFlowState();
    if (stored) s = stored;
  }
  if (!s) s = freshState(roomId);
  const base = {
    taskId: TASK_ID,
    events: (s.events || []).map((e) => ({
      id: e.id,
      taskId: TASK_ID,
      taskTitle: 'Customer request: SCIM provisioning support',
      timestamp: formatTimestamp(e.ts),
      message: e.message,
      status: e.status,
      source: e.source,
      link: e.link,
      traceSource: e.traceSource,
      quote: e.quote,
      detail: e.detail,
    })),
    moveTo: s.moveTo,
    phase: s.phase,
  };
  if (s.moveTo === 'requiresAttention') {
    base.taskUpdate = {
      whyItMatters: taskUpdateOnReturn.TASK_WHY_IT_MATTERS_RETURNED || '',
      whatPrepared: taskUpdateOnReturn.TASK_WHAT_PREPARED_RETURNED || '',
      neededFromYou: taskUpdateOnReturn.TASK_NEEDED_FROM_YOU_RETURNED || '',
      agentLogAppend: AGENT_LOG_SCIM_RETURNED,
    };
  }
  return base;
}
