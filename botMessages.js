/**
 * Load all bot messages from feature-request-messages.txt.
 * Single source for DM text, Jordan flow, and Important Feature Request flow.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_PATH = path.join(__dirname, 'feature-request-messages.txt');

const DEFAULTS = {
  DM_MESSAGE: 'Jessica has prepared a tailored execution plan for your customer based on recent activity and deal context.\n\nReview the suggested tasks, adjust as needed, and approve when ready.',
  SALES_ROOM_DM_FALLBACK: 'Jessica has prepared an execution plan. Review & approve in the Sales Room.',
  JORDAN_FIRST_QUESTION: "Jordan, can you provide clarification on the feature requirements for the ACME deal? This will help us update the *important-feature-request* task in the Sales Room.",
  JORDAN_SECOND_QUESTION: "Thanks, Jordan! Could you confirm if this requirement also needs security review? Once you confirm, I'll mark the task complete.",
  JORDAN_ACK_FINAL: "Thanks, Jordan! I've recorded your confirmation and marked the *important-feature-request* task complete in the Sales Room.",
  FEATURE_REQUEST_TO_JORDAN_FALLBACK: 'Feature request for ACME: SCIM provisioning – draft response for Jordan approval.',
  BOT_AFTER_JORDAN_FIRST_REPLY: 'according to this document it seems we are able to execute it on time',
  BOT_AFTER_JORDAN_SECOND_REPLY: "OK, great thank you. let me check with Dan and get his approval as you asked",
  MESSAGE_TO_JAMES: 'I drafted a mail you can send and I made sure jason and dan approved it',
};

/**
 * @returns {Record<string, string>} All messages keyed by name
 */
export function loadMessages() {
  const out = { ...DEFAULTS };
  try {
    const content = fs.readFileSync(MESSAGES_PATH, 'utf8');
    const lines = content.split(/\r?\n/);
    let currentKey = null;
    let currentLines = [];
    const flush = () => {
      if (currentKey) {
        const value = currentLines.join('\n').trim();
        if (value) out[currentKey] = value;
      }
    };
    for (const line of lines) {
      if (line.trim().startsWith('#')) continue;
      const keyMatch = line.match(/^([A-Z0-9_]+):\s*$/);
      if (keyMatch) {
        flush();
        currentKey = keyMatch[1].trim();
        currentLines = [];
        continue;
      }
      const keyInlineMatch = line.match(/^([A-Z0-9_]+):\s*(.*)$/);
      if (keyInlineMatch) {
        flush();
        currentKey = keyInlineMatch[1].trim();
        currentLines = [keyInlineMatch[2]];
        continue;
      }
      if (currentKey != null) currentLines.push(line);
    }
    flush();
  } catch (_) {}
  return out;
}
