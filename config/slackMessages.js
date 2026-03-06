/**
 * Slack message config for the Important Feature Request flow (Demi, Jordan, James).
 * Single place to edit content and add blocks, buttons, links, attachments later.
 *
 * Each Slack message can have:
 * - fallback: string (notifications/accessibility)
 * - text: string (plain or mrkdwn)
 * - blocks: array (Slack Block Kit); if present, used when posting; otherwise text is used
 */

const JORDAN_FIRST_TEXT = `*Customer:* ACME
*Urgency:* HIGH

*Item:*
Customer asked if we support SCIM provisioning (needed for automated onboarding/offboarding).

*What I've done:*
Source found: Identity Integrations Roadmap – Q1 2026 (updated Feb 12, 2026)
It indicates:
SCIM is not planned in H1 2026.
Suggested positioning:
We can still solve their outcome using SAML + API provisioning + our automation workflows.

*Suggested response to AE:*
"We don't currently support SCIM provisioning. However, customers achieve the same automated lifecycle using SAML plus API-based provisioning and our certificate automation workflows. If you share your IdP and target apps, we'll confirm the best path for your setup."`;

const JORDAN_SECOND_TEXT = `Good question.
The recommendation is based on two sources:
1. "Identity Integrations Roadmap – Q1 2026"
2. "Customer Lifecycle Automation – Technical Capabilities Overview v4.2"

From the capabilities document, the automation workflows already support:
• API-based user provisioning
• automated certificate lifecycle
• role-based onboarding triggers

This means customers can achieve automated onboarding/offboarding even without SCIM, as long as their IdP supports SAML and API access.

The suggested response is intentionally positioned around the outcome rather than the protocol, to avoid committing to SCIM specifically.`;

const JORDAN_ACK_TEXT = `Thanks, Jordan! I'll make sure Dan Tailor also approves this and let you know if there is a problem.`;

const MESSAGE_TO_JAMES_TEXT = `Customer: ACME
Urgency: HIGH
Item: ✅ Product-approved response is ready (Jordan Lee)
Customer-ready answer:
"SCIM isn't supported today. In practice, customers solve the same onboarding/offboarding workflow with SAML + API provisioning and our certificate automation. If you tell us which IdP and target apps are in scope, we'll outline the recommended approach and what's feasible in the next 90 days."
Suggested next step: Draft email response to ACME`;

/** Build Block Kit for first message to Jordan (section blocks with mrkdwn). */
function jordanFirstBlocks() {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: '*Customer:* ACME\n*Urgency:* HIGH' } },
    { type: 'section', text: { type: 'mrkdwn', text: '*Item:* Customer asked if we support SCIM provisioning (needed for automated onboarding/offboarding).' } },
    { type: 'section', text: { type: 'mrkdwn', text: "*What I've done:*\nSource found: Identity Integrations Roadmap - Q1 2026 (updated Feb 12, 2026). It indicates: SCIM is not planned in H1 2026. Suggested positioning: we can still solve their outcome using SAML + API provisioning + our automation workflows.\n\n*Suggested response to AE:*\n\"We don't currently support SCIM provisioning. However, customers achieve the same automated lifecycle using SAML plus API-based provisioning and our certificate automation workflows. If you share your IdP and target apps, we'll confirm the best path for your setup.\"" } },
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
  TASK_NEEDED_FROM_YOU_RETURNED: 'Send the email to the customer.',
};

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
