/**
 * Single source of truth for task attributes: sources (via agentLog), title, labels, urgency,
 * neededFromYou, assign to (validators), eta, Demi activity log (agentLog).
 * Each task has workflowId. Trajectory (which tab it moves to) is implied by workflow steps (moveTo)
 * and for Important Feature Request by server response (moveTo + taskUpdate).
 */

const commonTaskShape = (overrides) => ({
  whyItMatters: '',
  whatPrepared: '',
  neededFromYou: '',
  dealRiskReason: '',
  validators: [],
  eta: '',
  track: '',
  ...overrides,
});

/** Tasks that appear in Requires Attention tab initially. */
export const REQUIRES_ATTENTION_TASKS = [
  commonTaskShape({
    id: 'att1',
    title: 'Identify customer vendor onboarding owner and confirm next step + ETA',
    labels: ['Legal'],
    urgency: 'High',
    dealRiskReason: 'High — no owner or ETA for vendor onboarding; customer is waiting on completion.',
    whyItMatters: 'Vendor onboarding must have a clear owner and ETA to meet customer commitments.',
    whatPrepared: 'Vendor onboarding checklist + draft owner/ETA proposal',
    neededFromYou: 'Email customer to identify owner and confirm ETA',
    validators: ['James Gordon'],
    eta: '03/18/2026',
    workflowId: 'security-questionnaire',
    track: 'closing ops',
    agentLog: [
      { time: '09:02', action: 'Pulled opportunity and vendor requirements from Salesforce', link: 'view', source: 'Salesforce' },
      { time: '09:03', action: 'Retrieved vendor onboarding checklist and templates from Drive', link: 'open source', source: 'Drive' },
      { time: '09:04', action: 'Checked similar deals for typical onboarding timeline', link: 'view', source: 'Salesforce' },
      { time: '09:05', action: 'Drafted owner assignment and ETA proposal for sign-off', link: 'view' },
    ],
  }),
  commonTaskShape({
    id: 'att2',
    title: 'Discount exception approval (12% to close)',
    labels: ['Deal Desk'],
    urgency: 'High',
    dealRiskReason: '12% exception is required to close; Deal Desk has not approved in 10 days.',
    whyItMatters: 'Deal blocker: 12% discount exception must be approved to close.',
    whatPrepared: 'Deal Desk packet with 12% exception justification',
    neededFromYou: 'Route to Deal Desk for approval',
    validators: ['@eli_jones'],
    eta: '03/20/2026',
    workflowId: 'discount-exception',
    track: 'Commercials',
    agentLog: [
      { time: '09:12', action: 'Pulled opportunity and quote data from Salesforce', link: 'view', source: 'Salesforce' },
      { time: '09:13', action: 'Checked discount policy and 12% exception criteria', link: 'open source', source: 'Drive' },
      { time: '09:14', action: 'Compared to similar closed deals with exception', link: 'view', source: 'Salesforce' },
      { time: '09:15', action: 'Assembled Deal Desk packet for 12% exception approval', link: 'view' },
    ],
  }),
  commonTaskShape({
    id: 'att3',
    title: 'Confirm security review passed after materials were submitted',
    labels: ['Security'],
    urgency: 'Medium',
    dealRiskReason: 'Security review outcome not yet confirmed after materials were submitted.',
    whyItMatters: 'Procurement needs confirmation that security review passed.',
    whatPrepared: 'RFP security review section + materials submitted',
    neededFromYou: 'Follow up with customer',
    validators: ['James Gordon'],
    eta: '03/15/2026',
    workflowId: 'rfp-questionnaire',
    track: 'closing ops',
    agentLog: [
      { time: '09:22', action: 'Pulled opportunity and RFP details from Salesforce', link: 'view', source: 'Salesforce' },
      { time: '09:23', action: 'Parsed RFP for security review requirements', link: 'view', source: 'Email' },
      { time: '09:24', action: 'Checked past RFPs for security review scope', link: 'open source', source: 'Drive' },
      { time: '09:25', action: 'Drafted Y/N and suggested owner for security review', link: 'view', source: 'Drive' },
      { time: '09:26', action: 'Prepared request for Legal/Security sign-off', link: 'view' },
    ],
  }),
  commonTaskShape({
    id: 'att4',
    title: 'Customer request: SCIM provisioning support',
    labels: ['Product'],
    urgency: 'High',
    whyItMatters: 'Customer ask; need Product input.',
    whatPrepared: 'Summary + routing request',
    neededFromYou: 'Route to Product Owner',
    validators: ['@jordan_lee'],
    eta: '03/16/2026',
    workflowId: 'important-feature-request',
    track: 'unclassified',
    agentLog: [
      { time: '09:32', action: 'Pulled opportunity data from Salesforce', link: 'view', source: 'Salesforce' },
      { time: '09:33', action: 'Analyzed last Gong call transcript', link: 'view', source: 'Gong' },
      { time: '09:34', action: 'Compared roadmap document versions', link: 'open source', source: 'Drive' },
      { time: '09:35', action: 'Extracted open validation points from SE workshop notes', link: 'view', source: 'Drive' },
      { time: '09:36', action: 'Generated summary and prepared routing request for Product', link: 'view' },
    ],
  }),
];

/** Under Control starts empty. */
export const UNDER_CONTROL_INITIAL = [];

/** Done-tab tasks. Same shape; unnecessary columns can be empty for display. */
export const DONE_TASKS = [
  commonTaskShape({ id: 'done1', title: 'POC success criteria met', labels: ['Product'], track: 'validation', whyItMatters: 'Gate for technical sign-off.', whatPrepared: 'Success criteria doc + demo script.', neededFromYou: '—', validators: ['@jordan_lee', '@sarah_grossman'], eta: '02/10/2026', agentLog: [{ time: '09:02', action: 'Pulled opportunity data from Salesforce', link: 'view', source: 'Salesforce' }, { time: '09:03', action: 'Analyzed last Gong call transcript', link: 'view', source: 'Gong' }, { time: '09:04', action: 'Compared POC criteria document versions', link: 'open source', source: 'Drive' }, { time: '09:05', action: 'Extracted open validation points from SE workshop notes', link: 'view', source: 'Drive' }, { time: '09:06', action: 'Generated final success criteria and prepared sign-off checklist', link: 'view' }] }),
  commonTaskShape({ id: 'done2', title: 'SE workshop completed', labels: ['Product'], track: 'validation', whyItMatters: 'Required for solution alignment.', whatPrepared: 'Workshop deck + hands-on lab.', neededFromYou: '—', validators: ['@jordan_lee'], eta: '02/14/2026', agentLog: [{ time: '10:01', action: 'Pulled opportunity and contacts from Salesforce', link: 'view', source: 'Salesforce' }, { time: '10:02', action: 'Retrieved workshop template and lab from Drive', link: 'open source', source: 'Drive' }, { time: '10:03', action: 'Generated customized deck and hands-on lab', link: 'view' }] }),
  commonTaskShape({ id: 'done3', title: 'SOC2 + trust artifacts shared', labels: ['Security'], track: 'validation', whyItMatters: 'Security review prerequisite.', whatPrepared: 'SOC2 report, DPA summary, trust center link.', neededFromYou: '—', validators: ['@nina_park'], eta: '02/18/2026', agentLog: [{ time: '10:11', action: 'Located SOC2 and DPA in trust repository', link: 'open source', source: 'Drive' }, { time: '10:12', action: 'Compiled trust center link and summary', link: 'view' }] }),
  commonTaskShape({ id: 'done4', title: 'Pricing package drafted', labels: ['Commercial'], track: 'Commercials', whyItMatters: 'Needed for commercial discussion.', whatPrepared: 'Quote, discount memo, T&Cs summary.', neededFromYou: '—', validators: ['@eli_jones'], eta: '02/20/2026', agentLog: [{ time: '10:21', action: 'Pulled deal and products from Salesforce', link: 'view', source: 'Salesforce' }, { time: '10:22', action: 'Retrieved T&Cs and discount memo template', link: 'open source', source: 'Drive' }, { time: '10:23', action: 'Generated quote and package', link: 'view' }] }),
  commonTaskShape({ id: 'done5', title: 'Buyer map captured', labels: ['Stakeholders'], track: 'decision path', whyItMatters: 'Stakeholder alignment and champion identification.', whatPrepared: 'Org chart + roles and influence.', neededFromYou: '—', validators: [], eta: '02/05/2026', agentLog: [{ time: '08:45', action: 'Pulled contacts and roles from Salesforce', link: 'view', source: 'Salesforce' }, { time: '08:46', action: 'Extracted influence from email thread', link: 'view', source: 'Email' }, { time: '08:47', action: 'Generated org chart and buyer map', link: 'view' }] }),
  commonTaskShape({ id: 'done6', title: 'Mutual action plan drafted', labels: ['Product'], track: 'decision path', whyItMatters: 'Shared timeline to close.', whatPrepared: 'Joint action plan with milestones.', neededFromYou: '—', validators: ['@jordan_lee'], eta: '02/22/2026', agentLog: [{ time: '10:31', action: 'Pulled opportunity timeline from Salesforce', link: 'view', source: 'Salesforce' }, { time: '10:32', action: 'Reviewed workshop and call notes', link: 'view', source: 'Gong' }, { time: '10:33', action: 'Generated joint action plan with milestones', link: 'view' }] }),
  commonTaskShape({ id: 'done7', title: 'RFP response submitted', labels: ['Legal', 'Commercial'], track: 'validation', whyItMatters: 'Formal response to procurement.', whatPrepared: 'Full RFP response + attachments.', neededFromYou: '—', validators: ['@morgan_lee'], eta: '03/01/2026', agentLog: [{ time: '11:01', action: 'Parsed RFP from email', link: 'view', source: 'Email' }, { time: '11:02', action: 'Pulled past RFP responses from Drive', link: 'open source', source: 'Drive' }, { time: '11:03', action: 'Compiled full response and attachments', link: 'view' }] }),
  commonTaskShape({ id: 'done8', title: 'Vendor form sent to customer', labels: ['Commercial'], track: 'closing ops', whyItMatters: 'Customer onboarding requirement.', whatPrepared: 'Vendor registration pack + W-9.', neededFromYou: '—', validators: [], eta: '02/28/2026', agentLog: [{ time: '10:41', action: 'Retrieved vendor pack and W-9 from Drive', link: 'open source', source: 'Drive' }, { time: '10:42', action: 'Prepared pack for customer and sent', link: 'view' }] }),
  commonTaskShape({ id: 'done9', title: 'Technical review scheduled', labels: ['Product', 'Security'], track: 'validation', whyItMatters: 'IT validation before close.', whatPrepared: 'Agenda + technical checklist.', neededFromYou: '—', validators: ['@sarah_grossman'], eta: '03/05/2026', agentLog: [{ time: '11:11', action: 'Pulled opportunity and technical contacts', link: 'view', source: 'Salesforce' }, { time: '11:12', action: 'Retrieved technical checklist from Drive', link: 'open source', source: 'Drive' }, { time: '11:13', action: 'Generated agenda and scheduled review', link: 'view' }] }),
  commonTaskShape({ id: 'done10', title: 'Contract terms agreed', labels: ['Legal'], track: 'decision path', whyItMatters: 'Legal close blocker.', whatPrepared: 'Redline comparison + term sheet.', neededFromYou: '—', validators: ['@maya_smith'], eta: '03/08/2026', agentLog: [{ time: '11:21', action: 'Retrieved redline and term sheet from Drive', link: 'open source', source: 'Drive' }, { time: '11:22', action: 'Extracted agreed terms from email thread', link: 'view', source: 'Email' }, { time: '11:23', action: 'Updated comparison and term sheet', link: 'view' }] }),
  commonTaskShape({ id: 'done11', title: 'Stakeholder intro to CISO', labels: ['Security', 'Stakeholders'], track: 'validation', whyItMatters: 'Security sign-off from CISO.', whatPrepared: 'Intro email + security one-pager.', neededFromYou: '—', validators: ['@nina_park'], eta: '02/25/2026', agentLog: [{ time: '10:51', action: 'Pulled CISO and champion from Salesforce', link: 'view', source: 'Salesforce' }, { time: '10:52', action: 'Retrieved security one-pager from Drive', link: 'open source', source: 'Drive' }, { time: '10:53', action: 'Drafted intro email', link: 'view' }] }),
  commonTaskShape({ id: 'done12', title: 'QBR deck sent', labels: ['Commercial'], track: 'Commercials', whyItMatters: 'Executive alignment on value.', whatPrepared: 'QBR deck with metrics and roadmap.', neededFromYou: '—', validators: [], eta: '02/12/2026', agentLog: [{ time: '09:41', action: 'Pulled deal and usage from Salesforce', link: 'view', source: 'Salesforce' }, { time: '09:42', action: 'Retrieved QBR template from Drive', link: 'open source', source: 'Drive' }, { time: '09:43', action: 'Generated deck and sent', link: 'view' }] }),
  commonTaskShape({ id: 'done13', title: 'Pricing approval received', labels: ['Commercial'], track: 'Commercials', whyItMatters: 'Deal Desk sign-off for discount.', whatPrepared: 'Approval trail + final quote.', neededFromYou: '—', validators: ['@eli_jones'], eta: '03/10/2026', agentLog: [{ time: '11:31', action: 'Pulled approval trail from Salesforce', link: 'view', source: 'Salesforce' }, { time: '11:32', action: 'Retrieved final quote from Drive', link: 'open source', source: 'Drive' }] }),
  commonTaskShape({ id: 'done14', title: 'DPA redline review completed', labels: ['Legal'], track: 'decision path', whyItMatters: 'Data protection terms agreed.', whatPrepared: 'DPA redlines + negotiation notes.', neededFromYou: '—', validators: ['@maya_smith'], eta: '03/12/2026', agentLog: [{ time: '11:41', action: 'Retrieved DPA redlines from Drive', link: 'open source', source: 'Drive' }, { time: '11:42', action: 'Extracted agreement points from email', link: 'view', source: 'Email' }, { time: '11:43', action: 'Updated negotiation notes', link: 'view' }] }),
  commonTaskShape({ id: 'done15', title: 'Final proposal sent', labels: ['Commercial'], track: 'closing ops', whyItMatters: 'Customer has full package to sign.', whatPrepared: 'Proposal, SOW, order form.', neededFromYou: '—', validators: [], eta: '03/15/2026', agentLog: [{ time: '11:51', action: 'Pulled proposal and SOW from Drive', link: 'open source', source: 'Drive' }, { time: '11:52', action: 'Generated order form and sent package', link: 'view' }] }),
  commonTaskShape({ id: 'done16', title: 'Kickoff date confirmed', labels: ['Product'], track: 'closing ops', whyItMatters: 'Implementation timeline locked.', whatPrepared: 'Kickoff invite + project plan draft.', neededFromYou: '—', validators: ['@jordan_lee'], eta: '03/28/2026', agentLog: [{ time: '14:01', action: 'Pulled opportunity and CSM from Salesforce', link: 'view', source: 'Salesforce' }, { time: '14:02', action: 'Retrieved project plan template from Drive', link: 'open source', source: 'Drive' }, { time: '14:03', action: 'Generated kickoff invite and plan draft', link: 'view' }] }),
];
