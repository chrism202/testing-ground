import React, { useState } from 'react'
import { uploadDisclosurePackage } from '../services/api'

function UploadForm({ apiKey, onAnalysisStart, onAnalysisComplete }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (selectedFile) => {
    setError('')

    if (!selectedFile.name.endsWith('.zip')) {
      setError('Please select a ZIP file containing the disclosure package')
      return
    }

    if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
      setError('File size must be less than 100MB')
      return
    }

    setFile(selectedFile)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!file) {
      setError('Please select a file')
      return
    }

    if (!apiKey) {
      setError('Please set your OpenAI API key first')
      return
    }

    try {
      onAnalysisStart()
      const result = await uploadDisclosurePackage(file, apiKey)
      onAnalysisComplete(result)
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.')
      onAnalysisComplete(null)
    }
  }

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2>Upload Disclosure Package</h2>
        <p className="upload-instructions">
          Upload a ZIP file containing all disclosure documents (PDFs) from the property transaction.
        </p>

        <form onSubmit={handleSubmit}>
          <div
            className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              accept=".zip"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="file-label">
              {file ? (
                <div className="file-info">
                  <span className="file-icon">📦</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div className="upload-prompt">
                  <span className="upload-icon">📁</span>
                  <p>Drag and drop ZIP file here</p>
                  <p className="or-text">or</p>
                  <button type="button" className="btn-browse">
                    Browse Files
                  </button>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary btn-analyze"
            disabled={!file || !apiKey}
          >
            {apiKey ? 'Analyze Disclosure Package' : 'Set API Key First'}
          </button>
        </form>

        <div className="upload-info">
          <h3>What documents should be included?</h3>
          <ul>
            <li>Home Inspection Report</li>
            <li>Roof Inspection</li>
            <li>Pest/Termite Inspection</li>
            <li>Transfer Disclosure Statement (TDS)</li>
            <li>Seller Property Questionnaire</li>
            <li>Natural Hazard Disclosure</li>
            <li>HOA Documents</li>
            <li>All advisories and supplemental reports</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UploadForm
