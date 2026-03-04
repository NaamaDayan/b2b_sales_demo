import { useState } from 'react';

const SUGGESTED_LABELS = ['Legal', 'Security', 'Product', 'Commercial', 'Stakeholders'];

export default function LabelsCell({ taskId, labels, editable, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const handleRemove = (label) => {
    onUpdate(taskId, 'labels', (labels || []).filter((x) => x !== label));
  };

  const handleAdd = () => {
    const val = inputVal.trim();
    if (val && !(labels || []).includes(val)) {
      onUpdate(taskId, 'labels', [...(labels || []), val]);
      setInputVal('');
      setAdding(false);
    }
  };

  if (!editable) {
    return (
      <div className="labels-cell read-only">
        {(labels && labels.length) ? (
          <span className="labels-pills">
            {labels.map((l) => (
              <span key={l} className="label-pill">
                {l}
              </span>
            ))}
          </span>
        ) : (
          '—'
        )}
      </div>
    );
  }

  return (
    <div className="labels-cell" data-id={taskId}>
      {(labels || []).map((l) => (
        <span key={l} className="label-pill">
          {l}{' '}
          <button type="button" className="remove" onClick={() => handleRemove(l)} aria-label="Remove">
            ×
          </button>
        </span>
      ))}
      {!adding ? (
        <button type="button" className="add-label" onClick={() => setAdding(true)}>
          + Add
        </button>
      ) : (
        <span className="label-input-wrap visible">
          <input
            type="text"
            placeholder="Label"
            value={inputVal}
            list="labels-list"
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <datalist id="labels-list">
            {SUGGESTED_LABELS.filter((s) => !(labels || []).includes(s)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <button type="button" className="label-confirm" onClick={handleAdd}>
            Add
          </button>
        </span>
      )}
    </div>
  );
}
