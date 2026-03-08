/**
 * Demi Slack Bot - Express server and Slack Events API handler.
 * Env vars: from .env locally (dotenv), from Lambda configuration on AWS.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import './env.js';
import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import { verifySlackSignature, postMessage, sendDMWithBlocks, sendDM } from './slack.js';
import { buildWelcomeDmBlocks, WELCOME_DM_FALLBACK, getJamesAfterApproveMessage } from './config/slackMessages.js';
import * as featureRequestFlow from './featureRequestFlow.js';
import * as roomStateStore from './roomStateStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// API Gateway (Lambda) often forwards path with stage prefix (e.g. /prod/api/...). Strip it so Express routes match.
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.use((req, res, next) => {
    const p = req.path || req.url || '';
    const stageMatch = p.match(/^\/[^/]+\/(api|slack|sales-room|send-welcome)/);
    if (stageMatch) {
      req.url = p.replace(/^\/[^/]+/, '') || '/';
    }
    next();
  });
}
// Env vars read from Lambda configuration when deployed (no .env in Lambda)
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// User IDs that receive the Sales Room DM on startup (e.g. AE "James"); second is optional
const JAMES_USER_ID = (process.env.JAMES_USER_ID || 'U01234567').trim();
const JAMES_2_USER_ID = (process.env.JAMES_2_USER_ID || '').trim();

// Base URL for Sales Room link in Slack (e.g. http://localhost:3000 or your ngrok/deployed URL)
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

function generateRoomId() {
  return crypto.randomBytes(6).toString('hex');
}

function salesRoomUrl(roomId) {
  return `${BASE_URL}/sales-room?customer=ACME&room=${roomId}`;
}

// Tracks the most-recently-created room so the feature-request Slack flow
// knows which room to associate with when triggered outside the UI.
let currentRoomId = null;

// Real flow: Jordan and optional Jordan 2 (Demi messages both; if either replies, flow continues)
const JORDAN_USER_ID = (process.env.JORDAN_USER_ID || '').trim();
const JORDAN_2_USER_ID = (process.env.JORDAN_2_USER_ID || '').trim();

// Important Feature Request flow: Jordan = JORDAN_USER_ID, Dan = DAN_SECURITY_USER_ID, James = JAMES_USER_ID
const DAN_SECURITY_USER_ID = (process.env.DAN_SECURITY_USER_ID || process.env.dan_security_user_id || '').trim();

/**
 * On startup (and /send-welcome): build welcome DM from config/slackMessages.js and send to James (and optional JAMES_2).
 */
async function sendSalesRoomDM() {
  if (!SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is not set');
  }
  if (!JAMES_USER_ID || JAMES_USER_ID === 'U01234567') {
    throw new Error('JAMES_USER_ID is not set or still the placeholder. Set it to your Slack user ID (e.g. U0ABC1234).');
  }

  const roomId = generateRoomId();
  currentRoomId = roomId;
  const url = salesRoomUrl(roomId);

  const blocks = buildWelcomeDmBlocks(url, JORDAN_USER_ID || undefined);
  const fallbackText = WELCOME_DM_FALLBACK || '';

  const userIds = [JAMES_USER_ID];
  if (JAMES_2_USER_ID) userIds.push(JAMES_2_USER_ID);

  for (const userId of userIds) {
    await sendDMWithBlocks(SLACK_BOT_TOKEN, userId, blocks, fallbackText);
    console.log('[server] Sales Room DM sent to user', userId, 'with link', url, '(room=%s)', roomId);
  }
  return roomId;
}

// JSON body parser for room state API
app.use('/api/room', express.json({ limit: '1mb' }));

// ----- Events endpoint: need raw body for signature verification -----
app.post(
  '/slack/events',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const rawBody = req.body;
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];

    if (!SLACK_SIGNING_SECRET) {
      console.error('[server] SLACK_SIGNING_SECRET is not set');
      return res.status(500).send('Server misconfiguration');
    }

    const isValid = verifySlackSignature(
      SLACK_SIGNING_SECRET,
      signature,
      timestamp,
      rawBody
    );
    if (!isValid) {
      console.warn('[server] Invalid Slack signature');
      return res.status(401).send('Invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      console.error('[server] Invalid JSON body');
      return res.status(400).send('Invalid JSON');
    }

    // URL verification challenge (required when enabling Event Subscriptions)
    if (payload.type === 'url_verification') {
      console.log('[server] URL verification challenge received');
      return res.status(200).contentType('text/plain').send(payload.challenge);
    }

    // Event callback: process then respond so Lambda stays alive until echo is sent
    if (payload.type === 'event_callback') {
      const event = payload.event;
      if (!event) {
        return res.status(200).send();
      }

      if (event.type === 'message') {
        await handleMessageEvent(event);
      }
      return res.status(200).send();
    }

    res.status(200).send();
  }
);

// ----- Interactivity: button clicks (e.g. Approve in welcome DM) -----
// Slack sends POST application/x-www-form-urlencoded with payload=<json>. Respond within 3s.
app.post(
  '/slack/interactions',
  express.raw({ type: 'application/x-www-form-urlencoded', limit: '1mb' }),
  async (req, res) => {
    const rawBody = req.body;
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];

    if (!SLACK_SIGNING_SECRET || !signature || !timestamp) {
      return res.status(401).send();
    }
    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
    if (!verifySlackSignature(SLACK_SIGNING_SECRET, signature, timestamp, body)) {
      return res.status(401).send();
    }

    let payload;
    try {
      const params = new URLSearchParams(body.toString('utf8'));
      const payloadStr = params.get('payload');
      if (!payloadStr) return res.status(200).send();
      payload = JSON.parse(payloadStr);
    } catch (e) {
      console.error('[server] interactions payload parse error:', e?.message);
      return res.status(200).send();
    }

    if (payload.type === 'block_actions') {
      const action = payload.actions?.[0];
      if (action?.action_id === 'james_approve_scim') {
        const userId = payload.user?.id;
        if (userId && SLACK_BOT_TOKEN) {
          try {
            const followUpText = getJamesAfterApproveMessage(JORDAN_USER_ID || JORDAN_2_USER_ID);
            await sendDM(SLACK_BOT_TOKEN, userId, followUpText);
            console.log('[server] James approved via Slack; ack DM sent to', userId);
          } catch (err) {
            console.error('[server] Approve button handler error:', err?.message || err);
          }
          return res.status(200).send();
        }
      }
    }
    res.status(200).send();
  }
);

/**
 * Handle Slack message events: ignore bot messages.
 * Real flow: if message is from Jordan in the Jordan DM channel, handle as Jordan reply (no echo).
 * Fake flow / other channels: echo user text in same channel.
 */
async function handleMessageEvent(event) {
  if (event.bot_id) {
    console.log('[server] Ignoring bot message');
    return;
  }

  // Ignore message subtypes (e.g. channel_join, message_changed) so we only echo user text
  if (event.subtype) {
    console.log('[server] Ignoring message subtype:', event.subtype);
    return;
  }

  const channel = event.channel;
  const text = event.text?.trim() || '';
  const userId = event.user;

  if (!channel) {
    console.warn('[server] No channel in message event');
    return;
  }

  // ----- Real flow: Important Feature Request (Jordan / Dan) -----
  if (await featureRequestFlow.isFeatureRequestChannel(channel, userId)) {
    try {
      const handled = await featureRequestFlow.handleMessage(SLACK_BOT_TOKEN, channel, userId, text);
      if (handled) {
        console.log('[server] Feature request flow message handled');
        return;
      }
    } catch (err) {
      console.error('[server] Feature request flow handling failed:', err.message);
    }
  }

  // ----- Echo only in non-DM channels (never echo in DMs) -----
  // In DMs, if we don't have flow state (e.g. different Lambda instance or cold start), we would wrongly
  // echo the user's message. Skip echo for DMs so Jordan's replies are never echoed when state is missing.
  const isDM = typeof channel === 'string' && channel.startsWith('D');
  if (isDM) {
    console.log('[server] Skipping echo in DM channel=%s (flow state may be on another instance)', channel);
    return;
  }

  console.log('[server] Echoing message event_id=%s channel=%s text=%s', event.event_id, channel, text);

  if (!SLACK_BOT_TOKEN) {
    console.error('[server] SLACK_BOT_TOKEN not set, cannot reply');
    return;
  }

  try {
    await postMessage(SLACK_BOT_TOKEN, channel, text);
    console.log('[server] Echo sent successfully');
  } catch (err) {
    console.error('[server] Failed to send echo:', err.message);
  }
}

// ----- Sales Room: React app (when built) or legacy HTML -----
const SALES_ROOM_HTML_PATH = path.join(__dirname, 'public', 'sales-room.html');
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');
const REACT_INDEX_PATH = path.join(CLIENT_DIST, 'index.html');

if (fs.existsSync(REACT_INDEX_PATH)) {
  app.get('/sales-room', (req, res) => res.sendFile(REACT_INDEX_PATH));
  app.get('/sales-room/', (req, res) => res.sendFile(REACT_INDEX_PATH));
  app.get('/sales-room/vp-sales', (req, res) => res.sendFile(REACT_INDEX_PATH));
  app.get('/sales-room/vp-sales/', (req, res) => res.sendFile(REACT_INDEX_PATH));
  app.use('/sales-room', express.static(CLIENT_DIST, { index: false }));
} else {
  app.get('/sales-room', (req, res) => {
    const html = fs.readFileSync(SALES_ROOM_HTML_PATH, 'utf8');
    res.type('html').send(html);
  });
}

// Scripted events config (pre-scripted Demi demo flow). Served so Sales Room can load it.
const SCRIPTED_EVENTS_JS_PATH = path.join(__dirname, 'public', 'scripted-events-config.js');
app.get('/scripted-events-config.js', (req, res) => {
  const js = fs.readFileSync(SCRIPTED_EVENTS_JS_PATH, 'utf8');
  res.type('application/javascript').send(js);
});

// Legacy: flow is now task-triggered only (Execute on Important Feature Request task)
app.get('/execute-Demi', (req, res) => res.status(410).json({ error: 'Gone. Use Execute on the Important Feature Request task in the Sales Room.' }));
app.post('/execute-Demi', (req, res) => res.status(410).json({ error: 'Gone. Use Execute on the Important Feature Request task in the Sales Room.' }));
app.get('/Demi-real-events', (req, res) => res.status(410).json({ error: 'Gone. Poll /api/tasks/important-feature-request/state instead.' }));

// ----- Important Feature Request: start real Slack flow and poll state -----
// Legacy endpoints kept for backwards compatibility; delegate to the room-scoped flow
app.post('/api/tasks/important-feature-request/start', async (req, res) => {
  console.log('[server] POST /api/tasks/important-feature-request/start received (legacy)');
  try {
    if (!JORDAN_USER_ID && !JORDAN_2_USER_ID) {
      return res.status(400).json({ ok: false, started: false, error: 'JORDAN_USER_ID or JORDAN_2_USER_ID must be set' });
    }
    if (!SLACK_BOT_TOKEN) {
      return res.status(500).json({ ok: false, started: false, error: 'SLACK_BOT_TOKEN not set' });
    }
    const roomId = currentRoomId || 'default';
    const result = await featureRequestFlow.startFlow(
      SLACK_BOT_TOKEN,
      JORDAN_USER_ID,
      JORDAN_2_USER_ID,
      DAN_SECURITY_USER_ID || undefined,
      JAMES_USER_ID,
      JAMES_2_USER_ID,
      roomId
    );
    return res.json({ ok: true, started: result.started });
  } catch (err) {
    const message = (err && err.message) || String(err);
    console.error('[server] important-feature-request start error:', message);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, started: false, error: message || 'Internal Server Error' });
    }
  }
});

app.get('/api/tasks/important-feature-request/state', async (req, res) => {
  try {
    const roomId = currentRoomId || 'default';
    res.json(await featureRequestFlow.getState(roomId));
  } catch (err) {
    console.error('[server] important-feature-request state error:', err?.message || err);
    res.status(500).json({ events: [], moveTo: null, phase: 'idle' });
  }
});

// ----- Room state: persist full UI state per demo session -----

app.get('/api/room/:roomId/state', async (req, res) => {
  try {
    const data = await roomStateStore.load(req.params.roomId);
    res.json(data);
  } catch (err) {
    console.error('[server] room state load error:', err?.message || err);
    res.status(500).json(null);
  }
});

app.post('/api/room/:roomId/state', async (req, res) => {
  try {
    const saved = await roomStateStore.save(req.params.roomId, req.body || {});
    res.json({ ok: true, updatedAt: saved.updatedAt });
  } catch (err) {
    console.error('[server] room state save error:', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'save failed' });
  }
});

app.post('/api/room/:roomId/execute', async (req, res) => {
  const { roomId } = req.params;
  console.log('[server] POST /api/room/%s/execute received', roomId);
  try {
    if (!JORDAN_USER_ID && !JORDAN_2_USER_ID) {
      return res.status(400).json({ ok: false, started: false, error: 'JORDAN_USER_ID or JORDAN_2_USER_ID must be set' });
    }
    if (!SLACK_BOT_TOKEN) {
      return res.status(500).json({ ok: false, started: false, error: 'SLACK_BOT_TOKEN not set' });
    }
    const result = await featureRequestFlow.startFlow(
      SLACK_BOT_TOKEN,
      JORDAN_USER_ID,
      JORDAN_2_USER_ID,
      DAN_SECURITY_USER_ID || undefined,
      JAMES_USER_ID,
      JAMES_2_USER_ID,
      roomId
    );
    return res.json({ ok: true, started: result.started });
  } catch (err) {
    const message = (err && err.message) || String(err);
    console.error('[server] room execute error:', message);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, started: false, error: message || 'Internal Server Error' });
    }
  }
});

app.get('/api/room/:roomId/flow-state', async (req, res) => {
  try {
    res.json(await featureRequestFlow.getState(req.params.roomId));
  } catch (err) {
    console.error('[server] room flow-state error:', err?.message || err);
    res.status(500).json({ events: [], moveTo: null, phase: 'idle' });
  }
});

// ----- Trigger Sales Room DM (for Lambda: call once to send the DM with link + button) -----
app.get('/send-welcome', async (req, res) => {
  try {
    const roomId = await sendSalesRoomDM();
    res.send(`Sales Room DM sent (room=${roomId}). Link: ${salesRoomUrl(roomId)}`);
  } catch (err) {
    console.error('[server] /send-welcome error:', err.message);
    res.status(500).send('Failed to send DM: ' + err.message);
  }
});

// ----- Health / root -----
app.get('/', (req, res) => {
  res.send('Demi Slack Bot is running.');
});

// Log unmatched requests and return 404 (helps debug API Gateway path/stage issues)
app.use((req, res) => {
  console.log('[server] Unmatched request:', req.method, req.path || req.url);
  res.status(404).json({ error: 'Not found', path: req.path || req.url });
});

// Lambda: pass (event, context) only so the library returns a Promise; Node.js 24+ requires promise-based handlers
const serverlessHandler = serverlessExpress({ app });
const handler = (event, context) => serverlessHandler(event, context);

// Local: run HTTP server and send welcome DM
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, async () => {
    console.log('[server] Listening on port', PORT);
    try {
      await sendSalesRoomDM();
    } catch (err) {
      console.error('[server] Startup Sales Room DM failed:', err.message);
    }
  });
}

export { handler };
