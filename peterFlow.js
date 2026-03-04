/**
 * Real Slack flow for Jordan (JORDAN_USER_ID) and optional Jordan 2 (JORDAN_2_USER_ID).
 * When AE clicks "Execute / Activate Jessica", this flow runs alongside the fake flow.
 * Jessica sends the same questions to both Jordans in DM; if either replies, the flow continues
 * (follow-up and acknowledgment are sent to both). Replies update the Sales Room task
 * "important-feature-request" and the Timeline.
 *
 * State is in-memory; GET /jessica-real-events returns events and task state for the frontend to poll.
 */

import { openDMChannel, postMessage } from './slack.js';
import { loadMessages } from './botMessages.js';

// ----- In-memory state -----
// jordans: array of { userId, channelId, label } for each Jordan we're messaging
let state = {
  /** @type {{ userId: string, channelId: string, label: string }[]} */
  jordans: [],
  /** 0 = not started, 1 = waiting first reply, 2 = waiting second reply, 3 = done */
  waitingFor: 0,
  realEvents: [],
  taskNotes: '',
  taskStatus: 'pending',
  lastEventId: 0,
};

function nextId() {
  state.lastEventId += 1;
  return state.lastEventId;
}

function addRealEvent(description, badge = 'completed') {
  const ts = Date.now();
  state.realEvents.push({ id: nextId(), ts, description, badge });
  return ts;
}

/** First question to Jordan: Block Kit section + optional button */
function firstQuestionBlocks() {
  const msg = loadMessages();
  const text = msg.JORDAN_FIRST_QUESTION || '';
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Reply in thread', emoji: true },
          action_id: 'jordan_reply_btn',
        },
      ],
    },
  ];
}

/** Second question to Jordan (after first reply) */
function secondQuestionBlocks() {
  const msg = loadMessages();
  const text = msg.JORDAN_SECOND_QUESTION || '';
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
    },
  ];
}

async function postToChannel(token, channelId, fallbackText, blocks) {
  return postMessage(token, channelId, fallbackText, { blocks });
}

/**
 * Start the real flow: open DMs with Jordan (and Jordan 2 if set) and send first question to both.
 * @param {string} token - SLACK_BOT_TOKEN
 * @param {string} jordanUserId1 - JORDAN_USER_ID
 * @param {string} [jordanUserId2] - JORDAN_2_USER_ID (optional)
 */
export async function startRealFlow(token, jordanUserId1, jordanUserId2) {
  const ids = [jordanUserId1, jordanUserId2].filter(Boolean);
  if (!token || ids.length === 0) {
    console.log('[peterFlow] Skipping real flow: no JORDAN_USER_ID / JORDAN_2_USER_ID or SLACK_BOT_TOKEN');
    return { started: false };
  }

  state = {
    jordans: [],
    waitingFor: 0,
    realEvents: [],
    taskNotes: '',
    taskStatus: 'pending',
    lastEventId: state.lastEventId,
  };

  const labels = ['Product Jordan', 'Product Jordan 2'];
  const msg = loadMessages();
  const firstQuestionText = msg.JORDAN_FIRST_QUESTION || '';
  for (let i = 0; i < ids.length; i++) {
    const { channelId } = await openDMChannel(token, ids[i]);
    state.jordans.push({ userId: ids[i], channelId, label: labels[i] });
    await postToChannel(token, channelId, firstQuestionText, firstQuestionBlocks());
  }

  const sentLabel = state.jordans.length === 2
    ? 'Product Jordan and Product Jordan 2'
    : state.jordans[0].label;
  addRealEvent('Sent message to ' + sentLabel + ' for important-feature-request', 'completed');
  state.waitingFor = 1;
  console.log('[peterFlow] First question sent to', state.jordans.length, 'Jordan(s)');

  return { started: true };
}

/**
 * Handle a message from Jordan or Jordan 2 in their DM channel.
 * If either replies first, we continue: send second question to both, then on second reply from either, ack both and complete.
 */
export async function handlePeterReply(token, channelId, userId, text) {
  const jordan = state.jordans.find((j) => j.channelId === channelId && j.userId === userId);
  if (!jordan || (state.waitingFor !== 1 && state.waitingFor !== 2)) return false;

  const trimmed = (text || '').trim();
  if (!trimmed) return true;

  const msg = loadMessages();

  if (state.waitingFor === 1) {
    state.taskNotes = trimmed;
    addRealEvent('Received reply from ' + jordan.label + ' for important-feature-request', 'replied');

    for (const j of state.jordans) {
      await postToChannel(
        token,
        j.channelId,
        msg.JORDAN_SECOND_QUESTION || '',
        secondQuestionBlocks()
      );
    }
    state.waitingFor = 2;
    const followUpLabel = state.jordans.length === 2 ? 'Product Jordan and Product Jordan 2' : jordan.label;
    addRealEvent('Sent follow-up to ' + followUpLabel + ' (security review)', 'completed');
    console.log('[peterFlow] Second question sent to', state.jordans.length, 'Jordan(s)');
    return true;
  }

  if (state.waitingFor === 2) {
    state.taskNotes = state.taskNotes + '\n\nSecurity review: ' + trimmed;
    state.taskStatus = 'completed';
    addRealEvent('Received approval from ' + jordan.label + ' for important-feature-request', 'replied');

    const ackText = msg.JORDAN_ACK_FINAL || '';
    const ackBlocks = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: ackText },
      },
    ];
    const ackFallback = msg.JORDAN_ACK_FINAL || '';
    for (const j of state.jordans) {
      await postToChannel(token, j.channelId, ackFallback, ackBlocks);
    }
    const ackLabel = state.jordans.length === 2 ? 'Product Jordan and Product Jordan 2' : jordan.label;
    addRealEvent('Acknowledged confirmation to ' + ackLabel, 'completed');
    addRealEvent('important-feature-request marked Completed', 'completed');

    state.waitingFor = 3;
    console.log('[peterFlow] Jordan flow completed');
    return true;
  }

  return true;
}

/**
 * True if this (channelId, userId) is one of the Jordans in their real-flow DM.
 */
export function isPeterMessage(channelId, userId) {
  return state.jordans.some((j) => j.channelId === channelId && j.userId === userId);
}

/**
 * Return real-flow events and task state for the Sales Room to poll (GET /jessica-real-events).
 */
export function getRealEvents() {
  return {
    events: state.realEvents,
    taskNotes: state.taskNotes,
    taskStatus: state.taskStatus,
  };
}
