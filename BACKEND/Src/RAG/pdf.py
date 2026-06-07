from pypdf import PdfReader
from PIL import Image
import pytesseract
from docx import Document
def extract_text_from_pdf(file_path):
    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:
        text += page.extract_text() or ""

    return text
def extract_text_from_image(file_path):
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        print("OCR Error:", e)
        return ""
    
def extract_text_from_txt(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except:
        return ""

def extract_text_from_docx(file_path):
    try:
        doc = Document(file_path)
        text = ""

        for para in doc.paragraphs:
            text += para.text + "\n"

        return text
    except:
        return ""    