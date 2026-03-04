/**
 * Real Slack flow for "Important Feature Request" task.
 * Both Jordans (JORDAN_USER_ID, JORDAN_2_USER_ID) receive the initial message; the bot only needs a reply from one to continue.
 * First reply → bot responds to both; second reply from either → bot says checking with Dan; action trail updates.
 * Dan approval is simulated; then draft mail, and both James (JAMES_USER_ID, JAMES_2_USER_ID) get the notification.
 * Messages are loaded from feature-request-messages.txt (multi-line format supported).
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { openDMChannel, postMessage, sendDM, uploadFileToChannel } from './slack.js';
import { loadMessages } from './botMessages.js';
import * as flowStateStore from './flowStateStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCIM_PDF_PATH = path.join(__dirname, 'SCIM_provisoning_feature.pdf');

// After "Waiting for Dan's approval", delay before simulating Dan's response (simulates employee response time).
// On Lambda, setTimeout often never runs after the handler returns, so use 0 there; locally use a few seconds.
const DAN_SIMULATION_DELAY_MS = typeof process !== 'undefined' && process.env.AWS_LAMBDA_FUNCTION_NAME ? 0 : 4000;

const TASK_ID = 'important-feature-request';

const PHASE = {
  IDLE: 'idle',
  SENT_TO_JORDAN: 'sent_to_jordan',
  WAITING_JORDAN_SECOND_REPLY: 'waiting_jordan_second_reply',
  DONE: 'done',
};

let state = {
  phase: PHASE.IDLE,
  /** @type {{ userId: string, channelId: string }[]} */
  jordans: [],
  /** @type {string[]} */
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
 * Start the flow: send SCIM message to both Jordans (JORDAN_USER_ID, JORDAN_2_USER_ID).
 * Only one reply from either Jordan is needed to continue. Both James (JAMES_USER_ID, JAMES_2_USER_ID) get the final message.
 * @param {string} token - SLACK_BOT_TOKEN
 * @param {string} jordanUserId1 - JORDAN_USER_ID
 * @param {string} [jordanUserId2] - JORDAN_2_USER_ID
 * @param {string} [danUserId] - unused (Dan is simulated)
 * @param {string} jamesUserId1 - JAMES_USER_ID
 * @param {string} [jamesUserId2] - JAMES_2_USER_ID
 */
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

  const messages = loadMessages();
  const fallback = messages.FEATURE_REQUEST_TO_JORDAN_FALLBACK || '';
  const blocks = jordanMessageBlocks();

  try {
    for (const jordanUserId of jordanIds) {
      const { channelId } = await openDMChannel(token, jordanUserId);
      state.jordans.push({ userId: jordanUserId, channelId });
      await postMessage(token, channelId, fallback, { blocks });
    }
  } catch (err) {
    const msg = err.message || String(err);
    console.error('[featureRequestFlow] Slack error:', msg);
    throw new Error('Slack: ' + msg);
  }

  addEvent('Drafted response to feature request question for approval');
  addEvent('Sent proposed response to Jordan for approval');
  state.phase = PHASE.SENT_TO_JORDAN;

  try {
    await flowStateStore.save(state);
  } catch (storeErr) {
    console.warn('[featureRequestFlow] Flow state save failed (flow will still run):', storeErr.message || storeErr);
  }

  console.log('[featureRequestFlow] Message sent to', state.jordans.length, 'Jordan(s) (Important Feature Request)');
  return { started: true };
}

async function runDanSimulationAndFinish(token) {
  addEvent('Received Dan approval', 'completed');
  addEvent('Drafted email to customer', 'completed');
  addEvent('Sending to James for approval', 'completed');
  state.moveTo = 'requiresAttention';
  const messages = loadMessages();
  const text = messages.MESSAGE_TO_JAMES || '';
  if (token && state.jamesUserIds.length > 0) {
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
  await flowStateStore.clear(channelUserKeys);
  console.log('[featureRequestFlow] Simulated Dan approval; task returning to Requires Attention; James(es) notified');
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
 * Handle a message in the Important Feature Request flow (either Jordan's DM; Dan is simulated).
 * A reply from either Jordan is enough to continue. Bot responses are sent to both Jordans.
 * If this instance has no in-memory state (e.g. different Lambda), state is loaded from the shared store.
 * @returns {Promise<boolean>} true if the message was handled
 */
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

  const messages = loadMessages();

  if (state.phase === PHASE.SENT_TO_JORDAN) {
    const replyText = messages.BOT_AFTER_JORDAN_FIRST_REPLY || '';
    for (const j of state.jordans) {
      await postMessage(token, j.channelId, replyText);
    }
    state.phase = PHASE.WAITING_JORDAN_SECOND_REPLY;
    await flowStateStore.save(state);
    return true;
  }

  if (state.phase === PHASE.WAITING_JORDAN_SECOND_REPLY) {
    const replyText = messages.BOT_AFTER_JORDAN_SECOND_REPLY || '';
    for (const j of state.jordans) {
      await postMessage(token, j.channelId, replyText);
    }
    addEvent('Received Jordan approval', 'completed');
    addEvent("Waiting for Dan's approval", 'waiting');
    await flowStateStore.save(state);
    await scheduleDanSimulationAndFinish(token);
    return true;
  }

  return false;
}

/**
 * True if this (channelId, userId) belongs to the Important Feature Request flow (either Jordan's DM).
 * Checks in-memory state and the shared store so another instance can recognize the channel.
 */
export async function isFeatureRequestChannel(channelId, userId) {
  if (state.jordans.some((j) => j.channelId === channelId && j.userId === userId)) return true;
  const stored = await flowStateStore.getByChannel(channelId, userId);
  return stored !== null;
}

/**
 * Return events, moveTo, and optional taskUpdate for the client.
 * When moveTo === 'requiresAttention', taskUpdate contains updated whyItMatters, whatPrepared, neededFromYou
 * so the table reflects that all approvals are in and the AE only needs to send the email.
 */
export function getState() {
  const base = {
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
  if (state.moveTo === 'requiresAttention') {
    const messages = loadMessages();
    base.taskUpdate = {
      whyItMatters: messages.TASK_WHY_IT_MATTERS_RETURNED || '',
      whatPrepared: messages.TASK_WHAT_PREPARED_RETURNED || '',
      neededFromYou: messages.TASK_NEEDED_FROM_YOU_RETURNED || '',
    };
  }
  return base;
}
