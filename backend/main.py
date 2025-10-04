# main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA
import pdfplumber, mammoth
import os

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

documents_texts = []
vector_store = None
qa_chain = None

# Extract text from uploaded file
async def extract_text(file: UploadFile):
    filename = file.filename.lower()
    content = ""
    if filename.endswith(".txt"):
        content = (await file.read()).decode('utf-8')
    elif filename.endswith(".pdf"):
        import io
        pdf_bytes = io.BytesIO(await file.read())
        with pdfplumber.open(pdf_bytes) as pdf:
            for page in pdf.pages:
                content += page.extract_text() + "\n"
    elif filename.endswith(".docx") or filename.endswith(".doc"):
        result = await mammoth.extract_raw_text(await file.read())
        content = result.value
    return content

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    global documents_texts, vector_store, qa_chain
    text = await extract_text(file)
    documents_texts.append(text)

    # Split text into chunks
    text_splitter = CharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.split_text(text)

    # Create embeddings
    embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))
    vector_store = FAISS.from_texts(chunks, embeddings)

    # Create retrieval QA chain
    qa_chain = RetrievalQA.from_chain_type(
        llm=embeddings,
        retriever=vector_store.as_retriever()
    )

    return {"message": "Document uploaded and processed successfully"}

@app.post("/ask")
async def ask_question(question: str):
    global qa_chain
    if not qa_chain:
        return {"answer": "No documents uploaded yet!"}
    result = qa_chain.run(question)
    return {"answer": result}
