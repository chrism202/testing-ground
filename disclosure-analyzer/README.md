# 🏠 Real Estate Disclosure Analyzer

An AI-powered application that analyzes real estate disclosure packages and provides comprehensive risk assessments with cost estimates.

## Overview

This application allows customers to upload a complete real estate disclosure package (as a ZIP file) and receive:

- **Automated Analysis**: Each document is analyzed by GPT-4 with document-specific prompts
- **Risk Categorization**: Issues are categorized as:
  - 🔴 **Red (Critical)**: Hundreds of thousands of dollars to remediate
  - 🟠 **Orange (Significant)**: Tens of thousands of dollars to remediate
  - 🟡 **Yellow (Minor)**: Thousands of dollars to remediate
- **Comprehensive Dashboard**: Visual summary of all risks with detailed breakdowns
- **PDF Report**: Downloadable professional report of all findings

## Features

### Backend (Python/FastAPI)
- FastAPI REST API for file uploads and processing
- ZIP file extraction and PDF parsing (supports complex PDFs)
- OpenAI GPT-4 integration with specialized prompts for different document types
- Intelligent risk categorization based on cost estimates
- Professional PDF report generation with ReportLab

### Frontend (React)
- Modern, responsive user interface
- Drag-and-drop file upload
- Secure API key management (stored locally in browser)
- Real-time analysis progress
- Interactive risk dashboard with expandable issue details
- PDF report download

### Document Types Supported

The analyzer recognizes and applies specialized prompts for:
- Home Inspection Reports
- Roof Inspections
- Pest/Termite Inspections
- Transfer Disclosure Statements (TDS)
- Seller Property Questionnaires (SPQ)
- Lead Paint Disclosures
- Natural Hazard Disclosures
- Wildfire Advisories
- HOA Documents (CC&Rs)
- Water/Plumbing Reports
- Title/Preliminary Reports
- And more...

## Installation

### Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher
- OpenAI API key

### Backend Setup

```bash
cd disclosure-analyzer/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd disclosure-analyzer/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Start both servers** (backend and frontend)

2. **Open the application** at `http://localhost:3000`

3. **Set your OpenAI API Key**:
   - Click "Set API Key" button
   - Enter your OpenAI API key
   - Key is stored locally in your browser

4. **Upload disclosure package**:
   - Prepare a ZIP file containing all disclosure PDFs
   - Drag and drop the ZIP file or browse to select
   - Click "Analyze Disclosure Package"

5. **Review results**:
   - View executive summary
   - Explore categorized risks (Red, Orange, Yellow)
   - Expand individual issues for details
   - Download PDF report

## API Endpoints

### `POST /api/upload`
Upload and analyze a disclosure package

**Request:**
- `file`: ZIP file (multipart/form-data)
- `api_key`: OpenAI API key (form field)

**Response:**
```json
{
  "session_id": "uuid",
  "status": "success",
  "analysis": {
    "summary": "...",
    "statistics": {...},
    "red_risks": [...],
    "orange_risks": [...],
    "yellow_risks": [...]
  },
  "report_url": "/api/download/{session_id}"
}
```

### `GET /api/download/{session_id}`
Download the generated PDF report

**Response:** PDF file

### `DELETE /api/cleanup/{session_id}`
Clean up temporary files for a session

## Project Structure

```
disclosure-analyzer/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── file_processor.py       # ZIP extraction and PDF parsing
│   ├── openai_analyzer.py      # OpenAI integration
│   ├── risk_analyzer.py        # Risk categorization engine
│   ├── report_generator.py     # PDF report generation
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── ApiKeyModal.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── RiskList.jsx
│   │   │   ├── RiskSummary.jsx
│   │   │   └── UploadForm.jsx
│   │   ├── services/
│   │   │   └── api.js          # API client
│   │   ├── styles/
│   │   │   └── main.css        # Styles
│   │   ├── App.jsx             # Main app component
│   │   └── main.jsx            # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── uploads/                     # Temporary upload directory
├── reports/                     # Generated reports
└── README.md
```

## Cost Estimates

Using GPT-4 Turbo, typical costs:
- **Per page**: ~$0.01 - $0.03
- **Typical disclosure package (100 pages)**: $1 - $3
- **Large package (200+ pages)**: $2 - $6

Costs are charged directly to your OpenAI account.

## Security & Privacy

- API keys are stored locally in the browser (localStorage)
- Keys are never sent to the application servers
- Uploaded files are processed in temporary directories
- Session data can be cleaned up via API
- No data persistence (process and delete)

## Development

### Building for Production

**Backend:**
```bash
# The backend can be deployed with any WSGI server
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Frontend:**
```bash
npm run build
# Outputs to dist/ directory
```

### Environment Variables

Create a `.env` file in the backend directory (optional):
```
UPLOAD_DIR=../uploads
REPORT_DIR=../reports
```

## Troubleshooting

### "Analysis failed" errors
- Check that your OpenAI API key is valid
- Ensure you have sufficient credits in your OpenAI account
- Verify the ZIP file contains valid PDF documents

### PDF parsing issues
- Some PDFs with complex formatting may not parse correctly
- Scanned PDFs without OCR text layer won't extract text
- Try ensuring PDFs are text-based, not image-based

### Large file uploads
- The default timeout is 10 minutes
- Very large packages (>100MB) may need increased timeout
- Consider splitting extremely large packages

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review OpenAI API documentation
3. Open an issue on GitHub

---

Built with ❤️ using Python, FastAPI, React, and OpenAI GPT-4
