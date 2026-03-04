export default function ChatModal({ task, onClose }) {
  return (
    <div className="chat-modal-overlay visible" aria-hidden="false" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Open in Slack</h3>
        <p>DM will open in Slack for this task: {task?.title}. (Simulated in demo.)</p>
        <button type="button" className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
