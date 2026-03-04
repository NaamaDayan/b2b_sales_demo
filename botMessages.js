/**
 * Load all bot messages from feature-request-messages.txt.
 * Single source for DM text, Jordan flow, and Important Feature Request flow.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_PATH = path.join(__dirname, 'feature-request-messages.txt');

// Single source of truth: feature-request-messages.txt. No message text here—only keys; missing file yields empty strings.
const MESSAGE_KEYS = [
  'DM_MESSAGE', 'SALES_ROOM_DM_FALLBACK', 'JORDAN_FIRST_QUESTION', 'JORDAN_SECOND_QUESTION', 'JORDAN_ACK_FINAL',
  'FEATURE_REQUEST_TO_JORDAN_FALLBACK', 'BOT_AFTER_JORDAN_FIRST_REPLY', 'BOT_AFTER_JORDAN_SECOND_REPLY', 'MESSAGE_TO_JAMES',
  'TASK_WHY_IT_MATTERS_RETURNED', 'TASK_WHAT_PREPARED_RETURNED', 'TASK_NEEDED_FROM_YOU_RETURNED',
];
const DEFAULTS = Object.fromEntries(MESSAGE_KEYS.map((k) => [k, '']));

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
