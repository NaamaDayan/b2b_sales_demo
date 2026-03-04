import { useState } from 'react';

/** Format @firstname_lastname to "Firstname Lastname" for display; otherwise return as-is. */
function formatValidatorDisplay(handle) {
  if (!handle || typeof handle !== 'string') return handle;
  const withoutAt = handle.startsWith('@') ? handle.slice(1) : handle;
  if (withoutAt.includes('_')) {
    return withoutAt
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return handle;
}

export default function ValidatorsCell({ taskId, validators, editable, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [inputVal, setInputVal] = useState('@');

  const handleRemove = (v) => {
    onUpdate(taskId, 'validators', (validators || []).filter((x) => x !== v));
  };

  const handleAdd = () => {
    const val = inputVal.trim();
    if (val && !(validators || []).includes(val)) {
      onUpdate(taskId, 'validators', [...(validators || []), val]);
      setInputVal('@');
      setAdding(false);
    }
  };

  if (!editable) {
    return (
      <div className="validators-cell read-only">
        {(validators && validators.length)
          ? validators.map(formatValidatorDisplay).join(', ')
          : '—'}
      </div>
    );
  }

  return (
    <div className="validators-cell" data-id={taskId}>
      {(validators || []).map((v) => (
        <span key={v} className="validator-pill" title={v}>
          {formatValidatorDisplay(v)}{' '}
          <button type="button" className="remove" onClick={() => handleRemove(v)} aria-label="Remove">
            ×
          </button>
        </span>
      ))}
      {!adding ? (
        <button type="button" className="add-validator" onClick={() => setAdding(true)}>
          + Add
        </button>
      ) : (
        <span className="validator-input-wrap visible">
          <input
            type="text"
            placeholder="@firstname_lastname"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <button type="button" className="validator-confirm" onClick={handleAdd}>
            Add
          </button>
        </span>
      )}
    </div>
  );
}
