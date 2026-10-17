import { Subject, Topic } from '../types/academic';

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await fetch('/api/academic/subjects');
  if (!res.ok) {
    throw new Error('Failed to fetch academic curriculum subjects');
  }
  return res.json();
}

export async function fetchTopicDetail(topicId: number): Promise<Topic> {
  const res = await fetch(`/api/academic/topics/${topicId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch topic details for ID ${topicId}`);
  }
  return res.json();
}
