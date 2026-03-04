/**
 * Sales Room DM: reads the custom message from feature-request-messages.txt and builds Slack Block Kit payload.
 *
 * To change the message the AE receives, edit DM_MESSAGE in feature-request-messages.txt.
 */

import { loadMessages } from './botMessages.js';

/**
 * Read the DM message content (key DM_MESSAGE from feature-request-messages.txt).
 * @returns {string} Message text (trimmed)
 */
export function getDmMessageContent() {
  const messages = loadMessages();
  return (messages.DM_MESSAGE || '').trim();
}

/**
 * Build Slack Block Kit blocks for the Sales Room DM:
 * - Section block with main message text
 * - Actions block with a button linking to the Sales Room
 * @param {string} messageText - Main body text (from dm-message.txt)
 * @param {string} salesRoomUrl - Full URL to the Sales Room (e.g. http://localhost:3000/sales-room?customer=ACME)
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
