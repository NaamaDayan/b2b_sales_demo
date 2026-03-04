/**
 * Initial task data for Sales Room.
 * Requires Attention: 4 tasks. Under Control: empty. Done: 16 tasks.
 * Validators use full names. Labels = organizational section (e.g. Legal, Security).
 */

export const REQUIRES_ATTENTION_INITIAL = [
  {
    id: 'att1',
    title: 'Security questionnaire sign-off',
    labels: ['Security'],
    whyItMatters: 'Required for enterprise compliance.',
    whatPrepared: 'Draft answers + SOC2 artifacts',
    neededFromYou: 'Approve routing to Security',
    validators: ['Sarah Chen', 'Nina Park'],
    eta: '03/18/2026',
    workflowId: 'security-questionnaire',
  },
  {
    id: 'att2',
    title: 'Discount exception approval',
    labels: ['Commercial'],
    whyItMatters: 'Deal blocker if not approved by close.',
    whatPrepared: 'Deal Desk packet',
    neededFromYou: 'Approve routing to Deal Desk',
    validators: ['Eli Jones'],
    eta: '03/20/2026',
    workflowId: 'discount-exception',
  },
  {
    id: 'att3',
    title: 'Customer scope: SCIM provisioning?',
    labels: ['Product'],
    whyItMatters: 'Decision driver for the buyer.',
    whatPrepared: 'Draft response + Roadmap ref (Feb 12, 2026). SCIM not H1; alternatives: SAML + API.',
    neededFromYou: 'Approve routing to Product',
    validators: ['Jordan Lee'],
    eta: '03/15/2026',
    workflowId: 'scim-provisioning',
  },
  {
    id: 'att4',
    title: 'Important Feature Request',
    labels: ['Product', 'Security'],
    whyItMatters: 'Customer ask; need Product input.',
    whatPrepared: 'Summary + routing request',
    neededFromYou: 'Approve routing to Product',
    validators: ['Jordan Lee'],
    eta: '03/16/2026',
    workflowId: 'important-feature-request',
  },
];

export const UNDER_CONTROL_INITIAL = [];

export const DONE_INITIAL = [
  { id: 'done1', title: 'POC success criteria met', labels: ['Product'], whyItMatters: 'Gate for technical sign-off.', whatPrepared: 'Success criteria doc + demo script.', neededFromYou: '—', validators: ['Jordan Lee', 'Sarah Chen'], eta: '02/10/2026' },
  { id: 'done2', title: 'SE workshop completed', labels: ['Product'], whyItMatters: 'Required for solution alignment.', whatPrepared: 'Workshop deck + hands-on lab.', neededFromYou: '—', validators: ['Jordan Lee'], eta: '02/14/2026' },
  { id: 'done3', title: 'SOC2 + trust artifacts shared', labels: ['Security'], whyItMatters: 'Security review prerequisite.', whatPrepared: 'SOC2 report, DPA summary, trust center link.', neededFromYou: '—', validators: ['Nina Park'], eta: '02/18/2026' },
  { id: 'done4', title: 'Pricing package drafted', labels: ['Commercial'], whyItMatters: 'Needed for commercial discussion.', whatPrepared: 'Quote, discount memo, T&Cs summary.', neededFromYou: '—', validators: ['Eli Jones'], eta: '02/20/2026' },
  { id: 'done5', title: 'Buyer map captured', labels: ['Stakeholders'], whyItMatters: 'Stakeholder alignment and champion identification.', whatPrepared: 'Org chart + roles and influence.', neededFromYou: '—', validators: [], eta: '02/05/2026' },
  { id: 'done6', title: 'Mutual action plan drafted', labels: ['Product'], whyItMatters: 'Shared timeline to close.', whatPrepared: 'Joint action plan with milestones.', neededFromYou: '—', validators: ['Jordan Lee'], eta: '02/22/2026' },
  { id: 'done7', title: 'RFP response submitted', labels: ['Legal', 'Commercial'], whyItMatters: 'Formal response to procurement.', whatPrepared: 'Full RFP response + attachments.', neededFromYou: '—', validators: ['Product Manager'], eta: '03/01/2026' },
  { id: 'done8', title: 'Vendor form sent to customer', labels: ['Commercial'], whyItMatters: 'Customer onboarding requirement.', whatPrepared: 'Vendor registration pack + W-9.', neededFromYou: '—', validators: [], eta: '02/28/2026' },
  { id: 'done9', title: 'Technical review scheduled', labels: ['Product', 'Security'], whyItMatters: 'IT validation before close.', whatPrepared: 'Agenda + technical checklist.', neededFromYou: '—', validators: ['Sarah Chen'], eta: '03/05/2026' },
  { id: 'done10', title: 'Contract terms agreed', labels: ['Legal'], whyItMatters: 'Legal close blocker.', whatPrepared: 'Redline comparison + term sheet.', neededFromYou: '—', validators: ['Maya Smith'], eta: '03/08/2026' },
  { id: 'done11', title: 'Stakeholder intro to CISO', labels: ['Security', 'Stakeholders'], whyItMatters: 'Security sign-off from CISO.', whatPrepared: 'Intro email + security one-pager.', neededFromYou: '—', validators: ['Nina Park'], eta: '02/25/2026' },
  { id: 'done12', title: 'QBR deck sent', labels: ['Commercial'], whyItMatters: 'Executive alignment on value.', whatPrepared: 'QBR deck with metrics and roadmap.', neededFromYou: '—', validators: [], eta: '02/12/2026' },
  { id: 'done13', title: 'Pricing approval received', labels: ['Commercial'], whyItMatters: 'Deal Desk sign-off for discount.', whatPrepared: 'Approval trail + final quote.', neededFromYou: '—', validators: ['Eli Jones'], eta: '03/10/2026' },
  { id: 'done14', title: 'DPA redline review completed', labels: ['Legal'], whyItMatters: 'Data protection terms agreed.', whatPrepared: 'DPA redlines + negotiation notes.', neededFromYou: '—', validators: ['Maya Smith'], eta: '03/12/2026' },
  { id: 'done15', title: 'Final proposal sent', labels: ['Commercial'], whyItMatters: 'Customer has full package to sign.', whatPrepared: 'Proposal, SOW, order form.', neededFromYou: '—', validators: [], eta: '03/15/2026' },
  { id: 'done16', title: 'Kickoff date confirmed', labels: ['Product'], whyItMatters: 'Implementation timeline locked.', whatPrepared: 'Kickoff invite + project plan draft.', neededFromYou: '—', validators: ['Jordan Lee'], eta: '03/28/2026' },
];
