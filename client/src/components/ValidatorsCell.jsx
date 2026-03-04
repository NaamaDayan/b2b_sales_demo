import { useState } from 'react';

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
        {(validators && validators.length) ? validators.join(', ') : '—'}
      </div>
    );
  }

  return (
    <div className="validators-cell" data-id={taskId}>
      {(validators || []).map((v) => (
        <span key={v} className="validator-pill">
          {v}{' '}
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
            placeholder="@name"
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
