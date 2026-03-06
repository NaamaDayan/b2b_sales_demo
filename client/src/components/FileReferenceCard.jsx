/**
 * Renders a single file reference (like Slack shared documents).
 * Mock data only; link is placeholder (#).
 */
export default function FileReferenceCard({ title, updated }) {
  return (
    <div className="file-reference-card">
      <span className="file-reference-icon" aria-hidden>📄</span>
      <div className="file-reference-body">
        <a href="#" className="file-link" onClick={(e) => e.preventDefault()}>
          {title}
        </a>
        {updated && (
          <p className="file-reference-meta">{updated}</p>
        )}
        <a href="#" className="file-reference-open" onClick={(e) => e.preventDefault()}>
          Open document →
        </a>
      </div>
    </div>
  );
}
