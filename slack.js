/**
 * Slack API helpers and request verification for Jessica bot.
 * Uses native fetch (Node 18+) and Slack Web API.
 */

import crypto from 'crypto';

const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Verify that the request came from Slack using the signing secret.
 * @param {string} signingSecret - SLACK_SIGNING_SECRET
 * @param {string} signature - X-Slack-Signature header (e.g. "v0=abc123...")
 * @param {string} timestamp - X-Slack-Request-Timestamp header
 * @param {string|Buffer} rawBody - Raw request body (before JSON parse)
 * @returns {boolean}
 */
export function verifySlackSignature(signingSecret, signature, timestamp, rawBody) {
  if (!signingSecret || !signature || !timestamp) {
    console.warn('[slack] Missing signature, timestamp, or signing secret');
    return false;
  }

  // Replay protection: reject if older than 5 minutes
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (Number(timestamp) < fiveMinutesAgo) {
    console.warn('[slack] Request timestamp too old, possible replay');
    return false;
  }

  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const sigBasestring = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(sigBasestring);
  const mySignature = 'v0=' + hmac.digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Post a message to a Slack channel (or DM).
 * @param {string} token - Bot token (xoxb-...)
 * @param {string} channel - Channel ID (e.g. C123, D123 for DM)
 * @param {string} text - Message text
 * @param {object} [options] - Optional payload (thread_ts, etc.)
 * @returns {Promise<object>} Slack API response
 */
async function parseSlackResponse(res, context) {
  const text = await res.text();
  let data = {};
  if (text && text.trim()) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`${context}: Slack returned non-JSON (status ${res.status}). ${text.slice(0, 80)}`);
    }
  }
  if (!data.ok) {
    const errMsg = data.error || `Slack API error (status ${res.status})`;
    console.error('[slack]', context, errMsg, data);
    throw new Error(errMsg);
  }
  return data;
}

export async function postMessage(token, channel, text, options = {}) {
  const url = `${SLACK_API_BASE}/chat.postMessage`;
  const body = JSON.stringify({
    channel,
    text,
    ...options,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const data = await parseSlackResponse(res, 'chat.postMessage');
  return data;
}

/**
 * Send a direct message to a user by user ID.
 * Opens a DM channel and posts the message.
 * @param {string} token - Bot token
 * @param {string} userId - Slack user ID (e.g. U01234567)
 * @param {string} text - Message text
 * @returns {Promise<object>}
 */
export async function sendDM(token, userId, text) {
  const url = `${SLACK_API_BASE}/conversations.open`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ users: userId }),
  });

  const openData = await parseSlackResponse(res, 'conversations.open (sendDM)');
  const channelId = openData.channel?.id;
  if (!channelId) {
    throw new Error('Slack did not return a channel id (check bot scopes: im:write, im:read)');
  }
  return postMessage(token, channelId, text);
}

/**
 * Send a direct message with Slack Block Kit blocks (e.g. section + button).
 * Opens a DM channel and posts the message with blocks; fallback text is used in notifications.
 * @param {string} token - Bot token
 * @param {string} userId - Slack user ID (e.g. U01234567)
 * @param {object[]} blocks - Slack Block Kit blocks array
 * @param {string} fallbackText - Plain text fallback for notifications/accessibility
 * @returns {Promise<object>}
 */
export async function sendDMWithBlocks(token, userId, blocks, fallbackText) {
  const url = `${SLACK_API_BASE}/conversations.open`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ users: userId }),
  });

  const openData = await parseSlackResponse(res, 'conversations.open (sendDMWithBlocks)');
  const channelId = openData.channel?.id;
  if (!channelId) {
    throw new Error('Slack did not return a channel id (check bot scopes: im:write, im:read)');
  }
  return postMessage(token, channelId, fallbackText, { blocks });
}

/**
 * Open a DM channel with a user. Use this when you need the channel ID for follow-up messages
 * (e.g. real flow: send first message, then post to same channel when user replies).
 * @param {string} token - Bot token
 * @param {string} userId - Slack user ID (e.g. U01234567)
 * @returns {Promise<{ channelId: string }>}
 */
export async function openDMChannel(token, userId) {
  const url = `${SLACK_API_BASE}/conversations.open`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ users: userId }),
  });

  const data = await parseSlackResponse(res, 'conversations.open');

  const channelId = data.channel?.id;
  if (!channelId) {
    throw new Error('Slack did not return a channel id (check bot scopes: im:write, im:read)');
  }

  return { channelId };
}
