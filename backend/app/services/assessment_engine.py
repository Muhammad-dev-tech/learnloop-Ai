import json
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_QUESTIONS = {
    "Data Structures & Algorithms": [
        {
            "question_type": "multiple_choice",
            "question_text": "What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_answer": "O(n)",
            "explanation": "In an unbalanced BST (e.g., when elements are inserted in sorted order), the tree degenerates into a linked list, requiring linear O(n) traversal in the worst case.",
            "difficulty": "beginner",
            "misconception_tag": "bst_skew_degeneration"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Which data structure operates strictly on a First-In, First-Out (FIFO) principle?",
            "options": ["Stack", "Queue", "Priority Queue", "Binary Heap"],
            "correct_answer": "Queue",
            "explanation": "A Queue operates on the FIFO principle, where elements are inserted at the rear and removed from the front.",
            "difficulty": "beginner",
            "misconception_tag": "fifo_vs_lifo"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Which sorting algorithm achieves an optimal worst-case time complexity of O(n log n) while guaranteeing stability?",
            "options": ["Quicksort", "Heapsort", "Mergesort", "Selection Sort"],
            "correct_answer": "Mergesort",
            "explanation": "Mergesort guarantees O(n log n) time complexity in all cases and preserves the relative order of duplicate elements (stability), unlike standard Heapsort or Quicksort.",
            "difficulty": "intermediate",
            "misconception_tag": "sorting_stability"
        }
    ],
    "Operating Systems & Concurrency": [
        {
            "question_type": "multiple_choice",
            "question_text": "Which of the following is NOT one of Coffman's four necessary conditions for a deadlock to occur?",
            "options": ["Mutual Exclusion", "Hold and Wait", "No Preemption", "Paging Fragmentation"],
            "correct_answer": "Paging Fragmentation",
            "explanation": "Coffman's four necessary deadlock conditions are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Paging fragmentation is a memory management issue.",
            "difficulty": "intermediate",
            "misconception_tag": "coffman_deadlock_conditions"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What is the primary role of the Translation Lookaside Buffer (TLB) in virtual memory?",
            "options": [
                "To store recent disk I/O blocks",
                "To cache recent virtual-to-physical address translations",
                "To schedule thread execution priority",
                "To resolve page faults from swap space"
            ],
            "correct_answer": "To cache recent virtual-to-physical address translations",
            "explanation": "The TLB is a high-speed hardware cache used by the MMU to store recent page-table translations, reducing memory lookup latency.",
            "difficulty": "intermediate",
            "misconception_tag": "tlb_hardware_caching"
        }
    ],
    "Database Management Systems": [
        {
            "question_type": "multiple_choice",
            "question_text": "Which normal form requires that a relation is in 2NF and has no transitive functional dependencies between non-prime attributes?",
            "options": ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
            "correct_answer": "Third Normal Form (3NF)",
            "explanation": "3NF requires the table to be in 2NF and that no non-key attribute is transitively dependent on the primary key.",
            "difficulty": "intermediate",
            "misconception_tag": "normalization_transitive_dependency"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "In ACID transaction properties, what does 'Atomicity' guarantee?",
            "options": [
                "Transactions execute in complete isolation from one another",
                "All operations in a transaction succeed completely or none take effect",
                "The database remains in a valid state following the transaction",
                "Committed transaction data survives unexpected system crashes"
            ],
            "correct_answer": "All operations in a transaction succeed completely or none take effect",
            "explanation": "Atomicity ensures the all-or-nothing property: if any part of the transaction fails, the entire transaction is rolled back.",
            "difficulty": "beginner",
            "misconception_tag": "acid_properties"
        }
    ]
}

def generate_fallback_quiz(topic_name: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
    """Provides high-yield, verified fallback quiz questions when offline or in testing."""
    for key, q_list in FALLBACK_QUESTIONS.items():
        if key.lower() in topic_name.lower() or topic_name.lower() in key.lower():
            return q_list[:count]

    # Generic high-quality STEM fallback
    return [
        {
            "question_type": "multiple_choice",
            "question_text": f"Which fundamental principle is central to mastering {topic_name} at the {difficulty} level?",
            "options": [
                "Ensuring deterministic state transformations under computational constraints",
                "Maximizing heap fragmentation for dynamic allocation",
                "Bypassing runtime validation to optimize CPU clock cycles",
                "Eliminating algorithmic complexity analysis"
            ],
            "correct_answer": "Ensuring deterministic state transformations under computational constraints",
            "explanation": f"In {topic_name}, establishing predictable, verifiable state behavior under resource constraints is essential.",
            "difficulty": difficulty,
            "misconception_tag": "core_principle_integrity"
        },
        {
            "question_type": "true_false",
            "question_text": f"True or False: In {topic_name}, asymptotic time complexity always accounts for constant-factor hardware optimizations.",
            "options": ["True", "False"],
            "correct_answer": "False",
            "explanation": "Asymptotic Big-O notation intentionally suppresses constant coefficients and lower-order terms to model asymptotic growth rates.",
            "difficulty": difficulty,
            "misconception_tag": "asymptotic_constants"
        }
    ][:count]

async def generate_quiz_questions(
    topic_name: str,
    objectives: List[str],
    difficulty: str = "intermediate",
    count: int = 4,
    document_context: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Invokes Gemini 3.8 Flash to generate structured, curriculum-aligned formative quiz questions.
    Returns: List of questions with options, correct answer, explanation, and misconception tags.
    """
    if not settings.is_gemini_configured:
        logger.info("Gemini unconfigured; returning fallback quiz questions.")
        return generate_fallback_quiz(topic_name, difficulty, count)

    obj_text = "\n".join([f"- {o}" for o in objectives[:4]]) if objectives else f"Core topics of {topic_name}"
    doc_prompt = f"\nGround questions strictly in these course materials:\n{document_context[:1500]}\n" if document_context else ""

    system_instruction = (
        "You are LearnLoop AI's Automated Assessment Architect.\n"
        "Generate a rigorous diagnostic formative quiz for students.\n"
        "Return ONLY a valid JSON array of objects without markdown formatting or code block quotes. "
        "Each object must follow this exact schema:\n"
        "[\n"
        "  {\n"
        "    \"question_type\": \"multiple_choice\",\n"
        "    \"question_text\": \"...\",\n"
        "    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
        "    \"correct_answer\": \"Option A\",\n"
        "    \"explanation\": \"Detailed pedagogical explanation of why Option A is correct and why other choices fail.\",\n"
        "    \"difficulty\": \"" + difficulty + "\",\n"
        "    \"misconception_tag\": \"specific_error_concept\"\n"
        "  }\n"
        "]"
    )

    user_prompt = (
        f"Topic: {topic_name}\n"
        f"Difficulty: {difficulty}\n"
        f"Number of Questions: {count}\n"
        f"Learning Objectives:\n{obj_text}\n"
        f"{doc_prompt}\n"
        f"Create {count} distinct multiple-choice questions testing deep conceptual comprehension and problem solving. "
        f"Include tricky, realistic distractors that capture common student misconceptions."
    )

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
                response_mime_type="application/json",
            )
        )

        response_text = response.text.strip()
        # Clean any accidental markdown fence if present
        if response_text.startswith("```"):
            response_text = response_text.strip("`").lstrip("json").strip()

        data = json.loads(response_text)
        if isinstance(data, list) and len(data) > 0:
            return data[:count]
        return generate_fallback_quiz(topic_name, difficulty, count)

    except Exception as e:
        logger.error(f"Error generating AI quiz questions: {e}. Falling back to pre-seeded bank.")
        return generate_fallback_quiz(topic_name, difficulty, count)

def evaluate_answer(
    selected_answer: str,
    correct_answer: str,
    explanation: str,
    misconception_tag: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates a student's answer submission.
    Provides automated scoring (0.0 to 1.0) and personalized diagnostic feedback.
    """
    clean_student = selected_answer.strip().lower()
    clean_correct = correct_answer.strip().lower()

    # Exact or substring match check
    is_correct = (clean_student == clean_correct) or (
        len(clean_student) > 2 and clean_student in clean_correct
    ) or (
        len(clean_correct) > 2 and clean_correct in clean_student
    )

    if is_correct:
        feedback = f"Excellent! That is correct. {explanation}"
        score = 1.0
        misconception = None
    else:
        tag_info = f" (Focus Area: {misconception_tag.replace('_', ' ').capitalize()})" if misconception_tag else ""
        feedback = f"Not quite. The correct answer is: '{correct_answer}'. {explanation}{tag_info}"
        score = 0.0
        misconception = misconception_tag

    return {
        "is_correct": is_correct,
        "score": score,
        "feedback": feedback,
        "misconception_tag": misconception
    }
