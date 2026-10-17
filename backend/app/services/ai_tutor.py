import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATES = {
    "tutor": (
        "You are LearnLoop AI, a world-class, encouraging Socratic tutor specializing in {topic_name} at the {difficulty} level.\n"
        "Your pedagogical philosophy follows the Socratic method:\n"
        "- Guide the student towards insight by asking thoughtful, leading questions rather than immediately giving away complete answers.\n"
        "- Break down complex concepts into bite-sized steps.\n"
        "- When the student answers or asks a question, acknowledge what is correct, gently correct misconceptions, and prompt them on the next logical step.\n"
        "- Keep responses concise, engaging, and clear. Format with markdown headers, bullet points, and code blocks where helpful.\n"
        "- Conclude your response with ONE clear guiding question or reflection check for the student."
    ),
    "teach_me": (
        "You are LearnLoop AI, an expert computer science and STEM educator specializing in {topic_name} at the {difficulty} level.\n"
        "Your goal is to provide a masterclass explanatory breakdown:\n"
        "- Start with an intuitive, real-world analogy to make the abstract concept tangible.\n"
        "- Provide a rigorous yet clear conceptual explanation.\n"
        "- Include practical code examples or pseudocode with explanatory comments where applicable.\n"
        "- Highlight common pitfalls or misconceptions that students often encounter.\n"
        "- Finish with a quick comprehension self-check question."
    ),
    "challenge": (
        "You are LearnLoop AI, an adaptive challenge evaluator specializing in {topic_name} at the {difficulty} level.\n"
        "Your goal is to test the student's mastery through active problem-solving:\n"
        "- If the student is beginning a challenge, present a realistic problem scenario or coding puzzle with clear constraints.\n"
        "- If the student has submitted a proposed solution, evaluate their logic, analyze edge cases, state time/space complexity, and highlight strengths/weaknesses.\n"
        "- Adjust feedback rigor based on the {difficulty} level.\n"
        "- End with a constructive follow-up challenge or optimization prompt."
    ),
    "notes": (
        "You are LearnLoop AI, an academic study architect synthesizing high-yield revision notes for {topic_name} at the {difficulty} level.\n"
        "Your goal is to generate structured revision materials:\n"
        "- Provide executive key takeaway definitions.\n"
        "- Core principles organized in bulleted lists.\n"
        "- Essential formulas, syntax templates, or Big-O tables where relevant.\n"
        "- Top 3 exam/interview tips and common anti-patterns to avoid."
    )
}

def generate_fallback_tutor_response(
    prompt: str,
    topic_name: str,
    learning_mode: str,
    difficulty: str,
    objectives: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Generates an academically sound offline/fallback response if Gemini API is unavailable or mocked."""
    obj_summary = f" (Focusing on: {', '.join(objectives[:2])})" if objectives else ""
    
    if learning_mode == "tutor":
        content = (
            f"### Exploring {topic_name} ({difficulty.capitalize()} Level)\n\n"
            f"That is a great question to examine regarding **{topic_name}**{obj_summary}.\n\n"
            f"To explore this systematically, let's break down the underlying mechanism:\n"
            f"1. **Core Concept**: In computing, this concept establishes how resources and states interact under constraints.\n"
            f"2. **Key Observation**: Notice how changes in the input scale influence the outcome.\n\n"
            f"**Guiding Question for You:**\n"
            f"Before we dive into the formal implementation, how would you intuitively describe what happens when the initial condition is empty or doubled?"
        )
        suggestions = [
            f"What is the base case in {topic_name}?",
            f"Can you show a quick analogy for {topic_name}?",
            "How does this behave under high concurrency or large scale?"
        ]
    elif learning_mode == "challenge":
        content = (
            f"### Challenge Mode: {topic_name} Challenge ({difficulty.capitalize()})\n\n"
            f"Here is your active diagnostic challenge for **{topic_name}**:\n\n"
            f"**Scenario:** You are designing a subsystem that must process incoming requests with minimal memory overhead while guaranteeing consistency.\n\n"
            f"**Your Task:**\n"
            f"1. Propose an appropriate data structure or pattern for this task.\n"
            f"2. State the expected time and space complexity.\n"
            f"3. Identify one critical edge case that could cause failure.\n\n"
            f"Write your approach below and submit it when ready!"
        )
        suggestions = [
            "Here is my proposed approach...",
            "What constraints should I assume for memory?",
            "Can I have a hint on the recommended structure?"
        ]
    elif learning_mode == "notes":
        content = (
            f"### High-Yield Revision Notes: {topic_name}\n\n"
            f"**Level:** {difficulty.capitalize()} | **Curriculum Track:** Academic Defense Edition\n\n"
            f"#### 1. Executive Definition\n"
            f"{topic_name} encompasses the algorithmic structures and systemic protocols designed to ensure efficient, predictable computation.\n\n"
            f"#### 2. Key Principles & Invariants\n"
            f"- **State Invariant**: Maintain integrity across operations.\n"
            f"- **Resource Trade-off**: Balances computational latency against storage consumption.\n"
            f"- **Asymptotic Bound**: Optimized for practical execution paths.\n\n"
            f"#### 3. Common Exam Pitfalls\n"
            f"- Forgetting boundary condition checks.\n"
            f"- Conflating average-case time with worst-case guarantees."
        )
        suggestions = [
            f"Explain the primary formula in {topic_name}",
            f"Give me a cheat sheet for {topic_name}",
            "Test me on these revision notes"
        ]
    else:  # teach_me mode
        content = (
            f"### Understanding {topic_name} ({difficulty.capitalize()} Level)\n\n"
            f"Let's break down **{topic_name}**{obj_summary} step-by-step.\n\n"
            f"#### 1. Intuitive Analogy\n"
            f"Imagine an organized logistics sorting facility: items arriving must be cataloged, routed, and retrieved with minimal delay. "
            f"Without an organized structure, searching takes proportional time to the total volume; with indexed routing, retrieval becomes almost instantaneous.\n\n"
            f"#### 2. Architectural Mechanics\n"
            f"At the {difficulty} level, the focus is on understanding the internal state representations and trade-offs.\n\n"
            f"```python\n"
            f"# Conceptual demonstration for {topic_name}\n"
            f"def demonstrate_concept(items: list) -> dict:\n"
            f"    \"\"\"Demonstrates standard processing for {topic_name}.\"\"\"\n"
            f"    processed = [item for item in items if item is not None]\n"
            f"    return {{\n"
            f"        'count': len(processed),\n"
            f"        'status': 'optimized'\n"
            f"    }}\n"
            f"```\n\n"
            f"#### 3. Comprehension Check\n"
            f"What trade-off do you anticipate between storage overhead and access latency in this approach?"
        )
        suggestions = [
            f"Can you explain this with a different analogy?",
            f"How does {topic_name} apply in real production software?",
            "Let's move on to a practice challenge question."
        ]

    return {
        "content": content,
        "suggested_followups": suggestions,
        "model_used": "offline-fallback"
    }

async def generate_tutor_response(
    prompt: str,
    topic_name: str,
    learning_mode: str = "tutor",
    difficulty: str = "beginner",
    conversation_history: Optional[List[Dict[str, str]]] = None,
    learning_objectives: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Invokes Google Gemini with educational prompt engineering and conversation context.
    Falls back gracefully if the API is offline or unconfigured.
    """
    mode = learning_mode if learning_mode in SYSTEM_PROMPT_TEMPLATES else "tutor"
    diff = difficulty if difficulty in ["beginner", "intermediate", "advanced"] else "beginner"

    if not settings.is_gemini_configured:
        logger.info("GEMINI_API_KEY not configured or empty; using pedagogical fallback response.")
        return generate_fallback_tutor_response(prompt, topic_name, mode, diff, learning_objectives)

    # Construct System Instruction
    base_instruction = SYSTEM_PROMPT_TEMPLATES[mode].format(
        topic_name=topic_name,
        difficulty=diff
    )
    
    if learning_objectives:
        objectives_list = "\n".join([f"- {obj}" for obj in learning_objectives])
        system_instruction = (
            f"{base_instruction}\n\n"
            f"Granular Curriculum Learning Objectives for this topic:\n{objectives_list}\n"
            f"Integrate these objectives where relevant to guide the student towards curriculum mastery."
        )
    else:
        system_instruction = base_instruction

    # Prepare conversation turns
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        # Build prompt context with recent conversation turns
        turns_context = ""
        if conversation_history:
            recent_turns = conversation_history[-6:]  # keep last 6 turns for concise context
            for msg in recent_turns:
                role = "Student" if msg.get("role") == "user" else "AI Tutor"
                turns_context += f"{role}: {msg.get('content', '')}\n\n"

        full_prompt = (
            f"Current Student Query: {prompt}\n\n"
            f"Recent Dialogue History:\n{turns_context if turns_context else '(No prior messages in this session)'}\n\n"
            f"Please respond as the AI tutor according to your pedagogical instructions. "
            f"Provide an insightful, well-formatted markdown response."
        )

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                max_output_tokens=2048,
            )
        )

        response_text = response.text if response.text else "I am here to help you learn! What part would you like to explore next?"

        # Generate contextual suggested follow-ups
        suggestions = [
            f"Can you give me a real-world example in {topic_name}?",
            "Can you test my understanding with a question?",
            "Could you explain that in simpler terms?"
        ]

        return {
            "content": response_text,
            "suggested_followups": suggestions,
            "model_used": settings.GEMINI_MODEL
        }

    except Exception as e:
        logger.error(f"Error calling Gemini AI Tutor: {e}. Falling back to educational offline response.")
        return generate_fallback_tutor_response(prompt, topic_name, mode, diff, learning_objectives)
