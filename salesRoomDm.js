/**
 * Sales Room DM: reads the custom message from TXT and builds Slack Block Kit payload.
 *
 * To change the message the AE receives:
 * 1. Edit the file dm-message.txt in the project root.
 * 2. Put your message text there (plain text; line breaks are preserved).
 * 3. Restart the server (or call /send-welcome) to resend the DM.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DM_MESSAGE_PATH = path.join(__dirname, 'dm-message.txt');

/**
 * Read the DM message content from dm-message.txt.
 * @returns {string} Message text (trimmed)
 */
export function getDmMessageContent() {
  const content = fs.readFileSync(DM_MESSAGE_PATH, 'utf8');
  return content.trim();
}

/**
 * Build Slack Block Kit blocks for the Sales Room DM:
 * - Section block with main message text
 * - Actions block with a button linking to the Sales Room
 * @param {string} messageText - Main body text (from dm-message.txt)
 * @param {string} salesRoomUrl - Full URL to the Sales Room (e.g. http://localhost:3000/sales-room?customer=IBM)
 * @returns {object[]} Slack blocks array
 */
export function buildSalesRoomDmBlocks(messageText, salesRoomUrl) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: messageText,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Review & Approve Plan',
            emoji: true,
          },
          url: salesRoomUrl,
          action_id: 'sales_room_review',
        },
      ],
    },
  ];
}
