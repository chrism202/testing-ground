import axios from 'axios'

const API_BASE_URL = '/api'

export async function uploadDisclosurePackage(file, apiKey) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)

  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 600000 // 10 minute timeout for large files
    })

    return response.data
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Analysis failed')
    } else if (error.request) {
      throw new Error('No response from server. Please check your connection.')
    } else {
      throw new Error('Request failed: ' + error.message)
    }
  }
}

export async function downloadReport(sessionId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/download/${sessionId}`, {
      responseType: 'blob'
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `disclosure_analysis_${sessionId}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    throw new Error('Failed to download report')
  }
}

export async function cleanupSession(sessionId) {
  try {
    await axios.delete(`${API_BASE_URL}/cleanup/${sessionId}`)
  } catch (error) {
    console.error('Cleanup failed:', error)
  }
}
