/**
 * Deduplication store for Slack events and interactions so the same event/action
 * is not processed twice (prevents duplicate messages when Slack retries or when
 * multiple Lambda instances receive the same payload).
 *
 * Uses in-memory store always; when FLOW_STATE_S3_BUCKET is set, also persists
 * to S3 so deduplication works across Lambda invocations.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const S3_BUCKET = process.env.FLOW_STATE_S3_BUCKET || '';
const S3_KEY = 'flow-state/dedupe.json';

const eventIds = new Map(); // id -> timestamp
const interactionKeys = new Map(); // key -> timestamp

function trim(map) {
  const now = Date.now();
  const cutoff = now - TTL_MS;
  for (const [k, ts] of map.entries()) {
    if (ts < cutoff) map.delete(k);
  }
}

async function readFromS3() {
  if (!S3_BUCKET) return null;
  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    const res = await client.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY })
    );
    const body = await res.Body?.transformToString();
    return body ? JSON.parse(body) : null;
  } catch (err) {
    if (err.name === 'NoSuchKey') return null;
    console.warn('[eventDedupeStore] S3 get failed:', err.message);
    return null;
  }
}

async function writeToS3(data) {
  if (!S3_BUCKET) return;
  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({});
    const now = Date.now();
    const cutoff = now - TTL_MS;
    const eventIdsObj = {};
    for (const [id, ts] of eventIds.entries()) {
      if (ts >= cutoff) eventIdsObj[id] = ts;
    }
    const interactionKeysObj = {};
    for (const [key, ts] of interactionKeys.entries()) {
      if (ts >= cutoff) interactionKeysObj[key] = ts;
    }
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: S3_KEY,
        Body: JSON.stringify({
          eventIds: eventIdsObj,
          interactionKeys: interactionKeysObj,
        }),
        ContentType: 'application/json',
      })
    );
  } catch (err) {
    console.warn('[eventDedupeStore] S3 put failed:', err.message);
  }
}

function mergeFromStored(stored) {
  if (!stored) return;
  const now = Date.now();
  const cutoff = now - TTL_MS;
  if (stored.eventIds && typeof stored.eventIds === 'object') {
    for (const [id, ts] of Object.entries(stored.eventIds)) {
      if (ts >= cutoff) eventIds.set(id, ts);
    }
  }
  if (stored.interactionKeys && typeof stored.interactionKeys === 'object') {
    for (const [key, ts] of Object.entries(stored.interactionKeys)) {
      if (ts >= cutoff) interactionKeys.set(key, ts);
    }
  }
}

let s3Loaded = false;

async function ensureS3Loaded() {
  if (!S3_BUCKET || s3Loaded) return;
  const stored = await readFromS3();
  mergeFromStored(stored);
  s3Loaded = true;
}

/**
 * Returns true if this event_id was already processed (duplicate delivery/retry).
 */
export async function hasProcessedEventId(eventId) {
  if (!eventId) return false;
  await ensureS3Loaded();
  trim(eventIds);
  return eventIds.has(eventId);
}

/**
 * Mark an event_id as processed. Call after accepting the event (before or after handling).
 */
export async function markProcessedEventId(eventId) {
  if (!eventId) return;
  const now = Date.now();
  eventIds.set(eventId, now);
  if (S3_BUCKET) {
    await writeToS3();
  }
}

/**
 * Build a unique key for an interaction (button click) to detect retries.
 */
export function interactionDedupeKey(payload) {
  const user = payload.user?.id || '';
  const action = payload.actions?.[0];
  const actionTs = action?.action_ts || '';
  const messageTs = payload.message?.ts || payload.container?.message_ts || '';
  return `i_${user}_${actionTs}_${messageTs}`;
}

/**
 * Returns true if this interaction was already processed.
 */
export async function hasProcessedInteraction(key) {
  if (!key) return false;
  await ensureS3Loaded();
  trim(interactionKeys);
  return interactionKeys.has(key);
}

/**
 * Mark an interaction key as processed.
 */
export async function markProcessedInteraction(key) {
  if (!key) return;
  const now = Date.now();
  interactionKeys.set(key, now);
  if (S3_BUCKET) {
    await writeToS3();
  }
}
