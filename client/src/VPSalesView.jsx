/**
 * VP Sales: React sales pipeline dashboard — two-panel layout, risk signals, recommended actions.
 * Styled to match AE Deal Space (light theme, CSS variables, App.css).
 */

import React, { useState, useMemo, useEffect } from 'react';
import DealChatModal from './components/DealChatModal';
import './App.css';

const DEALS = [
  {
    id: '1',
    name: 'Northgate Health',
    rep: 'James Gordon',
    value: 420,
    stage: 'Negotiation',
    riskLevel: 'HIGH',
    trend: 'declining',
    trendNote: 'Champion went silent after legal raised red flags on liability clause.',
    daysSinceContact: 16,
    description: 'Northgate Health is in late-stage negotiation but has stalled. The Economic Buyer has not joined any call since Discovery, and Legal requested a competitor contract copy over a week ago with no response from our side. The target close has slipped twice in the last three weeks. Technical validation with IT is complete, but without Legal and executive engagement the deal is at serious risk of being deprioritized or lost to the competitor they are evaluating.',
    signals: [
      { type: 'danger', icon: '⚠️', text: 'Economic Buyer hasn\'t joined any call since Discovery.', explanation: { howWeGotHere: 'Call attendance was cross-referenced across calendar invites and meeting notes. The Economic Buyer (Sarah Chen, VP Operations) was invited to 4 calls since Discovery but has no join records.', dataSources: ['Calendar (Outlook)', 'Gong meeting attendance', 'Salesforce activity log'], contradicting: 'CRM shows "Executive aligned" and last activity "Stakeholder sync" with no distinction between champion and Economic Buyer.' } },
      { type: 'danger', icon: '📄', text: 'Legal requested competitor contract copy 6 days ago — no response from us yet.', explanation: { howWeGotHere: 'Email thread with Northgate Legal (Mar 2) requested a redline comparison; internal send-to-legal task has no completion date and no owner assigned.', dataSources: ['Email (thread with Northgate Legal)', 'Internal task queue', 'Salesforce opportunity notes'], contradicting: 'AE note on Mar 3 says "Legal looped in, we\'re good" with no follow-up logged.' } },
      { type: 'warning', icon: '📅', text: 'Target close date slipped twice in the last 3 weeks.', explanation: { howWeGotHere: 'Opportunity close date in Salesforce was 2026-04-10, then 2026-04-18; both updates lack a reason code or customer confirmation.', dataSources: ['Salesforce opportunity (Close Date field history)', 'No customer-facing date in last email'], contradicting: 'Deal forecast remains "Best Case" with no commentary on slip.' } },
      { type: 'positive', icon: '✅', text: 'Technical validation with IT completed and signed off.', explanation: { howWeGotHere: 'IT lead (James Wong) sent signed success criteria doc on Feb 28; attached to opportunity.', dataSources: ['Email attachment (signed PDF)', 'Salesforce Files'], contradicting: null } },
    ],
  },
  {
    id: '2',
    name: 'ACME — Enterprise TLS Automation',
    rep: 'James Gordon',
    value: 280,
    stage: 'Negotiation',
    riskLevel: 'HIGH',
    trend: 'declining',
    trendNote: 'Multiple execution blockers; target close 03/28/26 at risk.',
    daysSinceContact: 5,
    description: 'ACME Enterprise TLS Automation is in Negotiation with a Commit forecast and target close 03/28/26, but execution status is AT RISK. Two risks remain: vendor onboarding has no identified owner or ETA and the customer is waiting on completion; and the security review outcome has not been confirmed after materials were submitted. Until these are addressed, the deal is at risk of slip.',
    signals: [
      { type: 'danger', icon: '📋', text: 'No owner or ETA for vendor onboarding; customer is waiting on completion.', explanation: { howWeGotHere: 'Vendor onboarding checklist was sent; no owner or ETA was ever assigned in our systems. Customer follow-up email (Mar 4) asks for "point of contact and timeline."', dataSources: ['Vendor onboarding checklist (Drive)', 'Customer email Mar 4', 'Salesforce — no owner/ETA fields populated'], contradicting: 'AE last note (Mar 3): "Onboarding in progress" with no owner or date.' } },
      { type: 'warning', icon: '🔒', text: 'Security review outcome not yet confirmed after materials were submitted.', explanation: { howWeGotHere: 'RFP security section and materials were submitted per activity log; no confirmation from customer or procurement that review passed. Follow-up sent Mar 1 with no reply.', dataSources: ['RFP response (submitted Feb 28)', 'Activity log (materials submitted)', 'Email (follow-up Mar 1, no response)'], contradicting: 'CRM shows "Security review complete" with no supporting artifact or customer confirmation.' } },
      { type: 'danger', icon: '💬', text: 'AE reported everything on track; execution data shows unaddressed blockers.', explanation: { howWeGotHere: 'Comparison of AE’s stated view in Slack vs. execution and CRM data.', dataSources: ['Slack #acme-deal channel', 'Salesforce opportunity and tasks', 'Vendor portal and email'], aeSlackQuote: 'James Gordon (AE) to manager, Mar 5: "ACME is looking good — everything is on track for 03/28. Vendor stuff and security are in hand, no blockers on our side."', contradictingData: 'Vendor onboarding: no owner or ETA assigned; customer explicitly asked for point of contact and timeline (Mar 4). Security review: materials submitted but no confirmation from customer that review passed; follow-up unanswered. CRM shows both items as complete with no evidence.' } },
    ],
  },
  {
    id: '3',
    name: 'Summit Retail',
    rep: 'Alex Rivera',
    value: 195,
    stage: 'Proposal',
    riskLevel: 'HIGH',
    trend: 'stable',
    trendNote: 'No movement; champion on PTO until next week.',
    daysSinceContact: 9,
    description: 'Summit Retail is in Proposal stage with high risk. A competitor was brought into a last-minute bake-off without our knowledge, and our proposal has been with the customer for nine days with no read receipt or reply. The demo with the Economic Buyer has been rescheduled three times. The champion remains responsive in Slack and supportive, but the lack of executive engagement and the presence of a competitor create a real risk of no decision or a delayed loss.',
    signals: [
      { type: 'danger', icon: '📉', text: 'Competitor brought in for a last-minute bake-off we weren\'t told about.', explanation: { howWeGotHere: 'Champion mentioned "evaluation with another vendor" in a Slack DM (Mar 6); no prior mention in deal notes or calls.', dataSources: ['Slack DM with champion', 'Gong — no competitor mentioned in last 3 calls'], contradicting: 'AE forecast note: "No known competition."' } },
      { type: 'warning', icon: '📧', text: 'Proposal sent 9 days ago — no read receipt or reply.', explanation: { howWeGotHere: 'Proposal email sent Mar 1; tracking shows not opened. No reply or meeting request since.', dataSources: ['Email (proposal send)', 'Open/reply tracking'], contradicting: 'CRM next step: "Await proposal feedback" with no escalation.' } },
      { type: 'warning', icon: '🗓️', text: 'Demo with Economic Buyer was rescheduled 3 times.', explanation: { howWeGotHere: 'Calendar and Salesforce show three reschedules (Feb 20, Feb 27, Mar 5); reason each time "scheduling conflict."', dataSources: ['Calendar invites', 'Salesforce activity'], contradicting: 'Deal stage still "Proposal" with no risk flag for executive no-show.' } },
      { type: 'positive', icon: '💬', text: 'Champion still responsive in Slack and supportive.', explanation: { howWeGotHere: 'Champion replied to AE within 2 hours on last two Slack messages; tone positive and willing to "push internally."', dataSources: ['Slack thread'], contradicting: null } },
    ],
  },
  {
    id: '4',
    name: 'BluePeak Systems',
    rep: 'James Gordon',
    value: 310,
    stage: 'Negotiation',
    riskLevel: 'MEDIUM',
    trend: 'improving',
    trendNote: 'Legal call scheduled; pricing agreed in principle.',
    daysSinceContact: 4,
    description: 'BluePeak Systems is in Negotiation with commercial terms agreed in principle and a legal call scheduled. MSA redlines have been with legal for two weeks. Sponsor engagement is strong with a weekly exec sync. Risk is moderate: momentum is positive but legal closure needs to be confirmed to avoid slip.',
    signals: [
      { type: 'warning', icon: '📝', text: 'MSA redlines still with legal — 2 weeks in review.', explanation: { howWeGotHere: 'Redline sent to legal Feb 24; status still "In review" in contract tracker with no target date.', dataSources: ['Contract tracker (internal)', 'Email to legal Feb 24'], contradicting: 'AE note: "Legal wrapping up" with no date.' } },
      { type: 'positive', icon: '📞', text: 'Weekly exec sync with sponsor; consistent engagement.', explanation: { howWeGotHere: 'Recurring meeting with sponsor (VP Eng) held last 3 weeks; notes show agenda and outcomes.', dataSources: ['Calendar', 'Meeting notes (Drive)'], contradicting: null } },
      { type: 'positive', icon: '💰', text: 'Commercial terms agreed; only legal and signature left.', explanation: { howWeGotHere: 'Pricing and discount approved per email from sponsor Feb 28; documented in opportunity.', dataSources: ['Email', 'Salesforce opportunity'], contradicting: null } },
    ],
  },
  {
    id: '5',
    name: 'DeltaGrid',
    rep: 'Sam Chen',
    value: 180,
    stage: 'Demo',
    riskLevel: 'MEDIUM',
    trend: 'stable',
    trendNote: 'Second demo completed; waiting on internal debrief.',
    daysSinceContact: 6,
    description: 'DeltaGrid completed a second demo with good stakeholder attendance and Q&A, but the decision committee has not met in two weeks. Next step is an internal alignment meeting in five days. Status is stable but at risk of delay if the committee does not reconvene and move to proposal stage.',
    signals: [
      { type: 'warning', icon: '⏳', text: 'Decision committee hasn\'t met in 2 weeks.', explanation: { howWeGotHere: 'Champion said committee meets biweekly; last meeting was Feb 24. No meeting logged since.', dataSources: ['Gong (champion mention)', 'No calendar or note for committee meeting'], contradicting: 'Next step in CRM: "Committee decision" with no date.' } },
      { type: 'positive', icon: '🎯', text: 'All key stakeholders attended Demo 2; good Q&A.', explanation: { howWeGotHere: 'Demo 2 attendance list and Gong show 5 stakeholders; Q&A section had 8 questions with answers.', dataSources: ['Gong recording', 'Attendance list'], contradicting: null } },
      { type: 'positive', icon: '📌', text: 'Next step: internal alignment meeting in 5 days.', explanation: { howWeGotHere: 'Champion committed to internal alignment meeting and to revert with date; noted in call summary.', dataSources: ['Call summary Mar 2', 'Champion email'], contradicting: null } },
    ],
  },
  {
    id: '6',
    name: 'Orion Foods',
    rep: 'Alex Rivera',
    value: 245,
    stage: 'Proposal',
    riskLevel: 'MEDIUM',
    trend: 'improving',
    trendNote: 'Champion shared internal timeline; proposal under review.',
    daysSinceContact: 3,
    description: 'Orion Foods has the proposal under internal review and the champion shared their timeline and forwarded the proposal to the CFO with a positive note. ROI was validated by their finance team. Q2 budget approval for new initiatives is still pending, which is the main remaining risk before we can expect a decision.',
    signals: [
      { type: 'warning', icon: '📅', text: 'Q2 budget approval still pending for new initiatives.', explanation: { howWeGotHere: 'Champion stated budget is "Q2 new initiatives" bucket and approval not yet on calendar.', dataSources: ['Gong call Mar 1', 'Champion Slack'], contradicting: 'Forecast set to "Commit" with no budget gate noted.' } },
      { type: 'positive', icon: '👍', text: 'Champion forwarded our proposal to CFO with a positive note.', explanation: { howWeGotHere: 'Champion shared forward email (Mar 2) to CFO with one-line endorsement; AE copied.', dataSources: ['Email (forward)'], contradicting: null } },
      { type: 'positive', icon: '📊', text: 'ROI model validated by their finance team.', explanation: { howWeGotHere: 'Finance contact confirmed ROI assumptions in short call Mar 1; noted in opportunity.', dataSources: ['Call note', 'Salesforce'], contradicting: null } },
    ],
  },
  {
    id: '7',
    name: 'BrightWave',
    rep: 'James Gordon',
    value: 165,
    stage: 'Commit',
    riskLevel: 'LOW',
    trend: 'improving',
    trendNote: 'Contract sent to legal; signature expected this week.',
    daysSinceContact: 2,
    description: 'BrightWave is in Commit with contract in legal review and no material pushback. The sponsor has confirmed intent to sign by Friday and all commercial and legal terms are agreed. Risk is low; the deal is on track to close this week.',
    signals: [
      { type: 'positive', icon: '✍️', text: 'Contract in legal review; no material pushback.', explanation: { howWeGotHere: 'Contract sent to customer legal Mar 4; their legal replied same day with "no material changes, back to you by EOW."', dataSources: ['Email thread', 'Contract tracker'], contradicting: null } },
      { type: 'positive', icon: '📞', text: 'Sponsor confirmed intent to sign by Friday.', explanation: { howWeGotHere: 'Sponsor said on call Mar 5: "We\'ll sign by Friday if legal doesn\'t throw a curveball."', dataSources: ['Gong Mar 5'], contradicting: null } },
      { type: 'positive', icon: '✅', text: 'All commercial and legal terms agreed.', explanation: { howWeGotHere: 'Term sheet signed; redlines reconciled per email trail.', dataSources: ['Term sheet', 'Email'], contradicting: null } },
    ],
  },
  {
    id: '8',
    name: 'RedCrest',
    rep: 'Sam Chen',
    value: 220,
    stage: 'Demo',
    riskLevel: 'LOW',
    trend: 'stable',
    trendNote: 'On track; next demo with VP Ops scheduled.',
    daysSinceContact: 5,
    description: 'RedCrest is in Demo stage with a clear decision process and timeline from the champion. Technical fit is confirmed and we are expanding to business stakeholders. No competitors are in the loop. Risk is low and the deal is on track.',
    signals: [
      { type: 'positive', icon: '📅', text: 'Clear decision process and timeline from champion.', explanation: { howWeGotHere: 'Champion shared internal slide with stages and target dates; next gate is VP Ops demo.', dataSources: ['Shared deck', 'Gong'], contradicting: null } },
      { type: 'positive', icon: '🎯', text: 'Technical fit confirmed; expanding to business stakeholders.', explanation: { howWeGotHere: 'IT sign-off captured in doc; champion listed 3 business stakeholders for next demo.', dataSources: ['Technical sign-off', 'Email'], contradicting: null } },
      { type: 'positive', icon: '🤝', text: 'No competitors in the loop per champion.', explanation: { howWeGotHere: 'Champion stated in call: "Just you guys for this use case."', dataSources: ['Gong'], contradicting: null } },
    ],
  },
  {
    id: '9',
    name: 'Luma Financial',
    rep: 'Alex Rivera',
    value: 390,
    stage: 'Negotiation',
    riskLevel: 'LOW',
    trend: 'improving',
    trendNote: 'Final pricing call completed; moving to legal.',
    daysSinceContact: 1,
    description: 'Luma Financial is in late Negotiation with pricing and discount approved by the budget holder. Standard MSA is with their legal and we have daily contact with the champion. Risk is low and momentum is strong; we are one legal pass away from signature.',
    signals: [
      { type: 'positive', icon: '💰', text: 'Pricing and discount approved by budget holder.', explanation: { howWeGotHere: 'Budget holder (CFO delegate) sent approval email Mar 6; discount within policy.', dataSources: ['Email', 'Quote'], contradicting: null } },
      { type: 'positive', icon: '📋', text: 'Standard MSA; their legal has our template.', explanation: { howWeGotHere: 'Customer legal confirmed they use our standard MSA; no custom terms requested.', dataSources: ['Email with legal', 'Contract tracker'], contradicting: null } },
      { type: 'positive', icon: '📞', text: 'Daily contact with champion; strong relationship.', explanation: { howWeGotHere: 'Slack and email show daily touchpoints over last 5 days; champion responsive.', dataSources: ['Slack', 'Email'], contradicting: null } },
    ],
  },
  {
    id: '10',
    name: 'Meridian Tech',
    rep: 'James Gordon',
    value: 195,
    stage: 'Discovery',
    riskLevel: 'LOW',
    trend: 'stable',
    trendNote: 'First business case review scheduled.',
    daysSinceContact: 4,
    description: 'Meridian Tech is in early Discovery with stakeholder map completed and Economic Buyer identified. Discovery cadence is agreed and pain and budget were confirmed. Risk is low; we are building the relationship and pipeline for a planned Q2 opportunity.',
    signals: [
      { type: 'positive', icon: '📌', text: 'Stakeholder map completed; Economic Buyer identified.', explanation: { howWeGotHere: 'Discovery call mapped 4 stakeholders; Economic Buyer (Director IT) named and confirmed.', dataSources: ['Discovery call notes', 'Salesforce contacts'], contradicting: null } },
      { type: 'positive', icon: '🗓️', text: 'Discovery cadence agreed; next call in 5 days.', explanation: { howWeGotHere: 'Champion agreed to biweekly discovery; next call on calendar.', dataSources: ['Calendar', 'Call summary'], contradicting: null } },
      { type: 'positive', icon: '📊', text: 'Clear pain and budget confirmed in discovery.', explanation: { howWeGotHere: 'Pain and budget scope captured in discovery doc; champion confirmed.', dataSources: ['Discovery doc', 'Gong'], contradicting: null } },
    ],
  },
];

function sortDealsByRisk(deals) {
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...deals].sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
}

function getRiskBadgeClass(riskLevel) {
  switch (riskLevel) {
    case 'HIGH': return 'vp-pipeline-risk-badge--high';
    case 'MEDIUM': return 'vp-pipeline-risk-badge--medium';
    case 'LOW': return 'vp-pipeline-risk-badge--low';
    default: return '';
  }
}

function TrendIcon({ trend }) {
  const cls = trend === 'improving' ? 'vp-pipeline-trend--improving' : trend === 'declining' ? 'vp-pipeline-trend--declining' : 'vp-pipeline-trend--stable';
  const sym = trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '—';
  return <span className={`vp-pipeline-trend ${cls}`} aria-hidden>{sym}</span>;
}

function getSignalRowClass(type) {
  switch (type) {
    case 'danger': return 'vp-pipeline-signal--danger';
    case 'warning': return 'vp-pipeline-signal--warning';
    case 'positive': return 'vp-pipeline-signal--positive';
    default: return '';
  }
}

function getRecommendedAction(deal) {
  const name = deal.name;
  if (name.includes('ACME') && deal.riskLevel === 'HIGH') {
    return 'Assign an owner and ETA for vendor onboarding and confirm with the customer; follow up with the customer to confirm security review outcome after materials were submitted. Target close 03/28/26 is at risk until these are addressed.';
  }
  const danger = deal.signals.find((s) => s.type === 'danger');
  const warning = deal.signals.find((s) => s.type === 'warning');
  if (danger) {
    if (deal.stage === 'Negotiation' && danger.text.includes('Legal')) return `Have Legal prioritize ${name}'s redlines and send a response by EOW — they're comparing to a competitor contract.`;
    if (deal.stage === 'Commit' && danger.text.includes('Champion')) return 'Request a 15-minute call with the champion this week to unblock the security review and confirm next steps.';
    if (deal.stage === 'Commit' && danger.text.includes('security')) return 'Assign a dedicated security contact and send the questionnaire within 48 hours to prevent further delay.';
    if (danger.text.includes('Economic Buyer')) return 'Schedule a single joint call with the Economic Buyer and champion to align on timeline and ownership before the deal stalls.';
    if (danger.text.includes('Competitor')) return 'Request an urgent call with the champion to understand scope of the bake-off and secure a slot; bring a differentiated use case.';
    return 'Escape the no-response spiral: send one concise email with a single ask and a deadline, and have the rep try a different channel (call/LinkedIn) if no reply in 2 days.';
  }
  if (warning) {
    if (warning.text.includes('Legal') || warning.text.includes('MSA')) return 'Follow up with legal and the champion in one thread to get a target date for MSA completion.';
    if (warning.text.includes('budget') || warning.text.includes('Budget')) return 'Confirm budget owner and approval path with the champion; offer to join an internal alignment call if helpful.';
    return 'Nudge the champion for a status update and lock the next milestone (e.g. internal debrief or committee meeting) with a date.';
  }
  return 'Keep momentum: confirm the next concrete step (e.g. legal send-out or signature date) and document it in the CRM.';
}

export default function VPSalesView() {
  const sortedDeals = useMemo(() => sortDealsByRisk(DEALS), []);
  const highRiskCount = DEALS.filter((d) => d.riskLevel === 'HIGH').length;
  const totalValue = DEALS.reduce((sum, d) => sum + d.value, 0);
  const totalStr = totalValue >= 1000 ? `$${(totalValue / 1000).toFixed(1)}M` : `$${totalValue}K`;
  const subtitle = `${highRiskCount} at risk · ${DEALS.length} deals · ${totalStr}`;

  const defaultSelectedId = sortedDeals.find((d) => d.riskLevel === 'HIGH')?.id ?? sortedDeals[0]?.id;
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const selectedDeal = DEALS.find((d) => d.id === selectedId) ?? sortedDeals[0];

  const recommendedAction = getRecommendedAction(selectedDeal);
  const sortedSignals = useMemo(() => {
    const order = { danger: 0, warning: 1, positive: 2 };
    return [...(selectedDeal?.signals ?? [])].sort((a, b) => order[a.type] - order[b.type]);
  }, [selectedDeal]);

  const [expandedSignals, setExpandedSignals] = useState(new Set());
  const [chatDeal, setChatDeal] = useState(null);
  useEffect(() => setExpandedSignals(new Set()), [selectedId]);
  const toggleSignal = (index) => {
    setExpandedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="app-root vp-pipeline-root">
      {/* Left panel — Deal list (40%) */}
      <aside className="vp-pipeline-left">
        <header className="vp-pipeline-left-header">
          <h1 className="portal-title">Pipeline Overview</h1>
          <p className="vp-pipeline-subtitle">{subtitle}</p>
        </header>
        <div className="vp-pipeline-list">
          {sortedDeals.map((deal) => {
            const isSelected = deal.id === selectedId;
            return (
              <div
                key={deal.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(deal.id)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedId(deal.id)}
                className={`vp-pipeline-card ${isSelected ? 'vp-pipeline-card--selected' : ''}`}
              >
                <div className="vp-pipeline-card-head">
                  <span className="vp-pipeline-card-name">{deal.name}</span>
                  <span className="vp-pipeline-card-rep">{deal.rep}</span>
                  <button
                    type="button"
                    className="vp-pipeline-card-chat"
                    onClick={(e) => { e.stopPropagation(); setChatDeal(deal); }}
                    aria-label={`Chat about ${deal.name}`}
                    title="Chat about this deal"
                  >
                    <span aria-hidden>💬</span>
                  </button>
                </div>
                <div className="vp-pipeline-card-meta">
                  <span className="vp-pipeline-card-value">${deal.value}K</span>
                  <span>·</span>
                  <span>{deal.stage}</span>
                </div>
                <div className="vp-pipeline-card-badges">
                  <span className={`vp-pipeline-risk-badge ${getRiskBadgeClass(deal.riskLevel)}`}>
                    {deal.riskLevel}
                  </span>
                  <TrendIcon trend={deal.trend} />
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right panel — Deal detail (60%) */}
      <main className="vp-pipeline-right">
        <div className="vp-pipeline-detail">
          {selectedDeal && (
            <>
              <h2 className="vp-pipeline-detail-title">{selectedDeal.name}</h2>
              <p className="vp-pipeline-detail-meta">
                {selectedDeal.rep} · {selectedDeal.stage}
                {selectedDeal.daysSinceContact > 10 ? (
                  <span className="vp-pipeline-detail-contact--alert"> · Last contact: {selectedDeal.daysSinceContact} days ago</span>
                ) : (
                  <span> · Last contact: {selectedDeal.daysSinceContact} days ago</span>
                )}
              </p>
              <p className="vp-pipeline-detail-value">${selectedDeal.value}K</p>
              <div className="vp-pipeline-detail-badges">
                <span className={`vp-pipeline-risk-badge ${getRiskBadgeClass(selectedDeal.riskLevel)}`}>
                  {selectedDeal.riskLevel}
                </span>
                <span className="vp-pipeline-detail-trend-note">
                  <TrendIcon trend={selectedDeal.trend} /> {' '}{selectedDeal.trendNote}
                </span>
              </div>

              {selectedDeal.description && (
                <section>
                  <h3 className="vp-pipeline-section-title">Deal summary</h3>
                  <p className="vp-pipeline-detail-description">{selectedDeal.description}</p>
                </section>
              )}

              <section>
                <h3 className="vp-pipeline-section-title">Risk Signals</h3>
                <ul className="vp-pipeline-signals">
                  {sortedSignals.map((sig, i) => {
                    const hasExplanation = sig.explanation;
                    const isExpanded = expandedSignals.has(i);
                    return (
                      <li key={i} className={`vp-pipeline-signal ${getSignalRowClass(sig.type)} ${isExpanded ? 'vp-pipeline-signal--expanded' : ''}`}>
                        {hasExplanation ? (
                          <button
                            type="button"
                            className="vp-pipeline-signal-trigger"
                            onClick={() => toggleSignal(i)}
                            aria-expanded={isExpanded}
                          >
                            <span className="vp-pipeline-signal-icon" aria-hidden>{sig.icon}</span>
                            <span className="vp-pipeline-signal-text">{sig.text}</span>
                            <span className="vp-pipeline-signal-chevron" aria-hidden>{isExpanded ? '▼' : '▶'}</span>
                          </button>
                        ) : (
                          <div className="vp-pipeline-signal-trigger vp-pipeline-signal-trigger--static">
                            <span className="vp-pipeline-signal-icon" aria-hidden>{sig.icon}</span>
                            <span className="vp-pipeline-signal-text">{sig.text}</span>
                          </div>
                        )}
                        {hasExplanation && isExpanded && (
                          <div className="vp-pipeline-signal-explanation">
                            {sig.explanation.aeSlackQuote ? (
                              <>
                                <p className="vp-pipeline-explanation-label">Quote from Slack</p>
                                <blockquote className="vp-pipeline-slack-quote">{sig.explanation.aeSlackQuote}</blockquote>
                                <p className="vp-pipeline-explanation-label">Contradicting data</p>
                                <p className="vp-pipeline-contradicting-data">{sig.explanation.contradictingData}</p>
                              </>
                            ) : (
                              <>
                                <p className="vp-pipeline-explanation-label">How we got here</p>
                                <p className="vp-pipeline-explanation-body">{sig.explanation.howWeGotHere}</p>
                                <p className="vp-pipeline-explanation-label">Data sources</p>
                                <ul className="vp-pipeline-explanation-sources">
                                  {(sig.explanation.dataSources || []).map((src, j) => (
                                    <li key={j}>{src}</li>
                                  ))}
                                </ul>
                                {sig.explanation.contradicting && (
                                  <>
                                    <p className="vp-pipeline-explanation-label">Contradicting</p>
                                    <p className="vp-pipeline-contradicting-data">{sig.explanation.contradicting}</p>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <div className="vp-pipeline-action-box">
                  <h3 className="vp-pipeline-section-title">Recommended Action</h3>
                  <p>{recommendedAction}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      {chatDeal && (
        <DealChatModal deal={chatDeal} onClose={() => setChatDeal(null)} />
      )}
    </div>
  );
}
