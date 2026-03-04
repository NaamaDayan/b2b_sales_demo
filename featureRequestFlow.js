/**
 * Real Slack flow for "Important Feature Request" task.
 * Jordan (JORDAN_USER_ID) receives initial message; first reply → bot responds (message from file);
 * second reply → bot says checking with Dan; action trail shows Jordan approval, waiting for Dan;
 * after a few seconds Dan approval is simulated (no Slack to Dan); then draft mail, notify James (JAMES_USER_ID).
 * Messages are loaded from feature-request-messages.txt (multi-line format supported).
 */

import { openDMChannel, postMessage, sendDM } from './slack.js';
import { loadMessages } from './botMessages.js';

// On Lambda, setTimeout after response is sent often never runs, so we send to James immediately.
// Use 0 so the DM is sent in the same request; action trail still shows "Waiting for Dan" then "Received Dan approval", etc.
const DAN_SIMULATION_DELAY_MS = 0;

const TASK_ID = 'important-feature-request';

const PHASE = {
  IDLE: 'idle',
  SENT_TO_JORDAN: 'sent_to_jordan',
  WAITING_JORDAN_SECOND_REPLY: 'waiting_jordan_second_reply',
  DONE: 'done',
};

let state = {
  phase: PHASE.IDLE,
  jordanChannelId: null,
  jordanUserId: null,
  aeUserId: null,
  events: [],
  moveTo: null,
  lastEventId: 0,
  danSimulationTimerId: null,
};

function nextId() {
  state.lastEventId += 1;
  return state.lastEventId;
}

function addEvent(message, status = 'completed') {
  const ts = Date.now();
  state.events.push({
    id: `fr-${nextId()}`,
    ts,
    message,
    status,
    source: 'slack',
  });
  return ts;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

/** Block Kit for message to Jordan (JORDAN_USER_ID) - SCIM request */
function jordanMessageBlocks() {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Customer:* ACME\n*Urgency:* HIGH',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Item:* Customer asked if we support SCIM provisioning (needed for automated onboarding/offboarding).',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "*What I've done:*\nSource found: Identity Integrations Roadmap - Q1 2026 (updated Feb 12, 2026). It indicates: SCIM is not planned in H1 2026. Suggested positioning: we can still solve their outcome using SAML + API provisioning + our automation workflows.\n\n*Suggested response to AE:*\n\"We don't currently support SCIM provisioning. However, customers achieve the same automated lifecycle using SAML plus API-based provisioning and our certificate automation workflows. If you share your IdP and target apps, we'll confirm the best path for your setup.\"",
      },
    },
  ];
}

/**
 * Start the flow: send SCIM message to Jordan (JORDAN_USER_ID).
 * @param {string} token - SLACK_BOT_TOKEN
 * @param {string} jordanUserId - JORDAN_USER_ID (Jordan)
 * @param {string} [danUserId] - unused (Dan is simulated)
 * @param {string} [aeUserId] - JAMES_USER_ID (James)
 */
export async function startFlow(token, jordanUserId, danUserId, aeUserId) {
  if (!token || !jordanUserId) {
    console.log('[featureRequestFlow] Skipping: no token or Jordan user ID');
    return { started: false };
  }

  if (state.danSimulationTimerId) {
    clearTimeout(state.danSimulationTimerId);
    state.danSimulationTimerId = null;
  }

  state = {
    phase: PHASE.IDLE,
    jordanChannelId: null,
    jordanUserId: jordanUserId,
    aeUserId: aeUserId || null,
    events: [],
    moveTo: null,
    lastEventId: state.lastEventId,
    danSimulationTimerId: null,
  };

  try {
    const { channelId } = await openDMChannel(token, jordanUserId);
    state.jordanChannelId = channelId;

    const messages = loadMessages();
    const fallback = messages.FEATURE_REQUEST_TO_JORDAN_FALLBACK || 'Feature request for ACME: SCIM provisioning – draft response for Jordan approval.';
    await postMessage(token, channelId, fallback, { blocks: jordanMessageBlocks() });
  } catch (err) {
    const msg = err.message || String(err);
    console.error('[featureRequestFlow] Slack error:', msg);
    throw new Error('Slack: ' + msg);
  }

  addEvent('Drafted response to feature request question for approval');
  addEvent('Sent proposed response to Jordan for approval');
  state.phase = PHASE.SENT_TO_JORDAN;

  console.log('[featureRequestFlow] Message sent to Jordan (Important Feature Request)');
  return { started: true };
}

async function runDanSimulationAndFinish(token) {
  addEvent('Received Dan approval', 'completed');
  addEvent('Drafted email to customer', 'completed');
  addEvent('Sending to James for approval', 'completed');
  state.moveTo = 'requiresAttention';
  if (state.aeUserId && token) {
    const messages = loadMessages();
    const text = messages.MESSAGE_TO_JAMES || 'I drafted a mail you can send and I made sure jason and dan approved it';
    try {
      await sendDM(token, state.aeUserId, text);
    } catch (err) {
      console.error('[featureRequestFlow] Send to James failed:', err.message);
    }
  }
  state.phase = PHASE.DONE;
  console.log('[featureRequestFlow] Simulated Dan approval; task returning to Requires Attention; James notified');
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

/**
 * Handle a message in the Important Feature Request flow (Jordan DM only; Dan is simulated).
 * @returns {Promise<boolean>} true if the message was handled
 */
export async function handleMessage(token, channelId, userId, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  if (channelId !== state.jordanChannelId || userId !== state.jordanUserId) return false;

  const messages = loadMessages();

  if (state.phase === PHASE.SENT_TO_JORDAN) {
    await postMessage(token, state.jordanChannelId, messages.BOT_AFTER_JORDAN_FIRST_REPLY);
    state.phase = PHASE.WAITING_JORDAN_SECOND_REPLY;
    return true;
  }

  if (state.phase === PHASE.WAITING_JORDAN_SECOND_REPLY) {
    await postMessage(token, state.jordanChannelId, messages.BOT_AFTER_JORDAN_SECOND_REPLY);
    addEvent('Received Jordan approval', 'completed');
    addEvent("Waiting for Dan's approval", 'waiting');
    await scheduleDanSimulationAndFinish(token);
    return true;
  }

  return false;
}

/**
 * True if this (channelId, userId) belongs to the Important Feature Request flow (Jordan DM).
 */
export function isFeatureRequestChannel(channelId, userId) {
  if (state.phase === PHASE.IDLE) return false;
  return state.jordanChannelId !== null && channelId === state.jordanChannelId && userId === state.jordanUserId;
}

/**
 * Return events and moveTo for the client to merge into reasoning trace and move task.
 */
export function getState() {
  return {
    taskId: TASK_ID,
    events: state.events.map((e) => ({
      id: e.id,
      taskId: TASK_ID,
      taskTitle: 'Important Feature Request',
      timestamp: formatTimestamp(e.ts),
      message: e.message,
      status: e.status,
      source: e.source,
    })),
    moveTo: state.moveTo,
    phase: state.phase,
  };
}
