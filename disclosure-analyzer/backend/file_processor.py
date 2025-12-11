"""
File processing utilities for extracting and parsing disclosure documents
"""
import os
import zipfile
import PyPDF2
import pdfplumber
from typing import List, Dict
import re


class FileProcessor:
    """Handles extraction and parsing of disclosure package files"""

    def __init__(self, session_dir: str):
        self.session_dir = session_dir
        self.extracted_dir = os.path.join(session_dir, "extracted")
        os.makedirs(self.extracted_dir, exist_ok=True)

    def extract_zip(self, zip_path: str) -> List[Dict[str, str]]:
        """
        Extract ZIP file and parse PDFs

        Args:
            zip_path: Path to the ZIP file

        Returns:
            List of dictionaries containing file info and extracted text
        """
        extracted_files = []

        # Extract ZIP
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(self.extracted_dir)

        # Process all PDF files
        for root, dirs, files in os.walk(self.extracted_dir):
            for filename in files:
                if filename.lower().endswith('.pdf'):
                    file_path = os.path.join(root, filename)
                    text = self._extract_pdf_text(file_path)

                    if text:
                        file_info = {
                            'filename': filename,
                            'path': file_path,
                            'text': text,
                            'document_type': self._classify_document(filename),
                            'page_count': self._get_page_count(file_path)
                        }
                        extracted_files.append(file_info)

        return extracted_files

    def _extract_pdf_text(self, pdf_path: str) -> str:
        """
        Extract text from PDF using multiple methods for robustness

        Args:
            pdf_path: Path to PDF file

        Returns:
            Extracted text
        """
        text = ""

        # Try pdfplumber first (better for complex PDFs)
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
        except Exception as e:
            print(f"pdfplumber failed for {pdf_path}: {e}")

        # Fallback to PyPDF2
        if not text:
            try:
                with open(pdf_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n\n"
            except Exception as e:
                print(f"PyPDF2 failed for {pdf_path}: {e}")

        return text.strip()

    def _get_page_count(self, pdf_path: str) -> int:
        """Get the number of pages in a PDF"""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                return len(pdf_reader.pages)
        except:
            return 0

    def _classify_document(self, filename: str) -> str:
        """
        Classify document type based on filename

        Args:
            filename: Name of the file

        Returns:
            Document type classification
        """
        filename_lower = filename.lower()

        # Document type classifications based on common California disclosure documents
        classifications = {
            'home_inspection': ['home inspection', 'home_inspection', 'inspection report'],
            'roof_inspection': ['roof', 'roofing'],
            'pest_inspection': ['pest', 'termite', 'wallace'],
            'property_disclosure': ['tds', 'transfer disclosure', 'property disclosure'],
            'seller_questionnaire': ['spq', 'seller property questionnaire', 'questionnaire'],
            'lead_paint': ['lpd', 'lead', 'paint'],
            'natural_hazard': ['nhd', 'natural hazard', 'hazard disclosure'],
            'hoa_documents': ['hoa', 'cc&r', 'cccddda'],
            'water_report': ['water', 'whsd', 'wcmd', 'plumbing'],
            'advisory': ['advisory', 'market conditions', 'sbsa'],
            'wildfire': ['wildfire', 'wfda', 'fire'],
            'affidavit': ['affidavit', 'firpta'],
            'preliminary_report': ['preliminary', 'title'],
            'square_footage': ['sfls', 'square footage', 'lot size'],
            'coversheet': ['coversheet', 'cover sheet']
        }

        for doc_type, keywords in classifications.items():
            for keyword in keywords:
                if keyword in filename_lower:
                    return doc_type

        return 'other'
