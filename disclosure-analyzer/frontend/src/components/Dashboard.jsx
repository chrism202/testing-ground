import React, { useState } from 'react'
import RiskSummary from './RiskSummary'
import RiskList from './RiskList'
import { downloadReport } from '../services/api'

function Dashboard({ data, onReset }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setDownloading(true)
      await downloadReport(data.session_id)
    } catch (error) {
      alert('Failed to download report: ' + error.message)
    } finally {
      setDownloading(false)
    }
  }

  const { analysis, session_id } = data
  const { statistics, red_risks, orange_risks, yellow_risks, summary } = analysis

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Analysis Complete</h2>
        <div className="dashboard-actions">
          <button
            className="btn-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? 'Downloading...' : '📄 Download PDF Report'}
          </button>
          <button className="btn-secondary" onClick={onReset}>
            🔄 New Analysis
          </button>
        </div>
      </div>

      <div className="summary-section">
        <h3>Executive Summary</h3>
        <div className="summary-text">
          {summary.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      <RiskSummary statistics={statistics} />

      <div className="cost-estimate">
        <h3>💰 Total Estimated Remediation Costs</h3>
        <div className="cost-range">
          <span className="cost-min">
            ${statistics.total_cost_min.toLocaleString()}
          </span>
          <span className="cost-separator">to</span>
          <span className="cost-max">
            ${statistics.total_cost_max.toLocaleString()}
          </span>
        </div>
      </div>

      {red_risks.length > 0 && (
        <RiskList
          title="🔴 Critical Issues"
          subtitle="Hundreds of thousands to remediate - Require immediate attention"
          risks={red_risks}
          level="red"
        />
      )}

      {orange_risks.length > 0 && (
        <RiskList
          title="🟠 Significant Issues"
          subtitle="Tens of thousands to remediate - Should be negotiated"
          risks={orange_risks}
          level="orange"
        />
      )}

      {yellow_risks.length > 0 && (
        <RiskList
          title="🟡 Minor Issues"
          subtitle="Thousands to remediate - Plan for repairs"
          risks={yellow_risks}
          level="yellow"
        />
      )}

      {statistics.total_issues === 0 && (
        <div className="no-issues">
          <h3>✅ No Significant Issues Found</h3>
          <p>The disclosure package appears to be in good order with no major concerns identified.</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard
