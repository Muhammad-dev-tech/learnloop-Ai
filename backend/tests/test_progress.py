import pytest
from app.core.seed import seed_curriculum_if_empty
from sqlalchemy import select
from app.models.assessment import Question

@pytest.mark.asyncio
async def test_knowledge_tracing_and_mastery_analytics(client, db_session):
    # Seed curriculum
    await seed_curriculum_if_empty(db_session)

    # 1. Register student
    reg = await client.post("/api/auth/register", json={
        "email": "progress_student@learnloop.edu",
        "password": "Password123!",
        "full_name": "Claude Shannon"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get topic
    sub_res = await client.get("/api/academic/subjects")
    topic = sub_res.json()[0]["topics"][0]
    topic_id = topic["id"]

    # 3. Initially, summary should be empty
    init_res = await client.get("/api/progress/summary", headers=headers)
    assert init_res.status_code == 200
    assert init_res.json()["total_topics_practiced"] == 0
    assert init_res.json()["overall_mastery_index"] == 0.0

    # 4. Generate questions
    gen_res = await client.post("/api/assessment/generate", json={
        "topic_id": topic_id,
        "difficulty": "beginner",
        "count": 3
    }, headers=headers)
    questions = gen_res.json()
    q1 = questions[0]
    q2 = questions[1]

    # Look up correct answers
    q1_db = (await db_session.execute(select(Question).where(Question.id == q1["id"]))).scalars().first()
    q2_db = (await db_session.execute(select(Question).where(Question.id == q2["id"]))).scalars().first()

    # 5. Submit correct answer for Q1
    await client.post("/api/assessment/submit", json={
        "question_id": q1["id"],
        "selected_answer": q1_db.correct_answer
    }, headers=headers)

    # 6. Submit correct answer again for Q1 to build mastery
    await client.post("/api/assessment/submit", json={
        "question_id": q1["id"],
        "selected_answer": q1_db.correct_answer
    }, headers=headers)

    # 7. Submit intentionally incorrect answer for Q2 to record misconception
    await client.post("/api/assessment/submit", json={
        "question_id": q2["id"],
        "selected_answer": "Wrong answer"
    }, headers=headers)

    # 8. Check summary endpoint
    summary_res = await client.get("/api/progress/summary", headers=headers)
    assert summary_res.status_code == 200
    data = summary_res.json()
    assert data["total_topics_practiced"] == 1
    assert data["total_questions_answered"] == 3
    assert data["overall_mastery_index"] > 0.0

    topic_prog = data["topic_progress"][0]
    assert topic_prog["topic_id"] == topic_id
    assert topic_prog["total_attempts"] == 3
    assert topic_prog["correct_attempts"] == 2
    assert topic_prog["estimated_mastery"] > 0.0

    # 9. Dismiss recommendation if any generated
    if data["active_recommendations"]:
        rec_id = data["active_recommendations"][0]["id"]
        dismiss_res = await client.post(f"/api/progress/recommendations/{rec_id}/dismiss", headers=headers)
        assert dismiss_res.status_code == 200
        assert dismiss_res.json()["status"] == "dismissed"

@pytest.mark.asyncio
async def test_progress_multi_student_isolation(client, db_session):
    await seed_curriculum_if_empty(db_session)

    # Student A
    reg_a = await client.post("/api/auth/register", json={
        "email": "student_alpha_prog@learnloop.edu",
        "password": "Password123!",
        "full_name": "Student Alpha"
    })
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Student B
    reg_b = await client.post("/api/auth/register", json={
        "email": "student_beta_prog@learnloop.edu",
        "password": "Password123!",
        "full_name": "Student Beta"
    })
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Student A submits quiz answer
    sub_res = await client.get("/api/academic/subjects")
    topic_id = sub_res.json()[0]["topics"][0]["id"]
    gen_res = await client.post("/api/assessment/generate", json={"topic_id": topic_id, "count": 2}, headers=headers_a)
    q_id = gen_res.json()[0]["id"]
    await client.post("/api/assessment/submit", json={"question_id": q_id, "selected_answer": "ans"}, headers=headers_a)

    # Student A summary has 1 practiced topic
    summary_a = await client.get("/api/progress/summary", headers=headers_a)
    assert summary_a.json()["total_topics_practiced"] == 1

    # Student B summary must be completely empty (isolated)
    summary_b = await client.get("/api/progress/summary", headers=headers_b)
    assert summary_b.json()["total_topics_practiced"] == 0
    assert summary_b.json()["overall_mastery_index"] == 0.0
