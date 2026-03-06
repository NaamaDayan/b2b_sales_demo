/**
 * Mock reasoning trace workflows for Demi (client-side).
 * Each step can have: message, delayMs, moveTo, status, link, source (icon key).
 */

export const EMPLOYEE_RESPONSE_DELAY_MS = 16000;

export const WORKFLOWS = {
  'security-questionnaire': [
    { message: 'Draft response based on SOC2 summary and compliance checklist', link: 'view', source: 'Drive', status: 'running' },
    { message: 'Send to @sarah_grossman for approval', source: 'Slack', status: 'running' },
    { message: 'Waiting for @sarah_grossman…', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, status: 'waiting' },
    { message: 'Received approval from @sarah_grossman', status: 'completed' },
    { message: 'Send to @nina_park for approval', source: 'Slack', status: 'running' },
    { message: 'Waiting for @nina_park…', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, status: 'waiting' },
    { message: 'Received approval from @nina_park', status: 'completed' },
    { message: 'Update security questionnaire file in workspace', link: 'open source', source: 'Drive', status: 'running' },
    { message: 'Task completed.', moveTo: 'done', status: 'completed' },
  ],
  'discount-exception': [
    { message: 'Evaluate discount using deal data and policy matrix', link: 'view', source: 'Salesforce', status: 'running' },
    { message: 'Ask @DealDesk for recommendation', source: 'Slack', status: 'running' },
    { message: 'Waiting for @DealDesk…', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, status: 'waiting' },
    { message: 'Received reply from @DealDesk', status: 'completed' },
    { message: 'Task remains under review.', status: 'completed' },
  ],
  'rfp-questionnaire': [
    { message: 'Review RFP questionnaire sections from procurement email', link: 'view', source: 'Email', status: 'running' },
    { message: 'Send draft answers to Legal/Commercial', source: 'Slack', status: 'running' },
    { message: 'Waiting for Legal/Commercial…', delayMs: EMPLOYEE_RESPONSE_DELAY_MS, status: 'waiting' },
    { message: 'Legal/Commercial responded', status: 'completed' },
    { message: 'Compile final RFP response from Drive templates', link: 'open source', source: 'Drive', status: 'running' },
    { message: 'Returning task to Requires Attention so AE can submit.', moveTo: 'requiresAttention', status: 'completed' },
  ],
};
