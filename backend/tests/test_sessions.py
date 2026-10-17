import pytest
from app.core.seed import seed_curriculum_if_empty

@pytest.mark.asyncio
async def test_session_lifecycle_and_ai_tutor_conversation(client, db_session):
    # Seed curriculum
    await seed_curriculum_if_empty(db_session)

    # 1. Register student
    reg_res = await client.post("/api/auth/register", json={
        "email": "student1@learnloop.edu",
        "password": "Password123!",
        "full_name": "Ada Lovelace"
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get topics to get an ID
    res_subjects = await client.get("/api/academic/subjects")
    topics = res_subjects.json()[0]["topics"]
    target_topic = topics[0]

    # 3. Create learning session
    session_res = await client.post("/api/sessions/", json={
        "topic_id": target_topic["id"],
        "session_type": "topic",
        "current_difficulty": "beginner",
        "learning_mode": "tutor"
    }, headers=headers)
    assert session_res.status_code == 201
    session_data = session_res.json()
    assert session_data["topic_name"] == target_topic["name"]
    assert session_data["current_difficulty"] == "beginner"
    assert session_data["learning_mode"] == "tutor"
    assert len(session_data["messages"]) == 1
    assert session_data["messages"][0]["role"] == "assistant"
    session_id = session_data["id"]

    # 4. Send student message
    msg_res = await client.post(f"/api/sessions/{session_id}/messages", json={
        "content": "Can you explain how a stack follows LIFO order?"
    }, headers=headers)
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["user_message"]["role"] == "user"
    assert "LIFO" in msg_data["user_message"]["content"]
    assert msg_data["assistant_message"]["role"] == "assistant"
    assert len(msg_data["assistant_message"]["content"]) > 10

    # 5. Fetch session details and history
    detail_res = await client.get(f"/api/sessions/{session_id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert len(detail_data["messages"]) == 3  # initial greeting + user msg + assistant reply

    # 6. List user sessions
    list_res = await client.get("/api/sessions/", headers=headers)
    assert list_res.status_code == 200
    user_sessions = list_res.json()
    assert len(user_sessions) == 1
    assert user_sessions[0]["id"] == session_id

@pytest.mark.asyncio
async def test_session_multi_student_isolation(client, db_session):
    # Seed curriculum
    await seed_curriculum_if_empty(db_session)

    # Student 1
    reg1 = await client.post("/api/auth/register", json={
        "email": "student_alpha@learnloop.edu",
        "password": "Password123!",
        "full_name": "Alpha Student"
    })
    token1 = reg1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Student 2
    reg2 = await client.post("/api/auth/register", json={
        "email": "student_beta@learnloop.edu",
        "password": "Password123!",
        "full_name": "Beta Student"
    })
    token2 = reg2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Student 1 creates session
    res_subjects = await client.get("/api/academic/subjects")
    topic_id = res_subjects.json()[0]["topics"][0]["id"]

    session_res = await client.post("/api/sessions/", json={
        "topic_id": topic_id,
        "current_difficulty": "intermediate",
        "learning_mode": "challenge"
    }, headers=headers1)
    session_id = session_res.json()["id"]

    # Student 2 attempts to access Student 1's session -> Must be 404 / denied
    forbidden_get = await client.get(f"/api/sessions/{session_id}", headers=headers2)
    assert forbidden_get.status_code == 404

    forbidden_msg = await client.post(f"/api/sessions/{session_id}/messages", json={
        "content": "Intruder attempting to inject message"
    }, headers=headers2)
    assert forbidden_msg.status_code == 404

    # Student 2's session list must be empty
    list2 = await client.get("/api/sessions/", headers=headers2)
    assert list2.status_code == 200
    assert len(list2.json()) == 0
