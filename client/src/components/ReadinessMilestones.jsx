/**
 * Path to close: 4 tracks with title, tooltip, and status summary.
 * Layout and styling preserved; content is structured per track.
 */

const TOOLTIP_BOLD_LABELS = ['What this covers:', 'Includes:', 'Turns green when:'];
const TOOLTIP_BOLD_REGEX = /(What this covers:|Includes:|Turns green when:)/g;

function renderTooltipWithBoldLabels(text) {
  const parts = text.split(TOOLTIP_BOLD_REGEX);
  return parts.map((part, i) =>
    TOOLTIP_BOLD_LABELS.includes(part) ? (
      <strong key={i}>{part}</strong>
    ) : (
      part
    )
  );
}

const TRACKS = [
  {
    key: 'decision-process',
    title: 'Decision process',
    subtitle: 'Is the decision process clear?',
    variant: 'done',
    tooltipText:
      'What this covers: who decides and how the deal gets to yes.\n\nIncludes: champion, signer, approval steps and target decision date.\n\nTurns green when: there is a credible, evidenced path to decision.',
    statusSummary:
      'Champion is engaged, signer is known, and the approval path is clear.',
  },
  {
    key: 'solution-validation',
    title: 'Solution validation',
    subtitle: 'Is the solution validated?',
    variant: 'done',
    tooltipText:
      'What this covers: proof that the solution works for this customer.\n\nIncludes: POC or technical validation, success criteria, evaluation outcome, and agreed next step.\n\nTurns green when: validation is complete and the outcome is documented, or validation is explicitly not required.',
    statusSummary: 'POC passed and the agreed success criteria were met.',
  },
  {
    key: 'commercials',
    title: 'Commercials',
    subtitle: 'Are commercials aligned?',
    variant: 'pending',
    tooltipText:
      'What this covers: the commercial offer needed to move to signature.\n\nIncludes: package, term, quantity/usage, services, discount/exception approvals, and quote/order form readiness.\n\nTurns green when: the commercial structure is approved and ready to send for signature.',
    statusSummary:
      'Commercial structure is agreed.\nInternal discount approval is still pending.',
    statusHighlight: 'Internal discount approval is still pending.',
  },
  {
    key: 'closing-ops',
    title: 'Closing ops',
    subtitle: 'Are legal, security, and procurement cleared?',
    variant: 'critical',
    tooltipText:
      'What this covers: operational clearance required before signing.\n\nIncludes: legal paper path and redlines, security review, procurement requirements, customer vendor onboarding, and signature readiness.\n\nTurns green when: these workstreams are approved, completed, or explicitly not required.',
    statusSummary:
      'Legal is in progress.\nSecurity review missing approval and customer vendor onboarding has no owner or ETA yet.',
    statusHighlight:
      'Security review missing approval and customer vendor onboarding has no owner or ETA yet.',
  },
];

export default function ReadinessMilestones() {
  return (
    <section className="readiness-section" aria-label="Path to close by track">
      <div className="readiness-header">
        <h2 className="readiness-title">Path to close (4 tracks)</h2>
      </div>
      <div className="readiness-milestones">
        {TRACKS.map((track) => (
          <div
            key={track.key}
            className={`readiness-box readiness-box--${track.variant}`}
            data-milestone={track.key}
          >
            <div className="readiness-box-header">
              <h3 className="readiness-box-title">
                {track.title}
                <span className="readiness-box-info-wrap">
                  <span
                    className="readiness-box-info"
                    aria-label="More information"
                  >
                    i
                  </span>
                  <span
                    className="readiness-box-tooltip"
                    role="tooltip"
                    id={`tooltip-${track.key}`}
                  >
                    {renderTooltipWithBoldLabels(track.tooltipText)}
                  </span>
                </span>
              </h3>
              <span
                className={`readiness-box-icon readiness-box-icon--${track.variant}`}
                aria-hidden
              >
                {track.variant === 'done' && '✓'}
                {track.variant === 'pending' && '?'}
                {track.variant === 'critical' && '!'}
              </span>
            </div>
            {track.subtitle && (
              <p className="readiness-box-subtitle">{track.subtitle}</p>
            )}
            <div className="readiness-box-status readiness-box-status--multiline">
              {track.statusHighlight
                ? (() => {
                    const [before, after] = track.statusSummary.split(
                      track.statusHighlight
                    );
                    return (
                      <>
                        {before}
                        <span className="readiness-box-status-highlight">
                          {track.statusHighlight}
                        </span>
                        {after}
                      </>
                    );
                  })()
                : track.statusSummary}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
