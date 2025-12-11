import React from 'react'

function RiskSummary({ statistics }) {
  const { total_issues, red_issues, orange_issues, yellow_issues, documents_analyzed } = statistics

  const riskData = [
    {
      level: 'Critical',
      count: red_issues,
      color: '#dc3545',
      icon: '🔴',
      description: 'Hundreds of thousands'
    },
    {
      level: 'Significant',
      count: orange_issues,
      color: '#fd7e14',
      icon: '🟠',
      description: 'Tens of thousands'
    },
    {
      level: 'Minor',
      count: yellow_issues,
      color: '#ffc107',
      icon: '🟡',
      description: 'Thousands'
    }
  ]

  return (
    <div className="risk-summary">
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-value">{documents_analyzed}</div>
          <div className="stat-label">Documents Analyzed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{total_issues}</div>
          <div className="stat-label">Total Issues Found</div>
        </div>
      </div>

      <div className="risk-breakdown">
        {riskData.map(risk => (
          <div key={risk.level} className="risk-card" style={{ borderLeftColor: risk.color }}>
            <div className="risk-header">
              <span className="risk-icon">{risk.icon}</span>
              <span className="risk-level">{risk.level}</span>
            </div>
            <div className="risk-count">{risk.count}</div>
            <div className="risk-description">{risk.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RiskSummary
