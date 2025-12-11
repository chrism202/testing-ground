import React, { useState } from 'react'

function ApiKeyModal({ currentKey, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(currentKey || '')
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Please enter a valid API key')
      return
    }
    onSave(apiKey.trim())
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>OpenAI API Key</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Enter your OpenAI API key to analyze disclosure documents. Your key is stored locally
            in your browser and never sent to our servers.
          </p>

          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <div className="input-with-toggle">
              <input
                type={showKey ? 'text' : 'password'}
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="input-api-key"
              />
              <button
                type="button"
                className="btn-toggle-visibility"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="api-key-info">
            <p><strong>How to get an API key:</strong></p>
            <ol>
              <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com/api-keys</a></li>
              <li>Sign in or create an account</li>
              <li>Click "Create new secret key"</li>
              <li>Copy the key and paste it above</li>
            </ol>
            <p className="note">
              <strong>Note:</strong> Analysis uses GPT-4 which costs approximately $0.01-0.03 per page.
              A typical disclosure package with 100 pages costs $1-3 to analyze.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save API Key
          </button>
        </div>
      </div>
    </div>
  )
}

export default ApiKeyModal
