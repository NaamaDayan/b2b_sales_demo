/**
 * Real Slack flow for Product Peter (PETER_USER_ID) and optional Product Peter 2 (PETER_2_USER_ID).
 * When AE clicks "Execute / Activate Alex", this flow runs alongside the fake flow.
 * Alex sends the same questions to both Peters in DM; if either replies, the flow continues
 * (follow-up and acknowledgment are sent to both). Replies update the Sales Room task
 * "important-feature-request" and the Timeline.
 *
 * State is in-memory; GET /alex-real-events returns events and task state for the frontend to poll.
 */

import { openDMChannel, postMessage } from './slack.js';

// ----- In-memory state -----
// peters: array of { userId, channelId, label } for each Peter we're messaging
let state = {
  /** @type {{ userId: string, channelId: string, label: string }[]} */
  peters: [],
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

/** First question to Peter: Block Kit section + optional button */
function firstQuestionBlocks() {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Peter, can you provide clarification on the feature requirements for the IBM deal? This will help us update the *important-feature-request* task in the Sales Room.",
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Reply in thread', emoji: true },
          action_id: 'peter_reply_btn',
        },
      ],
    },
  ];
}

/** Second question to Peter (after first reply) */
function secondQuestionBlocks() {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Thanks, Peter! Could you confirm if this requirement also needs security review? Once you confirm, I'll mark the task complete.",
      },
    },
  ];
}

async function postToChannel(token, channelId, fallbackText, blocks) {
  return postMessage(token, channelId, fallbackText, { blocks });
}

/**
 * Start the real flow: open DMs with Peter (and Peter 2 if set) and send first question to both.
 * @param {string} token - SLACK_BOT_TOKEN
 * @param {string} peterUserId1 - PETER_USER_ID
 * @param {string} [peterUserId2] - PETER_2_USER_ID (optional)
 */
export async function startRealFlow(token, peterUserId1, peterUserId2) {
  const ids = [peterUserId1, peterUserId2].filter(Boolean);
  if (!token || ids.length === 0) {
    console.log('[peterFlow] Skipping real flow: no PETER_USER_ID / PETER_2_USER_ID or SLACK_BOT_TOKEN');
    return { started: false };
  }

  state = {
    peters: [],
    waitingFor: 0,
    realEvents: [],
    taskNotes: '',
    taskStatus: 'pending',
    lastEventId: state.lastEventId,
  };

  const labels = ['Product Peter', 'Product Peter 2'];
  for (let i = 0; i < ids.length; i++) {
    const { channelId } = await openDMChannel(token, ids[i]);
    state.peters.push({ userId: ids[i], channelId, label: labels[i] });
    await postToChannel(
      token,
      channelId,
      'Peter, can you provide clarification on the feature requirements for the IBM deal?',
      firstQuestionBlocks()
    );
  }

  const sentLabel = state.peters.length === 2
    ? 'Product Peter and Product Peter 2'
    : state.peters[0].label;
  addRealEvent('Sent message to ' + sentLabel + ' for important-feature-request', 'completed');
  state.waitingFor = 1;
  console.log('[peterFlow] First question sent to', state.peters.length, 'Peter(s)');

  return { started: true };
}

/**
 * Handle a message from Peter or Peter 2 in their DM channel.
 * If either replies first, we continue: send second question to both, then on second reply from either, ack both and complete.
 */
export async function handlePeterReply(token, channelId, userId, text) {
  const peter = state.peters.find((p) => p.channelId === channelId && p.userId === userId);
  if (!peter || (state.waitingFor !== 1 && state.waitingFor !== 2)) return false;

  const trimmed = (text || '').trim();
  if (!trimmed) return true;

  if (state.waitingFor === 1) {
    state.taskNotes = trimmed;
    addRealEvent('Received reply from ' + peter.label + ' for important-feature-request', 'replied');

    for (const p of state.peters) {
      await postToChannel(
        token,
        p.channelId,
        "Thanks, Peter! Could you confirm if this requirement also needs security review?",
        secondQuestionBlocks()
      );
    }
    state.waitingFor = 2;
    const followUpLabel = state.peters.length === 2 ? 'Product Peter and Product Peter 2' : peter.label;
    addRealEvent('Sent follow-up to ' + followUpLabel + ' (security review)', 'completed');
    console.log('[peterFlow] Second question sent to', state.peters.length, 'Peter(s)');
    return true;
  }

  if (state.waitingFor === 2) {
    state.taskNotes = state.taskNotes + '\n\nSecurity review: ' + trimmed;
    state.taskStatus = 'completed';
    addRealEvent('Received approval from ' + peter.label + ' for important-feature-request', 'replied');

    const ackBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "Thanks, Peter! I've recorded your confirmation and marked the *important-feature-request* task complete in the Sales Room.",
        },
      },
    ];
    for (const p of state.peters) {
      await postToChannel(
        token,
        p.channelId,
        "Thanks, Peter! I've recorded your confirmation and marked the important-feature-request task complete.",
        ackBlocks
      );
    }
    const ackLabel = state.peters.length === 2 ? 'Product Peter and Product Peter 2' : peter.label;
    addRealEvent('Acknowledged confirmation to ' + ackLabel, 'completed');
    addRealEvent('important-feature-request marked Completed', 'completed');

    state.waitingFor = 3;
    console.log('[peterFlow] Peter flow completed');
    return true;
  }

  return true;
}

/**
 * True if this (channelId, userId) is one of the Peters in their real-flow DM.
 */
export function isPeterMessage(channelId, userId) {
  return state.peters.some((p) => p.channelId === channelId && p.userId === userId);
}

/**
 * Return real-flow events and task state for the Sales Room to poll (GET /alex-real-events).
 */
export function getRealEvents() {
  return {
    events: state.realEvents,
    taskNotes: state.taskNotes,
    taskStatus: state.taskStatus,
  };
}
