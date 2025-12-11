import React, { useState } from 'react'
import UploadForm from './components/UploadForm'
import Dashboard from './components/Dashboard'
import ApiKeyModal from './components/ApiKeyModal'

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '')
  const [showApiKeyModal, setShowApiKeyModal] = useState(!apiKey)
  const [analysisData, setAnalysisData] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleApiKeySave = (key) => {
    setApiKey(key)
    localStorage.setItem('openai_api_key', key)
    setShowApiKeyModal(false)
  }

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data)
    setIsAnalyzing(false)
  }

  const handleAnalysisStart = () => {
    setIsAnalyzing(true)
    setAnalysisData(null)
  }

  const handleReset = () => {
    setAnalysisData(null)
    setIsAnalyzing(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏠 Real Estate Disclosure Analyzer</h1>
        <p className="subtitle">AI-Powered Risk Assessment for Property Disclosures</p>
        <button
          className="btn-secondary"
          onClick={() => setShowApiKeyModal(true)}
        >
          {apiKey ? 'Update API Key' : 'Set API Key'}
        </button>
      </header>

      <main className="app-main">
        {showApiKeyModal && (
          <ApiKeyModal
            currentKey={apiKey}
            onSave={handleApiKeySave}
            onClose={() => setShowApiKeyModal(false)}
          />
        )}

        {!analysisData && !isAnalyzing && (
          <UploadForm
            apiKey={apiKey}
            onAnalysisStart={handleAnalysisStart}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {isAnalyzing && (
          <div className="analyzing-container">
            <div className="spinner"></div>
            <h2>Analyzing Disclosure Package...</h2>
            <p>This may take a few minutes depending on the number of documents.</p>
            <ul className="analysis-steps">
              <li>📦 Extracting documents from ZIP file</li>
              <li>📄 Parsing PDF content</li>
              <li>🤖 Analyzing with AI</li>
              <li>📊 Categorizing risks</li>
              <li>📝 Generating report</li>
            </ul>
          </div>
        )}

        {analysisData && (
          <Dashboard
            data={analysisData}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by OpenAI GPT-4 | Data is processed securely and not stored</p>
      </footer>
    </div>
  )
}

export default App
