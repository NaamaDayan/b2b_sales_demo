/**
 * Modal for VP Sales to chat with a bot about a specific deal.
 * Mock bot responds with deal-aware answers.
 */

import React, { useState, useRef, useEffect } from 'react';

function getBotReply(deal, userMessage) {
  const msg = (userMessage || '').toLowerCase();
  const risks = deal.signals?.filter((s) => s.type === 'danger' || s.type === 'warning') || [];
  const riskList = risks.map((s) => s.text).join(' ') || 'None highlighted.';

  if (msg.includes('risk') || msg.includes('blocker') || msg.includes('wrong')) {
    return `For ${deal.name}, the main risks we're seeing are: ${risks.length ? riskList : 'deal is in good shape.'} ${deal.description ? 'Overall: ' + deal.description.slice(0, 120) + '…' : ''}`;
  }
  if (msg.includes('contact') || msg.includes('last') || msg.includes('days')) {
    return `Last contact was ${deal.daysSinceContact} days ago. ${deal.daysSinceContact > 10 ? 'That’s longer than ideal — worth a nudge to the rep or champion.' : 'Recency looks fine.'}`;
  }
  if (msg.includes('stage') || msg.includes('where')) {
    return `${deal.name} is in ${deal.stage} (${deal.riskLevel} risk). ${deal.trendNote || ''}`;
  }
  if (msg.includes('value') || msg.includes('worth') || msg.includes('size')) {
    return `Deal value is $${deal.value}K.`;
  }
  if (msg.includes('rep') || msg.includes('who')) {
    return `The account owner is ${deal.rep}.`;
  }
  if (msg.includes('next') || msg.includes('action') || msg.includes('do')) {
    const rec = deal.name.includes('ACME')
      ? 'Assign owner/ETA for vendor onboarding and confirm security review outcome with the customer.'
      : risks.length
        ? 'Focus on the top risk signal first and get a concrete next step with the customer or internal owner.'
        : 'Keep momentum: lock the next milestone and document it in the CRM.';
    return rec;
  }
  return `I have context on ${deal.name} ($${deal.value}K, ${deal.stage}, ${deal.riskLevel} risk). You can ask about risks, last contact, stage, value, rep, or recommended next steps.`;
}

export default function DealChatModal({ deal, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Ask me anything about ${deal?.name} — risk signals, last contact, stage, or what to do next.` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed || !deal) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setSending(true);
    setTimeout(() => {
      const reply = getBotReply(deal, trimmed);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
      setSending(false);
    }, 400);
  };

  if (!deal) return null;

  return (
    <div className="chat-modal-overlay visible" aria-modal="true" onClick={onClose}>
      <div className="chat-modal deal-chat-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="deal-chat-modal-title">Chat about {deal.name}</h3>
        <div className="deal-chat-messages" ref={listRef} role="log" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`deal-chat-message deal-chat-message--${m.role}`}>
              <span className="deal-chat-message-role">{m.role === 'bot' ? 'Bot' : 'You'}</span>
              <p className="deal-chat-message-text">{m.text.replace(/\*\*/g, '')}</p>
            </div>
          ))}
          {sending && (
            <div className="deal-chat-message deal-chat-message--bot">
              <span className="deal-chat-message-role">Bot</span>
              <p className="deal-chat-message-text deal-chat-typing">Thinking…</p>
            </div>
          )}
        </div>
        <div className="deal-chat-input-row">
          <input
            type="text"
            className="deal-chat-input"
            placeholder="Ask about this deal…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            aria-label="Message"
          />
          <button type="button" className="deal-chat-send" onClick={send} disabled={!input.trim() || sending}>
            Send
          </button>
        </div>
        <button type="button" className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
