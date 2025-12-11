import React, { useState } from 'react'

function RiskList({ title, subtitle, risks, level }) {
  const [expandedIndex, setExpandedIndex] = useState(null)

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  const levelColors = {
    red: '#dc3545',
    orange: '#fd7e14',
    yellow: '#ffc107'
  }

  return (
    <div className="risk-list-section">
      <div className="risk-list-header">
        <h3>{title}</h3>
        <p className="risk-list-subtitle">{subtitle}</p>
        <div className="risk-count-badge" style={{ backgroundColor: levelColors[level] }}>
          {risks.length} {risks.length === 1 ? 'Issue' : 'Issues'}
        </div>
      </div>

      <div className="risk-list">
        {risks.map((risk, index) => (
          <div
            key={index}
            className={`risk-item ${expandedIndex === index ? 'expanded' : ''}`}
            style={{ borderLeftColor: levelColors[level] }}
          >
            <div className="risk-item-header" onClick={() => toggleExpand(index)}>
              <div className="risk-item-title">
                <span className="risk-number">{index + 1}.</span>
                <span className="risk-title">{risk.title || 'Untitled Issue'}</span>
              </div>
              <div className="risk-item-meta">
                <span className="risk-cost">
                  ${risk.cost_min?.toLocaleString()} - ${risk.cost_max?.toLocaleString()}
                </span>
                <button className="btn-expand">
                  {expandedIndex === index ? '▼' : '▶'}
                </button>
              </div>
            </div>

            {expandedIndex === index && (
              <div className="risk-item-details">
                <div className="detail-row">
                  <span className="detail-label">Source Document:</span>
                  <span className="detail-value">{risk.document}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Severity:</span>
                  <span className="detail-value severity">
                    {risk.severity?.toUpperCase()}
                  </span>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{risk.description || 'No description available'}</p>
                </div>

                {risk.action && (
                  <div className="detail-section">
                    <h4>Recommended Action</h4>
                    <p className="recommended-action">{risk.action}</p>
                  </div>
                )}

                <div className="detail-section">
                  <h4>Cost Estimate</h4>
                  <p>
                    Estimated remediation cost: <strong>${risk.cost_min?.toLocaleString()} - ${risk.cost_max?.toLocaleString()}</strong>
                  </p>
                  <p className="cost-category">{risk.cost_category}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default RiskList
