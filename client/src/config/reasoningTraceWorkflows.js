/**
 * Mock reasoning trace workflows for Demi (client-side).
 * Each step can have: message, delayMs, moveTo, status, link, source (icon key),
 * fileRef ({ segment, fileName, link }), detail (expandable), quote (for received messages).
 */

export const EMPLOYEE_RESPONSE_DELAY_MS = 16000;

export const WORKFLOWS = {
  'security-questionnaire': [
    {
      message: 'Draft owner and ETA proposal from vendor onboarding checklist',
      link: 'view',
      source: 'Drive',
      status: 'running',
      fileRef: { segment: 'vendor onboarding checklist', fileName: 'vendor_onboarding_checklist.docx', link: 'view' },
      detail: 'Pulled the vendor onboarding checklist and templates from Drive, checked similar deals for typical timelines, and drafted a proposed owner and ETA for Security sign-off.',
    },
    {
      message: 'Send to @sarah_grossman for approval',
      source: 'Slack',
      status: 'running',
      detail: 'Sent the owner and ETA proposal to Sarah via Slack DM, asking her to confirm or adjust before we loop in Nina for final sign-off.',
    },
    { message: 'Waiting for @sarah_grossman', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, source: 'Slack', status: 'waiting' },
    {
      message: 'Received approval from @sarah_grossman',
      status: 'completed',
      quote: 'Owner and ETA look good. I can take lead; ETA 03/18 works. Please get Nina’s sign-off and then we can update the tracker.',
      detail: 'Sarah approved the owner and ETA and offered to lead. Her reply suggested looping in Nina before updating the tracker.',
    },
    {
      message: 'Send to @nina_park for approval',
      source: 'Slack',
      status: 'running',
      detail: 'Forwarded the owner/ETA proposal and Sarah’s approval to Nina via Slack DM for final sign-off on vendor onboarding.',
    },
    { message: 'Waiting for @nina_park', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, source: 'Slack', status: 'waiting' },
    {
      message: 'Received approval from @nina_park',
      status: 'completed',
      quote: 'Approved. Owner and ETA are set; you can update the workspace and notify the customer.',
      detail: 'Nina confirmed sign-off. Owner and ETA are locked; ready to update the workspace and notify the customer.',
    },
    {
      message: 'Update vendor onboarding tracker in workspace',
      link: 'open source',
      source: 'Drive',
      status: 'running',
      fileRef: { segment: 'vendor onboarding tracker', fileName: 'vendor_onboarding_tracker.xlsx', link: 'open source' },
      detail: 'Updated the vendor onboarding tracker with the approved owner and ETA so the AE can share with the customer.',
    },
    {
      message: 'Owner and ETA updated; task remains under review.',
      status: 'completed',
      detail: 'All approvals are in and the tracker is updated. The task stays under review until the AE confirms with the customer.',
    },
  ],
  'discount-exception': [
    {
      message: 'Evaluate 12% exception using deal data and policy matrix',
      link: 'view',
      source: 'Salesforce',
      status: 'running',
      fileRef: { segment: 'deal data and policy matrix', fileName: 'discount_policy_matrix.xlsx', link: 'view' },
      detail: 'Loaded the opportunity and quote from Salesforce, then checked the 12% exception against the approval matrix and similar closed deals to prepare the Deal Desk packet.',
    },
    {
      message: 'Ask @DealDesk for 12% exception approval',
      source: 'Slack',
      status: 'running',
      detail: 'Reached out to Deal Desk in Slack with the deal context, 12% exception justification, and policy reference so they can approve to close.',
    },
    { message: 'Waiting for @DealDesk', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, source: 'Slack', status: 'waiting' },
    {
      message: 'Received reply from @DealDesk',
      status: 'completed',
      quote: '12% exception approved to close. Use the standard exception doc and route for final sign-off.',
      detail: 'Deal Desk approved the 12% exception. The AE can complete the exception doc and route for final sign-off.',
    },
    {
      message: 'Task remains under review.',
      status: 'completed',
      detail: '12% exception is approved by Deal Desk; the task stays under review until the AE completes the exception doc and closes.',
    },
  ],
  'rfp-questionnaire': [
    {
      message: 'Review RFP for security review requirement and draft Y/N + owner',
      link: 'view',
      source: 'Email',
      status: 'running',
      fileRef: { segment: 'RFP', fileName: 'ACME_RFP_security_section.pdf', link: 'view' },
      detail: 'Parsed the RFP for the security review clause, checked past RFPs for scope, and drafted a proposed Y/N and suggested owner for Legal/Security sign-off.',
    },
    {
      message: 'Send Y/N and owner proposal to @morgan_lee',
      source: 'Slack',
      status: 'running',
      detail: 'Shared the draft Y/N and owner proposal with Morgan (Legal) in Slack, asking to confirm whether security review is required and who should own it.',
    },
    { message: 'Waiting for Legal/Security', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, source: 'Slack', status: 'waiting' },
    {
      message: 'Legal/Security responded',
      status: 'completed',
      quote: 'Security review required (Y). Owner: Nina Park. I’ve added the scope to the tracker; we’re good to respond to procurement.',
      detail: 'Morgan confirmed security review is required, assigned Nina as owner, and updated the tracker. Ready to respond to procurement.',
    },
    {
      message: 'Update RFP response with security review Y/N and owner',
      link: 'open source',
      source: 'Drive',
      status: 'running',
      fileRef: { segment: 'RFP response', fileName: 'RFP_security_review_response.docx', link: 'open source' },
      detail: 'Updated the RFP response document with the confirmed Y/N and owner so the AE can submit to the customer.',
    },
    {
      message: 'Y/N and owner confirmed; task remains under review.',
      status: 'completed',
      detail: 'Security review required (Y) and owner are set. The task stays under review until the AE submits the response to procurement.',
    },
  ],
};
