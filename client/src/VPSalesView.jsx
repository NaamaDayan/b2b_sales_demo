/**
 * VP Sales view: static table of deals with expandable rows.
 * Each expanded row shows the same 4 tracks (Path to close) as the AE deal space.
 */

import React, { useState } from 'react';
import ReadinessMilestones from './components/ReadinessMilestones';
import './App.css';

const VP_DEALS = [
  { id: '1', accountName: 'BrightWave', crmStage: 'Proposal', crmForecast: 'Best Case', targetCloseDate: '2026-04-27', executionStatus: 'ON TRACK' },
  { id: '2', accountName: 'Northstar Health', crmStage: 'Negotiation', crmForecast: 'Commit', targetCloseDate: '2026-04-29', executionStatus: 'ON TRACK' },
  { id: '3', accountName: 'Vertex Labs', crmStage: 'POC', crmForecast: 'Best Case', targetCloseDate: '2026-05-08', executionStatus: 'ON TRACK' },
  { id: '4', accountName: 'BluePeak Systems', crmStage: 'Proposal', crmForecast: 'Pipeline', targetCloseDate: '2026-05-22', executionStatus: 'ON TRACK' },
  { id: '5', accountName: 'Orion Foods', crmStage: 'POC', crmForecast: 'Best Case', targetCloseDate: '2026-05-15', executionStatus: 'ON TRACK' },
  { id: '6', accountName: 'Summit Retail', crmStage: 'Negotiation', crmForecast: 'Commit', targetCloseDate: '2026-04-30', executionStatus: 'ON TRACK' },
  { id: '7', accountName: 'DeltaGrid', crmStage: 'Negotiation', crmForecast: 'Commit', targetCloseDate: '2026-04-26', executionStatus: 'NEEDS ATTENTION' },
  { id: '8', accountName: 'RedCrest', crmStage: 'POC', crmForecast: 'Best Case', targetCloseDate: '2026-05-04', executionStatus: 'NEEDS ATTENTION' },
  { id: '9', accountName: 'ACME', crmStage: 'Negotiation', crmForecast: 'Commit', targetCloseDate: '2026-04-28', executionStatus: 'AT RISK' },
  { id: '10', accountName: 'Luma Financial', crmStage: 'Proposal', crmForecast: 'Best Case', targetCloseDate: '2026-04-25', executionStatus: 'AT RISK' },
];

function executionStatusClass(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ON TRACK') return 'vp-status--on-track';
  if (s === 'NEEDS ATTENTION') return 'vp-status--needs-attention';
  if (s === 'AT RISK') return 'vp-status--at-risk';
  return '';
}

export default function VPSalesView() {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="app-root vp-sales-root">
      <main className="main-content vp-sales-main">
        <div className="vp-sales-header">
          <h1 className="portal-title">Pipeline — VP Sales</h1>
          <a href="." className="vp-nav-link">AE Deal Space</a>
        </div>

        <div className="vp-table-wrap">
          <table className="vp-table" role="table">
            <thead>
              <tr>
                <th className="vp-th vp-th-expand" aria-label="Expand row" />
                <th className="vp-th">Account Name</th>
                <th className="vp-th">CRM Stage</th>
                <th className="vp-th">CRM Forecast</th>
                <th className="vp-th">Target Close Date</th>
                <th className="vp-th">Execution Status</th>
              </tr>
            </thead>
            <tbody>
              {VP_DEALS.map((deal) => (
                <React.Fragment key={deal.id}>
                  <tr
                    className={`vp-row ${expandedId === deal.id ? 'vp-row--expanded' : ''}`}
                    onClick={() => toggleExpand(deal.id)}
                  >
                    <td className="vp-td vp-td-expand">
                      <button
                        type="button"
                        className="vp-expand-btn"
                        aria-expanded={expandedId === deal.id}
                        aria-label={expandedId === deal.id ? 'Collapse row' : 'Expand row'}
                      >
                        {expandedId === deal.id ? '−' : '+'}
                      </button>
                    </td>
                    <td className="vp-td vp-td-account">{deal.accountName}</td>
                    <td className="vp-td">{deal.crmStage}</td>
                    <td className="vp-td">{deal.crmForecast}</td>
                    <td className="vp-td vp-td-date">{deal.targetCloseDate}</td>
                    <td className="vp-td">
                      <span className={`vp-execution-status ${executionStatusClass(deal.executionStatus)}`}>
                        {deal.executionStatus}
                      </span>
                    </td>
                  </tr>
                  {expandedId === deal.id && (
                    <tr className="vp-detail-row">
                      <td className="vp-detail-cell" colSpan={6}>
                        <div className="vp-detail-inner">
                          <ReadinessMilestones />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
