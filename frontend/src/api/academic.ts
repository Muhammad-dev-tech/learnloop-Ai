import { Subject, Topic } from '../types/academic';
import { API_BASE_URL } from './config';

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await fetch(`${API_BASE_URL}/api/academic/subjects`);
  if (!res.ok) {
    throw new Error('Failed to fetch academic curriculum subjects');
  }
  return res.json();
}

export async function fetchTopicDetail(topicId: number): Promise<Topic> {
  const res = await fetch(`${API_BASE_URL}/api/academic/topics/${topicId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch topic details for ID ${topicId}`);
  }
  return res.json();
}
