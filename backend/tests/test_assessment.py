import pytest
from app.core.seed import seed_curriculum_if_empty
from sqlalchemy import select
from app.models.assessment import Question

@pytest.mark.asyncio
async def test_quiz_generation_submission_and_stats(client, db_session):
    # Seed curriculum
    await seed_curriculum_if_empty(db_session)

    # 1. Register student
    reg = await client.post("/api/auth/register", json={
        "email": "quiz_student@learnloop.edu",
        "password": "Password123!",
        "full_name": "Katherine Johnson"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get topic ID
    sub_res = await client.get("/api/academic/subjects")
    topics = sub_res.json()[0]["topics"]
    target_topic = topics[0]

    # 3. Generate formative quiz
    gen_res = await client.post("/api/assessment/generate", json={
        "topic_id": target_topic["id"],
        "difficulty": "intermediate",
        "count": 3
    }, headers=headers)
    assert gen_res.status_code == 201
    questions = gen_res.json()
    assert len(questions) >= 2

    # Verify student question view DOES NOT reveal correct_answer or explanation
    for q in questions:
        assert "correct_answer" not in q
        assert "explanation" not in q
        assert "question_text" in q
        assert len(q["options"]) >= 2

    q1_id = questions[0]["id"]
    q2_id = questions[1]["id"]

    # Look up server-side correct answer from DB for testing evaluation
    q1_db = (await db_session.execute(select(Question).where(Question.id == q1_id))).scalars().first()
    q2_db = (await db_session.execute(select(Question).where(Question.id == q2_id))).scalars().first()

    # 4. Submit correct answer for Q1
    sub1_res = await client.post("/api/assessment/submit", json={
        "question_id": q1_id,
        "selected_answer": q1_db.correct_answer
    }, headers=headers)
    assert sub1_res.status_code == 200
    sub1_data = sub1_res.json()
    assert sub1_data["is_correct"] is True
    assert sub1_data["score"] == 1.0
    assert sub1_data["correct_answer"] == q1_db.correct_answer
    assert len(sub1_data["explanation"]) > 5

    # 5. Submit intentionally incorrect answer for Q2
    sub2_res = await client.post("/api/assessment/submit", json={
        "question_id": q2_id,
        "selected_answer": "Completely Incorrect Choice"
    }, headers=headers)
    assert sub2_res.status_code == 200
    sub2_data = sub2_res.json()
    assert sub2_data["is_correct"] is False
    assert sub2_data["score"] == 0.0

    # 6. Fetch quiz attempt history
    hist_res = await client.get("/api/assessment/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 2

    # 7. Check performance stats
    stats_res = await client.get("/api/assessment/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_attempts"] == 2
    assert stats["correct_attempts"] == 1
    assert stats["accuracy_rate"] == 50.0

@pytest.mark.asyncio
async def test_assessment_multi_student_isolation(client, db_session):
    await seed_curriculum_if_empty(db_session)

    # Student A
    reg_a = await client.post("/api/auth/register", json={
        "email": "student_alpha_quiz@learnloop.edu",
        "password": "Password123!",
        "full_name": "Student Alpha"
    })
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Student B
    reg_b = await client.post("/api/auth/register", json={
        "email": "student_beta_quiz@learnloop.edu",
        "password": "Password123!",
        "full_name": "Student Beta"
    })
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Generate question and submit attempt for Student A
    sub_res = await client.get("/api/academic/subjects")
    topic_id = sub_res.json()[0]["topics"][0]["id"]

    gen_res = await client.post("/api/assessment/generate", json={
        "topic_id": topic_id,
        "difficulty": "beginner",
        "count": 2
    }, headers=headers_a)
    q_id = gen_res.json()[0]["id"]

    await client.post("/api/assessment/submit", json={
        "question_id": q_id,
        "selected_answer": "Test answer"
    }, headers=headers_a)

    # Student B history and stats must be empty (strict tenant isolation)
    hist_b = await client.get("/api/assessment/history", headers=headers_b)
    assert hist_b.status_code == 200
    assert len(hist_b.json()) == 0

    stats_b = await client.get("/api/assessment/stats", headers=headers_b)
    assert stats_b.status_code == 200
    assert stats_b.json()["total_attempts"] == 0
    assert stats_b.json()["accuracy_rate"] == 0.0
