"""
Real Estate Disclosure Analyzer - FastAPI Backend
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
import os
import shutil
import uuid
from datetime import datetime

from file_processor import FileProcessor
from openai_analyzer import OpenAIAnalyzer
from risk_analyzer import RiskAnalyzer
from report_generator import ReportGenerator

app = FastAPI(title="Real Estate Disclosure Analyzer")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
UPLOAD_DIR = "../uploads"
REPORT_DIR = "../reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Real Estate Disclosure Analyzer API"}


@app.post("/api/upload")
async def upload_disclosure_package(
    file: UploadFile = File(...),
    api_key: str = Form(...)
):
    """
    Upload and analyze a disclosure package

    Args:
        file: ZIP file containing disclosure documents
        api_key: OpenAI API key

    Returns:
        Analysis results with risk categorization
    """
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted")

    # Create unique session ID
    session_id = str(uuid.uuid4())
    session_dir = os.path.join(UPLOAD_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    try:
        # Save uploaded file
        zip_path = os.path.join(session_dir, file.filename)
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process files
        file_processor = FileProcessor(session_dir)
        extracted_files = file_processor.extract_zip(zip_path)

        # Analyze with OpenAI
        analyzer = OpenAIAnalyzer(api_key)
        analyses = await analyzer.analyze_documents(extracted_files)

        # Categorize risks
        risk_analyzer = RiskAnalyzer()
        categorized_risks = risk_analyzer.categorize_risks(analyses)

        # Generate report
        report_generator = ReportGenerator()
        report_path = os.path.join(REPORT_DIR, f"report_{session_id}.pdf")
        report_generator.generate_report(categorized_risks, report_path)

        return {
            "session_id": session_id,
            "status": "success",
            "analysis": categorized_risks,
            "report_url": f"/api/download/{session_id}",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        # Cleanup on error
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/api/download/{session_id}")
async def download_report(session_id: str):
    """Download the generated PDF report"""
    report_path = os.path.join(REPORT_DIR, f"report_{session_id}.pdf")

    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report not found")

    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=f"disclosure_analysis_{session_id}.pdf"
    )


@app.delete("/api/cleanup/{session_id}")
async def cleanup_session(session_id: str):
    """Clean up temporary files for a session"""
    session_dir = os.path.join(UPLOAD_DIR, session_id)
    report_path = os.path.join(REPORT_DIR, f"report_{session_id}.pdf")

    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)

    if os.path.exists(report_path):
        os.remove(report_path)

    return {"status": "cleaned", "session_id": session_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
