export default function TabBar({ activeTab, onTabChange, counts }) {
  const tabs = [
    { key: 'attention', label: 'Requires Attention', count: counts.attention, dataTab: 'attention' },
    { key: 'control', label: 'Under Control', count: counts.control, dataTab: 'control' },
    { key: 'done', label: 'Done', count: counts.done, dataTab: 'done' },
  ];

  return (
    <nav className="portal-tabs" role="tablist">
      {tabs.map(({ key, label, count, dataTab }) => (
        <button
          key={key}
          type="button"
          className={`portal-tab ${activeTab === key ? 'active' : ''}`}
          data-tab={dataTab}
          role="tab"
          aria-selected={activeTab === key}
          onClick={() => onTabChange(key)}
        >
          {label} <span className="tab-count">({count})</span>
        </button>
      ))}
    </nav>
  );
}
