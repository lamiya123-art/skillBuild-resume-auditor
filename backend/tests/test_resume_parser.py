import pytest
import io
import fitz
from app.services.resume_parser import (
    normalize_text, validate_extracted_text, 
    extract_pdf_text, extract_docx_text, extract_txt_text,
    extract_and_validate_resume, validate_llm_profile_output,
    detect_resume_sections, detect_tesseract_binary
)

def test_normalize_text_preserves_tech_punctuation():
    raw = "  Experience with C++, C#, .NET 8, Node.js, Next.js, and React.js \x00\x01\n\n\nDeveloping FastAPI services.  "
    norm = normalize_text(raw)
    assert "C++" in norm
    assert "C#" in norm
    assert ".NET" in norm
    assert "Node.js" in norm
    assert "Next.js" in norm
    assert "React.js" in norm
    assert "FastAPI" in norm
    assert "\x00" not in norm

def test_validate_extracted_text_detects_corrupted_symbol_noise():
    corrupted_text = "Z D% Vz Ov% 3*] IZ @#$ %^&* ()! # " * 5
    quality = validate_extracted_text(corrupted_text, page_count=1)
    assert quality.status != "PASS"
    assert quality.score < 50.0

def test_validate_extracted_text_passes_valid_resume():
    valid_resume = """
    John Engineer
    Software Developer | Email: john.engineer@dev.io | GitHub: github.com/johnengineer
    
    Summary:
    Experienced Backend Developer specializing in Python, FastAPI, Docker, and PostgreSQL.
    
    Work Experience:
    Software Engineer at Cloud Tech (2022 - Present)
    - Developed REST APIs using FastAPI and PostgreSQL handling 1M daily requests.
    - Containerized applications with Docker and Kubernetes for AWS deployment.
    
    Education:
    B.S. in Computer Science - State University (2021)
    """
    quality = validate_extracted_text(valid_resume, page_count=1)
    assert quality.status == "PASS"
    assert quality.score >= 80.0
    assert quality.has_email is True
    assert quality.has_date is True
    assert "SUMMARY" in quality.detected_sections
    assert "EXPERIENCE" in quality.detected_sections
    assert "EDUCATION" in quality.detected_sections

def test_pymupdf_valid_pdf_extraction():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Jane Developer\nFull Stack Engineer\nEmail: jane@dev.io\n\nSummary:\nExperienced Software Engineer with Python, FastAPI, Docker, C++, and PostgreSQL.\n\nWork Experience:\nSenior Engineer at Tech Corp (2022 - Present)\n\nEducation:\nB.S. Computer Science (2021)")
    pdf_bytes = doc.tobytes()
    doc.close()

    res = extract_pdf_text(pdf_bytes, "test_resume.pdf")
    assert res.extraction_method == "pymupdf"
    assert res.quality.status == "PASS"
    assert res.character_count > 200
    assert "FastAPI" in res.normalized_text
    assert "C++" in res.normalized_text

def test_empty_pdf_bytes_returns_empty_status():
    res = extract_pdf_text(b"", "empty.pdf")
    assert res.quality.status == "EMPTY_PDF"
    assert res.character_count == 0

def test_invalid_pdf_header_returns_invalid_status():
    invalid_bytes = b"NOT_A_PDF_FILE_HEADER"
    res = extract_pdf_text(invalid_bytes, "fake.pdf")
    assert res.quality.status == "INVALID_PDF"

def test_encrypted_pdf_detection():
    doc = fitz.open()
    doc.new_page()
    # Save with user password
    pdf_bytes = doc.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="secret")
    doc.close()

    res = extract_pdf_text(pdf_bytes, "encrypted.pdf")
    assert res.quality.status == "ENCRYPTED_PDF"
    assert "password-protected" in res.quality.warnings[0]

def test_scanned_pdf_without_ocr_returns_descriptive_status():
    doc = fitz.open()
    doc.new_page()  # Blank page without text
    pdf_bytes = doc.tobytes()
    doc.close()

    res = extract_pdf_text(pdf_bytes, "scanned.pdf")
    assert res.quality.status in ["SCANNED_PDF", "SCANNED_PDF_NO_OCR"]

def test_validate_llm_profile_output_strips_hallucinated_skills_and_fake_emails():
    source_resume = "Candidate Resume for Alice Developer. Skills: Python, FastAPI, Docker."
    llm_output = {
        "name": "Alice Developer",
        "email": "candidate@skillproof.io",
        "skills": ["Python", "FastAPI", "Go", "Docker"]
    }
    
    verified, score = validate_llm_profile_output(llm_output, source_resume)
    assert verified["email"] is None
    assert "Go" not in verified["skills"]
    assert "Python" in verified["skills"]

def test_anti_fabrication_regression_rejects_garbage_profiles():
    garbage = "Z D% Vz Ov% 3*] IZ"
    quality = validate_extracted_text(garbage, page_count=1)
    assert quality.status != "PASS"
