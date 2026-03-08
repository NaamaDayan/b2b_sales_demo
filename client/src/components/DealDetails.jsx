export default function DealDetails() {
  return (
    <div className="deal-details">
      <div className="meta-line">
        <strong>Account / Deal:</strong> <span>ACME — Enterprise TLS Automation</span>
      </div>
      <div className="meta-line">
        <strong>CRM Forecast:</strong> <span>Commit</span>
      </div>
      <div className="meta-line">
        <strong>CRM Stage:</strong> <span>Negotiation</span>
      </div>
      <div className="meta-line">
        <strong>Target Close Date:</strong> <span>03/28/26</span>
      </div>
      <div className="meta-line">
        <strong>Execution Status:</strong>{' '}
        <span className="execution-status execution-status--at-risk" aria-label="At risk">
          <span className="execution-status-icon" aria-hidden>⚠</span>
          <span>AT RISK</span>
        </span>
      </div>
    </div>
  );
}
