import pytest
from app.core.seed import seed_curriculum_if_empty

@pytest.mark.asyncio
async def test_academic_curriculum_seeding_and_endpoints(client, db_session):
    # Seed in-memory database with curriculum
    await seed_curriculum_if_empty(db_session)

    # 1. Fetch subjects
    res = await client.get("/api/academic/subjects")
    assert res.status_code == 200
    subjects = res.json()
    assert len(subjects) >= 2
    subject_names = [s["name"] for s in subjects]
    assert "Computer Science & Software Engineering" in subject_names
    assert "Mathematics for Computing" in subject_names

    cs_subject = next(s for s in subjects if "Computer Science" in s["name"])
    assert len(cs_subject["topics"]) >= 5
    topic_names = [t["name"] for t in cs_subject["topics"]]
    assert "Data Structures & Algorithms" in topic_names

    # 2. Fetch specific topic details
    topic_id = cs_subject["topics"][0]["id"]
    res_topic = await client.get(f"/api/academic/topics/{topic_id}")
    assert res_topic.status_code == 200
    topic_data = res_topic.json()
    assert topic_data["name"] == cs_subject["topics"][0]["name"]
    assert len(topic_data["learning_objectives"]) >= 3

    # 3. Fetch objectives endpoint
    res_obj = await client.get(f"/api/academic/topics/{topic_id}/objectives")
    assert res_obj.status_code == 200
    objectives = res_obj.json()
    assert len(objectives) >= 3
    assert "Big-O" in objectives[0]["objective_text"] or any("Big-O" in o["objective_text"] for o in objectives)

@pytest.mark.asyncio
async def test_academic_nonexistent_topic_404(client, db_session):
    res = await client.get("/api/academic/topics/99999")
    assert res.status_code == 404
