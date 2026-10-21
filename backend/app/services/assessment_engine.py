import json
import logging
import random
import re
import asyncio
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

# Comprehensive, multi-tiered question bank for instant resilience & offline variety
CURRICULUM_QUESTION_BANK = {
    "Data Structures & Algorithms": [
        {
            "question_type": "multiple_choice",
            "question_text": "What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_answer": "O(n)",
            "explanation": "In an unbalanced BST, items inserted in monotonic order degenerate into a linear chain (linked list), requiring O(n) worst-case traversal.",
            "difficulty": "beginner",
            "misconception_tag": "bst_skew_degeneration"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Which data structure operates strictly on a First-In, First-Out (FIFO) principle?",
            "options": ["Stack", "Queue", "Priority Queue", "Binary Heap"],
            "correct_answer": "Queue",
            "explanation": "A Queue operates on FIFO where elements are enqueued at the back and dequeued from the front.",
            "difficulty": "beginner",
            "misconception_tag": "fifo_vs_lifo"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Which sorting algorithm guarantees O(n log n) worst-case time complexity while preserving stability?",
            "options": ["Quicksort", "Heapsort", "Mergesort", "Selection Sort"],
            "correct_answer": "Mergesort",
            "explanation": "Mergesort guarantees O(n log n) in all cases (worst, average, best) and preserves the relative ordering of equivalent keys (stability).",
            "difficulty": "intermediate",
            "misconception_tag": "sorting_stability"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "In a min-heap with n elements, what is the time complexity of the extract-min operation?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_answer": "O(log n)",
            "explanation": "Extracting the minimum root element requires replacing it with the last leaf and bubbling down (sift-down), which takes O(log n) time.",
            "difficulty": "intermediate",
            "misconception_tag": "heap_extract_min_complexity"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Which graph traversal strategy uses a Queue and is guaranteed to find the shortest path in an unweighted graph?",
            "options": ["Breadth-First Search (BFS)", "Depth-First Search (DFS)", "Dijkstra's Algorithm", "Bellman-Ford Algorithm"],
            "correct_answer": "Breadth-First Search (BFS)",
            "explanation": "BFS explores vertices level by level using a FIFO queue, guaranteeing minimal edge traversal distances in unweighted graphs.",
            "difficulty": "beginner",
            "misconception_tag": "bfs_vs_dfs_pathfinding"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What is the amortized time complexity of inserting an element into a dynamic resizing array (like Python list or Java ArrayList)?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
            "correct_answer": "O(1)",
            "explanation": "Although doubling the array takes O(n) occasionally, spreading the cost across all n insertions yields an amortized O(1) time per append.",
            "difficulty": "intermediate",
            "misconception_tag": "amortized_vs_worst_case"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "In hash table collision resolution using open addressing with linear probing, what primary performance hazard occurs?",
            "options": ["Primary Clustering", "Stack Overflow", "Dangling Pointers", "B-Tree Splitting"],
            "correct_answer": "Primary Clustering",
            "explanation": "Linear probing tends to form long contiguous occupied slots (primary clustering), severely degrading lookup performance toward O(n).",
            "difficulty": "advanced",
            "misconception_tag": "hash_table_clustering"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "How many comparisons does Binary Search perform in the worst case for a sorted array of 1024 elements?",
            "options": ["10", "11", "512", "1024"],
            "correct_answer": "11",
            "explanation": "Worst case comparisons in binary search is floor(log2(n)) + 1. For 1024 elements, log2(1024) = 10, so at most 11 comparisons.",
            "difficulty": "intermediate",
            "misconception_tag": "binary_search_log_bound"
        }
    ],
    "Operating Systems & Concurrency": [
        {
            "question_type": "multiple_choice",
            "question_text": "Which of the following is NOT one of Coffman's four necessary conditions for deadlock?",
            "options": ["Mutual Exclusion", "Hold and Wait", "No Preemption", "Paging Fragmentation"],
            "correct_answer": "Paging Fragmentation",
            "explanation": "Coffman's four conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Paging fragmentation is a memory management artifact.",
            "difficulty": "intermediate",
            "misconception_tag": "coffman_deadlock_conditions"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What is the primary role of the Translation Lookaside Buffer (TLB)?",
            "options": [
                "Cache recent virtual-to-physical address translations",
                "Store recent disk I/O blocks in memory",
                "Schedule CPU execution priority queues",
                "Resolve page faults from secondary swap space"
            ],
            "correct_answer": "Cache recent virtual-to-physical address translations",
            "explanation": "The TLB is a high-speed associative hardware cache used by the MMU to accelerate virtual memory address translation.",
            "difficulty": "intermediate",
            "misconception_tag": "tlb_hardware_caching"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What condition occurs when a low-priority process is starved of CPU time because high-priority processes monopolize the scheduler?",
            "options": ["Starvation (Indefinite Blocking)", "Thrashing", "Deadlock", "Internal Fragmentation"],
            "correct_answer": "Starvation (Indefinite Blocking)",
            "explanation": "Starvation occurs when runnable threads wait indefinitely due to strict priority scheduling. Aging is the typical solution.",
            "difficulty": "beginner",
            "misconception_tag": "starvation_vs_deadlock"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What is the core difference between a Process and a Thread?",
            "options": [
                "Threads within the same process share memory address space; processes have isolated address spaces",
                "Processes cannot use CPU cores concurrently, while threads can",
                "Threads have independent virtual page tables, while processes do not",
                "Processes are managed only in user space; threads are kernel-only"
            ],
            "correct_answer": "Threads within the same process share memory address space; processes have isolated address spaces",
            "explanation": "A process has private memory segments (heap, data, code). Threads within that process share this memory, each with its own stack and registers.",
            "difficulty": "beginner",
            "misconception_tag": "process_vs_thread_memory"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What is 'thrashing' in virtual memory systems?",
            "options": [
                "The OS spends more time paging in and out of swap than executing instructions",
                "Multiple threads write to the same memory address without mutex locks",
                "The CPU clock cycle frequency oscillates unexpectedly",
                "Corrupted disk sectors prevent file descriptor allocation"
            ],
            "correct_answer": "The OS spends more time paging in and out of swap than executing instructions",
            "explanation": "Thrashing occurs when active processes exceed physical RAM, causing continuous page faults and severe system degradation.",
            "difficulty": "intermediate",
            "misconception_tag": "virtual_memory_thrashing"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Which synchronization primitive allows up to N threads to access a shared resource concurrently?",
            "options": ["Counting Semaphore", "Binary Mutex", "Spinlock", "Condition Variable"],
            "correct_answer": "Counting Semaphore",
            "explanation": "A counting semaphore maintains a non-negative integer counter initialized to N, allowing up to N concurrent acquisitions.",
            "difficulty": "intermediate",
            "misconception_tag": "mutex_vs_counting_semaphore"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Which CPU scheduling algorithm is provably optimal in terms of minimizing average waiting time?",
            "options": ["Shortest Job First (SJF)", "First-Come First-Served (FCFS)", "Round Robin (RR)", "Multilevel Feedback Queue"],
            "correct_answer": "Shortest Job First (SJF)",
            "explanation": "Shortest Job First (SJF / SRTF) is mathematically provable to minimize average waiting time, though exact burst times must be predicted.",
            "difficulty": "intermediate",
            "misconception_tag": "sjf_optimality"
        }
    ],
    "Database Management Systems": [
        {
            "question_type": "multiple_choice",
            "question_text": "Which normal form requires that a relation is in 2NF and contains no transitive functional dependencies?",
            "options": ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
            "correct_answer": "Third Normal Form (3NF)",
            "explanation": "3NF requires 2NF compliance and ensures every non-prime attribute depends only directly on candidate keys, eliminating transitive dependencies.",
            "difficulty": "intermediate",
            "misconception_tag": "normalization_transitive_dependency"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "In ACID transaction guarantees, what does 'Atomicity' mandate?",
            "options": [
                "All operations in a transaction succeed completely or none take effect",
                "Transactions execute completely isolated from concurrent transactions",
                "Committed data will never be lost following power or hardware failure",
                "The database strictly maintains schema integrity constraints"
            ],
            "correct_answer": "All operations in a transaction succeed completely or none take effect",
            "explanation": "Atomicity guarantees all-or-nothing execution: if any query fails, the entire transaction is rolled back cleanly.",
            "difficulty": "beginner",
            "misconception_tag": "acid_properties"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Why are B+ Trees widely preferred over standard B Trees for disk-based relational database indexes?",
            "options": [
                "All record data is in leaf nodes, linked sequentially for extremely fast range queries",
                "B+ Trees have fewer children per node to save memory",
                "B+ Trees eliminate disk I/O by running exclusively in CPU L1 cache",
                "B+ Trees do not require rebalancing during insertions"
            ],
            "correct_answer": "All record data is in leaf nodes, linked sequentially for extremely fast range queries",
            "explanation": "In B+ Trees, internal nodes only store navigation keys while all data pointers reside in doubly linked leaf nodes, enabling rapid range scans.",
            "difficulty": "advanced",
            "misconception_tag": "btree_vs_bplus_tree"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What type of join returns all rows from the left table and matched rows from the right table, filling with NULL when no match exists?",
            "options": ["LEFT OUTER JOIN", "INNER JOIN", "CROSS JOIN", "FULL OUTER JOIN"],
            "correct_answer": "LEFT OUTER JOIN",
            "explanation": "LEFT JOIN preserves every tuple from the left relation, substituting NULL values for right relation attributes when predicate matching fails.",
            "difficulty": "beginner",
            "misconception_tag": "sql_join_types"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "Under the SQL standard, which transaction isolation level eliminates Dirty Reads, Non-repeatable Reads, and Phantom Reads?",
            "options": ["SERIALIZABLE", "READ COMMITTED", "REPEATABLE READ", "READ UNCOMMITTED"],
            "correct_answer": "SERIALIZABLE",
            "explanation": "SERIALIZABLE is the strictest isolation level, preventing dirty reads, non-repeatable reads, and phantom reads using predicate or range locks.",
            "difficulty": "intermediate",
            "misconception_tag": "transaction_isolation_levels"
        },
        {
            "question_type": "multiple_choice",
            "question_text": "What is the primary trade-off of adding multiple indexes to a high-write relational table?",
            "options": [
                "Significantly slows down INSERT, UPDATE, and DELETE operations",
                "Causes irreversible table data corruption during joins",
                "Limits maximum primary key size to 16 bits",
                "Forces queries to execute sequentially without parallelism"
            ],
            "correct_answer": "Significantly slows down INSERT, UPDATE, and DELETE operations",
            "explanation": "Every write modification requires updating the underlying table data and rebalancing all associated index B-Trees, increasing write latency.",
            "difficulty": "intermediate",
            "misconception_tag": "index_write_overhead"
        }
    ]
}

def _extract_doc_keywords(text: str) -> List[str]:
    """Pulls salient academic keywords and concept phrases from uploaded document text."""
    words = re.findall(r'\b[A-Z][a-zA-Z0-9_\-]{2,}\b|\b[a-zA-Z]{5,}\b', text)
    stop = {"about", "which", "their", "there", "these", "where", "would", "could", "should", "using", "first", "other"}
    candidates = [w for w in words if w.lower() not in stop]
    return list(dict.fromkeys(candidates))[:12]

def synthesize_dynamic_questions(
    topic_name: str,
    difficulty: str,
    count: int,
    document_context: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Dynamically generates varied, randomized quiz questions tailored to the requested count.
    Grounds questions in document context if provided, and randomizes distractor ordering.
    """
    questions: List[Dict[str, Any]] = []

    # 1. Check if we have pre-seeded questions matching this topic
    matched_bank: List[Dict[str, Any]] = []
    for key, q_list in CURRICULUM_QUESTION_BANK.items():
        if key.lower() in topic_name.lower() or topic_name.lower() in key.lower():
            matched_bank = list(q_list)
            break

    # If no exact match, gather questions across all banks for variety
    if not matched_bank:
        for q_list in CURRICULUM_QUESTION_BANK.values():
            matched_bank.extend(q_list)

    # Shuffle bank so questions differ on every restart/request
    random.shuffle(matched_bank)

    # 2. If document context is provided, synthesize document-grounded questions
    if document_context and len(document_context.strip()) > 30:
        keywords = _extract_doc_keywords(document_context)
        snippets = [s.strip() for s in re.split(r'[\.\n]+', document_context) if len(s.strip()) > 25]

        for i, snippet in enumerate(snippets[:min(count, 4)]):
            target_kw = keywords[i % len(keywords)] if keywords else topic_name
            cleaned_snippet = snippet[:140]

            q = {
                "question_type": "multiple_choice",
                "question_text": f"Based on your uploaded course material regarding '{target_kw}': Which statement accurately captures the core requirement?\n\n\"{cleaned_snippet}...\"",
                "options": [
                    f"It establishes correct operational behavior and specifications for {target_kw}.",
                    f"It indicates that {target_kw} must be bypassed to avoid resource allocation.",
                    f"It proves that {target_kw} applies only to unmanaged legacy architectures.",
                    f"It eliminates the need for computational validation or error handling."
                ],
                "correct_answer": f"It establishes correct operational behavior and specifications for {target_kw}.",
                "explanation": f"Grounded directly in your uploaded syllabus: the passage emphasizes proper principles and operational specifications for {target_kw}.",
                "difficulty": difficulty,
                "misconception_tag": f"doc_grounded_{target_kw.lower()[:15]}"
            }
            questions.append(q)

    # 3. Add questions from the matched bank
    for q in matched_bank:
        if len(questions) >= count:
            break
        # Create a deep copy so we can shuffle options without mutating global bank
        q_copy = {
            "question_type": q["question_type"],
            "question_text": q["question_text"],
            "options": list(q["options"]),
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
            "difficulty": q.get("difficulty", difficulty),
            "misconception_tag": q.get("misconception_tag")
        }
        questions.append(q_copy)

    # 4. If we still need more questions to meet the requested count, synthesize parametric questions
    synth_templates = [
        (
            f"In {topic_name}, what is the fundamental purpose of maintaining deterministic state transitions?",
            "To ensure predictable system execution and verifiable consistency under concurrent execution.",
            [
                "To ensure predictable system execution and verifiable consistency under concurrent execution.",
                "To deliberately maximize uncontrolled race conditions across memory threads.",
                "To disable compiler type-checking in high-performance computing tasks.",
                "To eliminate asymptotic complexity bounds entirely."
            ],
            f"Deterministic state transitions guarantee that {topic_name} operations produce correct, reproducible results.",
            "state_determinism"
        ),
        (
            f"When evaluating efficiency in {topic_name} at the {difficulty} level, which metric is prioritized?",
            "Minimizing asymptotic time and space consumption while preserving correctness.",
            [
                "Minimizing asymptotic time and space consumption while preserving correctness.",
                "Maximizing heap memory usage to fill available RAM.",
                "Relying solely on hardware clock overdrive without algorithmic optimization.",
                "Suppressing unit testing and assertions in critical paths."
            ],
            "Algorithmic analysis evaluates algorithms based on how computational resource requirements scale.",
            "efficiency_metrics"
        ),
        (
            f"Which trade-off is most characteristic when scaling architectures in {topic_name}?",
            "Trading increased memory footprint (space) to achieve faster execution latency (time).",
            [
                "Trading increased memory footprint (space) to achieve faster execution latency (time).",
                "Ignoring concurrency primitives to gain network throughput.",
                "Replacing structured schemas with unindexed sequential file scans.",
                "Disabling transaction rollbacks during unexpected system failure."
            ],
            "Space-time trade-offs (e.g., caching, hash tables, memoization) are fundamental across computer science.",
            "space_time_tradeoff"
        ),
        (
            f"True or False: In {topic_name}, asymptotic Big-O notation measures exact execution time in milliseconds.",
            "False",
            ["True", "False"],
            "Big-O notation models the mathematical growth rate of resource requirements as input size n approaches infinity, independent of specific hardware speed.",
            "big_o_definition"
        ),
        (
            f"What is the recommended pedagogical strategy when encountering an edge-case defect in {topic_name}?",
            "Isolate the failing invariant with automated assertions and verify boundary constraints.",
            [
                "Isolate the failing invariant with automated assertions and verify boundary constraints.",
                "Delete the failing test cases from the continuous integration pipeline.",
                "Hardcode a return statement for specific input literals without fixing underlying logic.",
                "Ignore boundary conditions if average-case throughput passes."
            ],
            "Disciplined software engineering requires isolating state invariants and proving correctness at boundary edges.",
            "boundary_verification"
        )
    ]

    for q_text, correct, opts, expl, tag in synth_templates:
        if len(questions) >= count:
            break
        questions.append({
            "question_type": "multiple_choice" if len(opts) > 2 else "true_false",
            "question_text": q_text,
            "options": list(opts),
            "correct_answer": correct,
            "explanation": expl,
            "difficulty": difficulty,
            "misconception_tag": tag
        })

    # 5. Randomize option order for each question so correct answers aren't predictable
    for q in questions:
        if q.get("options") and len(q["options"]) > 1:
            random.shuffle(q["options"])

    # Shuffle the overall question list so consecutive attempts produce diverse sequencing
    random.shuffle(questions)
    return questions[:count]


async def generate_quiz_questions(
    topic_name: str,
    objectives: List[str],
    difficulty: str = "intermediate",
    count: int = 4,
    document_context: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Dynamically generates structured, curriculum-aligned formative quiz questions.
    Attempts Google GenAI with async timeout; gracefully and dynamically falls back
    to high-yield question synthesis guaranteed to return the exact requested count.
    """
    if not settings.is_gemini_configured:
        logger.info("Gemini unconfigured; generating dynamic syllabus-aligned quiz questions.")
        return synthesize_dynamic_questions(topic_name, difficulty, count, document_context)

    obj_text = "\n".join([f"- {o}" for o in objectives[:4]]) if objectives else f"Core topics of {topic_name}"
    doc_prompt = (
        f"\nGROUND QUESTIONS IN THESE UPLOADED COURSE MATERIALS:\n{document_context[:2500]}\n"
        if document_context else ""
    )

    system_instruction = (
        "You are LearnLoop AI's Automated Assessment Architect.\n"
        f"Generate EXACTLY {count} rigorous diagnostic formative quiz questions for students.\n"
        "Return ONLY a valid JSON array of objects without any markdown code fences (no ```json or ```).\n"
        "Each object must follow this exact schema:\n"
        "[\n"
        "  {\n"
        "    \"question_type\": \"multiple_choice\",\n"
        "    \"question_text\": \"...\",\n"
        "    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
        "    \"correct_answer\": \"Option A\",\n"
        "    \"explanation\": \"Pedagogical explanation of why Option A is correct and why other choices fail.\",\n"
        f"    \"difficulty\": \"{difficulty}\",\n"
        "    \"misconception_tag\": \"concept_misconception_identifier\"\n"
        "  }\n"
        "]"
    )

    user_prompt = (
        f"Topic: {topic_name}\n"
        f"Difficulty Level: {difficulty}\n"
        f"Target Question Count: {count}\n"
        f"Learning Objectives:\n{obj_text}\n"
        f"{doc_prompt}\n"
        f"Please create {count} distinct questions testing conceptual comprehension and problem solving. "
        f"Ensure options are realistic and test student misconceptions."
    )

    # Attempt calling GenAI with model fallback and strict async timeout
    candidate_models = [settings.GEMINI_MODEL, "gemini-2.5-flash", "gemini-1.5-flash"]
    # De-duplicate while preserving order
    models_to_try = list(dict.fromkeys([m for m in candidate_models if m]))

    for model_name in models_to_try:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            # Use asyncio to execute generate_content with a 10s timeout
            loop = asyncio.get_running_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.6,
                            response_mime_type="application/json",
                        )
                    )
                ),
                timeout=12.0
            )

            response_text = response.text.strip()
            if response_text.startswith("```"):
                response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
                response_text = re.sub(r"\s*```$", "", response_text)

            data = json.loads(response_text)
            if isinstance(data, list) and len(data) > 0:
                # Randomize option ordering for each question
                for q in data:
                    if "options" in q and isinstance(q["options"], list) and len(q["options"]) > 1:
                        random.shuffle(q["options"])

                # If AI returned fewer than count, supplement with dynamic questions
                if len(data) < count:
                    extra = synthesize_dynamic_questions(topic_name, difficulty, count - len(data), document_context)
                    data.extend(extra)

                logger.info(f"Successfully generated {len(data)} AI questions using {model_name}")
                return data[:count]

        except Exception as e:
            logger.warning(f"Gemini call with {model_name} failed or timed out: {e}. Trying next option...")
            continue

    logger.warning("All Gemini model attempts failed; using dynamic question synthesizer.")
    return synthesize_dynamic_questions(topic_name, difficulty, count, document_context)


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
