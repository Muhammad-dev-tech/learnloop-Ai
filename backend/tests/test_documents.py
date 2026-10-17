import pytest
import io
from pathlib import Path
from app.core.config import settings

@pytest.mark.asyncio
async def test_document_upload_chunking_and_rag_query(client, db_session):
    # 1. Register student
    reg = await client.post("/api/auth/register", json={
        "email": "doc_student@learnloop.edu",
        "password": "Password123!",
        "full_name": "Alan Turing"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload text syllabus file
    sample_text = (
        "Operating Systems Lecture Notes\n\n"
        "Concurrency and Process Synchronization:\n"
        "Mutual exclusion is a fundamental concurrency property ensuring that no two concurrent processes "
        "can enter their critical section at the same time. If a process is executing its critical section, "
        "all other processes must wait.\n\n"
        "Semaphores and Mutexes:\n"
        "A semaphore is a synchronization tool represented by an integer variable manipulated only by two "
        "atomic operations: wait() and signal(). Binary semaphores are commonly known as mutexes."
    )

    file_bytes = io.BytesIO(sample_text.encode("utf-8"))
    files = {"file": ("os_lecture_notes.txt", file_bytes, "text/plain")}

    upload_res = await client.post("/api/documents/upload", files=files, headers=headers)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["filename"] == "os_lecture_notes.txt"
    assert doc_data["file_type"] == "txt"
    assert doc_data["processing_status"] == "ready"
    assert doc_data["chunk_count"] >= 1
    doc_id = doc_data["id"]

    # 3. List documents
    list_res = await client.get("/api/documents/", headers=headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert len(docs) == 1
    assert docs[0]["id"] == doc_id

    # 4. Get document detail with chunks
    detail_res = await client.get(f"/api/documents/{doc_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["chunks"]) == doc_data["chunk_count"]
    assert any("critical section" in c["content"] for c in detail["chunks"])

    # 5. Perform RAG query
    query_res = await client.post(f"/api/documents/{doc_id}/query", json={
        "query": "What is mutual exclusion in concurrency?"
    }, headers=headers)
    assert query_res.status_code == 200
    rag_data = query_res.json()
    assert rag_data["document_id"] == doc_id
    assert len(rag_data["answer"]) > 10
    assert len(rag_data["citations"]) >= 1
    assert "Section" in rag_data["citations"][0]["page_or_section"] or "Page" in rag_data["citations"][0]["page_or_section"]

    # 6. Delete document
    del_res = await client.delete(f"/api/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify deletion
    verify_res = await client.get(f"/api/documents/{doc_id}", headers=headers)
    assert verify_res.status_code == 404

@pytest.mark.asyncio
async def test_document_account_isolation(client, db_session):
    # Student A
    reg_a = await client.post("/api/auth/register", json={
        "email": "student_owner@learnloop.edu",
        "password": "Password123!",
        "full_name": "Owner Student"
    })
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Student B
    reg_b = await client.post("/api/auth/register", json={
        "email": "student_intruder@learnloop.edu",
        "password": "Password123!",
        "full_name": "Intruder Student"
    })
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Student A uploads document
    sample_text = "Private thesis draft notes on neural networks and backpropagation."
    files = {"file": ("thesis_notes.txt", io.BytesIO(sample_text.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/documents/upload", files=files, headers=headers_a)
    doc_id = upload_res.json()["id"]

    # Student B attempts to access Student A's document -> 404 / denied
    forbidden_get = await client.get(f"/api/documents/{doc_id}", headers=headers_b)
    assert forbidden_get.status_code == 404

    forbidden_query = await client.post(f"/api/documents/{doc_id}/query", json={
        "query": "What are the thesis notes?"
    }, headers=headers_b)
    assert forbidden_query.status_code == 404

    forbidden_delete = await client.delete(f"/api/documents/{doc_id}", headers=headers_b)
    assert forbidden_delete.status_code == 404

    # Student B's document list must be empty
    list_b = await client.get("/api/documents/", headers=headers_b)
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0

@pytest.mark.asyncio
async def test_document_invalid_extension_rejected(client, db_session):
    reg = await client.post("/api/auth/register", json={
        "email": "format_test@learnloop.edu",
        "password": "Password123!",
        "full_name": "Format Tester"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload malicious/disallowed extension
    files = {"file": ("exploit.exe", io.BytesIO(b"binary data"), "application/x-msdownload")}
    res = await client.post("/api/documents/upload", files=files, headers=headers)
    assert res.status_code == 400
    assert "Unsupported file format" in res.json()["detail"]
