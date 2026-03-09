/**
 * Slack message config for the Important Feature Request flow (Demi, Jordan, James).
 * Single place to edit content and add blocks, buttons, links, attachments later.
 *
 * Each Slack message can have:
 * - fallback: string (notifications/accessibility)
 * - text: string (plain or mrkdwn)
 * - blocks: array (Slack Block Kit); if present, used when posting; otherwise text is used
 *
 * Welcome DM (James) formatting notes:
 * - Icons: use image blocks or custom emoji (e.g. :salesforce:) if available; here we use bold labels *Salesforce*, *Slack*, *Gong*.
 * - Links: SCIM support uses mrkdwn <url|text>; @Jordan Lee uses <@USER_ID>.
 * - Buttons: "Approve" has action_id james_approve_scim (handled by /slack/interactions); "Deal space" is a link button to the UI.
 */

/** Fallback text for the welcome DM (notifications/accessibility). */
export const WELCOME_DM_FALLBACK = 'Demi – Deal Execution Manager for ACME. 4 items need your attention; first is SCIM support. Approve to route to Jordan.';

/**
 * Build Block Kit blocks for the welcome DM to James.
 * @param {string} salesRoomUrl - Full URL to the Deal Space / Sales Room
 * @param {string} jordanUserId - Slack user ID for Jordan (for <@mention> and follow-up)
 * @returns {object[]} Slack blocks array
 */
export function buildWelcomeDmBlocks(salesRoomUrl, jordanUserId) {
  const jordanMention = jordanUserId ? `<@${jordanUserId}>` : 'Jordan Lee';
  const section1 = `Hi James – I'm DEMI, your Deal Execution Manager for ACME.

I'm here to help you handle the internal work behind this deal so you can stay focused on the customer.

I've already mapped the current state and context based on Salesforce, relevant Slack threads, and meeting transcripts and created a tailored execution plan.`;

  const section2 = `We currently have 4 items that require your attention – the first is responding to ACME's question regarding SCIM support (${salesRoomUrl ? `<${salesRoomUrl}|see here>` : 'see Deal Space'}). I've already prepared a response based on our internal documentation and ACME's context – I suggest routing it to ${jordanMention} from Product as the relevant SME.

Do you approve?`;

  return [
    { type: 'section', text: { type: 'mrkdwn', text: section1 } },
    { type: 'section', text: { type: 'mrkdwn', text: section2 } },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Approve', emoji: true },
          action_id: 'james_approve_scim',
          value: 'approve',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Deal space', emoji: true },
          url: salesRoomUrl || '#',
          action_id: 'open_deal_space',
        },
      ],
    },
  ];
}

/**
 * Demi's follow-up to James after he clicks Approve.
 * @param {string} jordanUserId2 - Slack user ID for Jordan 2 (JORDAN_2_USER_ID) for <@mention>
 */
export function getJamesAfterApproveMessage(jordanUserId2) {
  const mention = jordanUserId2 ? `<@${jordanUserId2}>` : 'Jordan 2';
  return `Perfect, I've routed it to ${mention} and will let you know once I have an answer.`;
}

const JORDAN_FIRST_TEXT = `*Customer:* ACME
*Urgency:* HIGH

*Item:*
Customer asked if we support SCIM provisioning (needed for automated onboarding/offboarding).

*What I've done:*
Source found: <https://drive.acme.com/docs/Identity_Integrations_Roadmap_Q1_2026.pdf|📄 Identity Integrations Roadmap – Q1 2026.pdf> (updated Feb 12, 2026)
It indicates:
SCIM is not planned in H1 2026.
Suggested positioning:
We can still solve their outcome using SAML + API provisioning + our automation workflows.

*Suggested response to AE:*
"We don't currently support SCIM provisioning. However, customers achieve the same automated lifecycle using SAML plus API-based provisioning and our certificate automation workflows. If you share your IdP and target apps, we'll confirm the best path for your setup."`;

const JORDAN_SECOND_TEXT = `Good question.
The recommendation is based on two sources:
1. <https://drive.acme.com/docs/Identity_Integrations_Roadmap_Q1_2026.pdf|📄 Identity Integrations Roadmap – Q1 2026.pdf>
2. <https://drive.acme.com/docs/Customer_Lifecycle_Automation_Technical_Capabilities_v4.2.pdf|📄 Customer Lifecycle Automation – Technical Capabilities Overview v4.2.pdf>

From the capabilities document, the automation workflows already support:
• API-based user provisioning
• automated certificate lifecycle
• role-based onboarding triggers

This means customers can achieve automated onboarding/offboarding even without SCIM, as long as their IdP supports SAML and API access.

The suggested response is intentionally positioned around the outcome rather than the protocol, to avoid committing to SCIM specifically.`;

/** Exact message Jordan responded with on Slack when approving (shown as quote in reasoning trace — Jordan's reply, not the agent's). */
export const JORDAN_APPROVAL_REPLY = `Approved. The recommendation and the two sources look good—we can go with this for the AE. Thanks for pulling the roadmap and capabilities doc.`;

const JORDAN_ACK_TEXT = `Thanks, Jordan! I'll make sure Dan Tailor also approves this and let you know if there is a problem.`;

/** Mock reply from Dan (Security) when he approves — shown as quote in reasoning trace for RECEIVED_DAN_APPROVAL. */
export const DAN_APPROVAL_REPLY = `Security sign-off from my side. The positioning is clear and we're not overcommitting. Good to go for the AE.`;

const MESSAGE_TO_JAMES_TEXT = `Customer: ACME
Urgency: HIGH
Item: ✅ Product-approved response is ready (Jordan Lee)
Customer-ready answer:
"SCIM isn't supported today. In practice, customers solve the same onboarding/offboarding workflow with SAML + API provisioning and our certificate automation. If you tell us which IdP and target apps are in scope, we'll outline the recommended approach and what's feasible in the next 90 days."
Suggested next step: <https://drive.acme.com/drafts/ACME_SCIM_response_draft.docx|📄 Draft email response to ACME.docx>`;

/**
 * Build Block Kit for MESSAGE_TO_JAMES with a "Review reasoning" button linking to the UI.
 * @param {string} salesRoomUrl - Full URL to the Deal Space / Sales Room (e.g. https://.../sales-room?customer=ACME)
 * @returns {{ fallback: string, text: string, blocks: object[] }}
 */
export function getMessageToJamesWithButton(salesRoomUrl) {
  const fallback = 'Product-approved response ready for AE. Review reasoning in the Deal Space.';
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Customer:* ACME\n*Urgency:* HIGH\n*Item:* ✅ Product-approved response is ready (Jordan Lee)\n\n*Customer-ready answer:*\n"SCIM isn't supported today. In practice, customers solve the same onboarding/offboarding workflow with SAML + API provisioning and our certificate automation. If you tell us which IdP and target apps are in scope, we'll outline the recommended approach and what's feasible in the next 90 days."\n\n*Suggested next step:* <https://drive.acme.com/drafts/ACME_SCIM_response_draft.docx|📄 Draft email response to ACME.docx>`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Review reasoning', emoji: true },
          url: salesRoomUrl || '#',
          action_id: 'message_to_james_review',
        },
      ],
    },
  ];
  return { fallback, text: MESSAGE_TO_JAMES_TEXT, blocks };
}

/** Build Block Kit for first message to Jordan (section blocks with mrkdwn). */
function jordanFirstBlocks() {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: '*Customer:* ACME\n*Urgency:* HIGH' } },
    { type: 'section', text: { type: 'mrkdwn', text: '*Item:* Customer asked if we support SCIM provisioning (needed for automated onboarding/offboarding).' } },
    { type: 'section', text: { type: 'mrkdwn', text: "*What I've done:*\nSource found: <https://drive.acme.com/docs/Identity_Integrations_Roadmap_Q1_2026.pdf|📄 Identity Integrations Roadmap – Q1 2026.pdf> (updated Feb 12, 2026). It indicates: SCIM is not planned in H1 2026. Suggested positioning: we can still solve their outcome using SAML + API provisioning + our automation workflows.\n\n*Suggested response to AE:*\n\"We don't currently support SCIM provisioning. However, customers achieve the same automated lifecycle using SAML plus API-based provisioning and our certificate automation workflows. If you share your IdP and target apps, we'll confirm the best path for your setup.\"" } },
  ];
}

/** Slack messages keyed by id. Add blocks for richer formatting (buttons, links, etc.) as needed. */
export const slackMessages = {
  JORDAN_FIRST_QUESTION: {
    fallback: 'Feature request for ACME: SCIM provisioning – draft response for Jordan approval.',
    text: JORDAN_FIRST_TEXT,
    blocks: jordanFirstBlocks(),
  },
  JORDAN_SECOND_QUESTION: {
    fallback: 'Follow-up: recommendation and sources for SCIM positioning.',
    text: JORDAN_SECOND_TEXT,
  },
  JORDAN_ACK_FINAL: {
    fallback: 'Thanks, Jordan! Will get Dan approval.',
    text: JORDAN_ACK_TEXT,
  },
  MESSAGE_TO_JAMES: {
    fallback: 'Product-approved response ready for AE.',
    text: MESSAGE_TO_JAMES_TEXT,
  },
  FEATURE_REQUEST_TO_JORDAN_FALLBACK: {
    fallback: 'Feature request for ACME: SCIM provisioning – draft response for Jordan approval.',
  },
};

/** Task content when the task returns to Requires Attention (all approvals in). */
export const taskUpdateOnReturn = {
  TASK_WHY_IT_MATTERS_RETURNED: 'All approvals received; ready for AE to send the response to the customer.',
  TASK_WHAT_PREPARED_RETURNED: 'Draft email (Jordan and Dan approved).',
  TASK_NEEDED_FROM_YOU_RETURNED: 'Send approved respond to ACME',
};

/** Extra Demi activity log entries when SCIM task returns to Requires Attention (append to existing agentLog). */
export const AGENT_LOG_SCIM_RETURNED = [
  { time: '10:01', action: 'Routing suggestion to Product', link: 'view', source: 'Slack' },
  { time: '10:02', action: 'Approved with Product', link: 'view', source: 'Slack' },
  { time: '10:03', action: 'Routing suggestion to Security', link: 'view', source: 'Slack' },
  { time: '10:04', action: 'Approved with Security', link: 'view', source: 'Slack' },
  { time: '10:05', action: 'Routing response to AE', link: 'view', source: 'Slack' },
];

/**
 * Get Slack payload for a message key: { fallback, text?, blocks? } for postMessage/sendDM.
 * @param {string} key - e.g. 'JORDAN_FIRST_QUESTION', 'MESSAGE_TO_JAMES'
 */
export function getSlackMessage(key) {
  const msg = slackMessages[key];
  if (!msg) return { fallback: '', text: '' };
  return {
    fallback: msg.fallback || msg.text || '',
    text: msg.text,
    blocks: msg.blocks,
  };
}
