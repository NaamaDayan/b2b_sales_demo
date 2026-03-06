import FileReferenceCard from './FileReferenceCard';

/** Mock sources for the Important Feature Request demo (Demi ↔ Product manager). */
const DEMO_SOURCES = [
  { title: 'Identity Integrations Roadmap – Q1 2026', updated: 'updated Feb 12, 2026' },
  { title: 'SCIM Integration Technical Notes', updated: null },
  { title: 'Enterprise Identity Architecture Deck', updated: null },
];

function DemiJordanConversation() {
  return (
    <div className="demi-chat-conversation">
      <h3 className="demi-chat-heading">Demi ↔ Product manager (demo)</h3>
      <div className="demi-chat-message demi-chat-message--agent">
        <div className="demi-chat-message-author">Demi</div>
        <div className="demi-chat-message-content">
          <p><strong>Customer:</strong> ACME</p>
          <p><strong>Urgency:</strong> HIGH</p>
          <p><strong>Item:</strong></p>
          <p>Customer asked if we support SCIM provisioning (needed for automated onboarding/offboarding).</p>
          <p><strong>What I&apos;ve done:</strong></p>
          <p className="demi-chat-source-label">Source found:</p>
          <div className="file-reference-list">
            {DEMO_SOURCES.map((source, i) => (
              <FileReferenceCard
                key={i}
                title={source.title}
                updated={source.updated}
              />
            ))}
          </div>
          <p className="demi-chat-follow-up">It indicates: SCIM is not planned in H1 2026. Suggested positioning: we can still solve their outcome using SAML + API provisioning + our automation workflows.</p>
          <p><strong>Suggested response to AE:</strong></p>
          <p className="demi-chat-suggested">We don&apos;t currently support SCIM provisioning. However, customers achieve the same automated lifecycle using SAML plus API-based provisioning and our certificate automation workflows. If you share your IdP and target apps, we&apos;ll confirm the best path for your setup.</p>
        </div>
      </div>
    </div>
  );
}

export default function ChatModal({ task, onClose }) {
  const isImportantFeatureRequest = task?.workflowId === 'important-feature-request' || task?.title === 'Important Feature Request';

  return (
    <div className="chat-modal-overlay visible" aria-hidden="false" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        {isImportantFeatureRequest ? (
          <>
            <DemiJordanConversation />
            <p className="chat-modal-note">This is a preview of the conversation in Slack. The real DM is sent to the Product manager when you run Execute.</p>
          </>
        ) : (
          <>
            <h3>Open in Slack</h3>
            <p>DM will open in Slack for this task: {task?.title}. (Simulated in demo.)</p>
          </>
        )}
        <button type="button" className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
