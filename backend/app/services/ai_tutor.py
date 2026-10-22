import logging
import asyncio
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
        "You are LearnLoop AI, an expert educator specializing in {topic_name} at the {difficulty} level.\n"
        "Your goal is to provide a masterclass explanatory breakdown:\n"
        "- Start with an intuitive, real-world analogy to make the abstract concept tangible.\n"
        "- Provide a rigorous yet clear conceptual explanation.\n"
        "- Include practical examples or structured outlines where applicable.\n"
        "- Highlight common pitfalls or misconceptions that students often encounter.\n"
        "- Finish with a quick comprehension self-check question."
    ),
    "challenge": (
        "You are LearnLoop AI, an adaptive challenge evaluator specializing in {topic_name} at the {difficulty} level.\n"
        "Your goal is to test the student's mastery through active problem-solving:\n"
        "- If the student is beginning a challenge, present a realistic problem scenario or puzzle with clear constraints.\n"
        "- If the student has submitted a proposed solution, evaluate their logic, analyze edge cases, and highlight strengths/weaknesses.\n"
        "- Adjust feedback rigor based on the {difficulty} level.\n"
        "- End with a constructive follow-up challenge or optimization prompt."
    ),
    "notes": (
        "You are LearnLoop AI, an academic study architect synthesizing high-yield revision notes for {topic_name} at the {difficulty} level.\n"
        "Your goal is to generate structured revision materials:\n"
        "- Provide executive key takeaway definitions.\n"
        "- Core principles organized in bulleted lists.\n"
        "- Essential frameworks, syntax templates, or tables where relevant.\n"
        "- Top 3 exam/interview tips and common anti-patterns to avoid."
    )
}

def generate_fallback_tutor_response(
    prompt: str,
    topic_name: str,
    learning_mode: str,
    difficulty: str,
    objectives: Optional[List[str]] = None,
    document_context: Optional[str] = None
) -> Dict[str, Any]:
    """Generates an academically sound offline/fallback response if Gemini API is unavailable or mocked."""
    obj_summary = f" (Focusing on: {', '.join(objectives[:2])})" if objectives else ""

    # If grounded in uploaded document materials
    if document_context and len(document_context.strip()) > 20:
        lines = [line.strip() for line in document_context.split("\n") if len(line.strip()) > 30 and not line.strip().startswith("---")]
        excerpts = lines[:3] if lines else [document_context[:250]]
        snippet_text = "\n\n".join([f"> *\"{ex}\"*" for ex in excerpts])

        content = (
            f"### Exploring {topic_name}\n\n"
            f"I have analyzed your uploaded course materials for **{topic_name}** to address your question:\n\n"
            f"{snippet_text}\n\n"
            f"**Core Syllabus Highlights:**\n"
            f"- **Core Theme**: These sections outline foundational definitions, methodologies, and analytical criteria for {topic_name}.\n"
            f"- **Application**: Notice how the passage emphasizes structured steps and verified principles to achieve academic rigor.\n\n"
            f"**Guiding Question for You:**\n"
            f"Based on these syllabus notes, which specific concept or section would you like to unpack first?"
        )
        suggestions = [
            f"Summarize the key objectives in {topic_name}",
            f"What methodology is recommended in {topic_name}?",
            f"Explain the primary criteria in {topic_name}"
        ]
        return {
            "content": content,
            "suggested_followups": suggestions,
            "model_used": "document-grounded-fallback"
        }

    # Standard curriculum topic fallback
    if learning_mode == "tutor":
        content = (
            f"### Exploring {topic_name} ({difficulty.capitalize()} Level)\n\n"
            f"That is a great question to examine regarding **{topic_name}**{obj_summary}.\n\n"
            f"To explore this systematically, let's break down the underlying mechanism:\n"
            f"1. **Core Concept**: This foundational principle establishes how components and states behave under constraints.\n"
            f"2. **Key Observation**: Notice how variations in initial conditions shape the expected outcome.\n\n"
            f"**Guiding Question for You:**\n"
            f"Before we dive into the formal implementation, how would you intuitively describe what happens in {topic_name} when the initial condition is modified or scaled?"
        )
        suggestions = [
            f"What is a real-world example of {topic_name}?",
            f"Can you show a quick analogy for {topic_name}?",
            f"How does {topic_name} apply in practice?"
        ]
    elif learning_mode == "challenge":
        content = (
            f"### Challenge Mode: {topic_name} ({difficulty.capitalize()})\n\n"
            f"Here is your active diagnostic challenge for **{topic_name}**:\n\n"
            f"**Scenario:** You need to design an efficient solution that solves the primary problem in {topic_name} with minimal resource overhead.\n\n"
            f"**Your Task:**\n"
            f"1. Outline your step-by-step approach.\n"
            f"2. State your expected time and space complexity or constraints.\n"
            f"3. Identify one edge case that could lead to unexpected behavior.\n\n"
            f"Write your approach below and submit when ready!"
        )
        suggestions = [
            "Here is my proposed approach...",
            "What constraints should I assume?",
            "Can I have a small hint?"
        ]
    elif learning_mode == "notes":
        content = (
            f"### High-Yield Revision Notes: {topic_name}\n\n"
            f"**Level:** {difficulty.capitalize()}\n\n"
            f"#### 1. Executive Definition\n"
            f"{topic_name} encompasses the structured principles and systematic protocols designed for rigorous academic mastery.\n\n"
            f"#### 2. Key Principles\n"
            f"- **Integrity**: Maintain state consistency across operations.\n"
            f"- **Optimization**: Balance operational latency against resource consumption.\n"
            f"- **Validation**: Verify edge cases and boundary parameters.\n\n"
            f"#### 3. Common Exam Pitfalls\n"
            f"- Forgetting boundary condition checks.\n"
            f"- Conflating average-case behavior with worst-case guarantees."
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
            f"Imagine an organized logistics network: items arriving must be cataloged, routed, and retrieved with minimal delay. "
            f"Without an organized structure, searching takes proportional time to the total volume; with indexed routing, retrieval becomes almost instantaneous.\n\n"
            f"#### 2. Core Mechanics\n"
            f"At the {difficulty} level, the focus is on understanding representations, trade-offs, and boundary behavior.\n\n"
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
    learning_objectives: Optional[List[str]] = None,
    document_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Invokes Google Gemini with educational prompt engineering, conversation context,
    and optional document grounding. Falls back gracefully if offline.
    """
    mode = learning_mode if learning_mode in SYSTEM_PROMPT_TEMPLATES else "tutor"
    diff = difficulty if difficulty in ["beginner", "intermediate", "advanced"] else "beginner"

    if not settings.is_gemini_configured:
        logger.info("GEMINI_API_KEY not configured or empty; using pedagogical fallback response.")
        return generate_fallback_tutor_response(prompt, topic_name, mode, diff, learning_objectives, document_context)

    # Construct System Instruction
    base_instruction = SYSTEM_PROMPT_TEMPLATES[mode].format(
        topic_name=topic_name,
        difficulty=diff
    )
    
    if learning_objectives:
        objectives_list = "\n".join([f"- {obj}" for obj in learning_objectives])
        system_instruction = (
            f"{base_instruction}\n\n"
            f"Granular Learning Objectives for this topic:\n{objectives_list}\n"
            f"Integrate these objectives where relevant to guide the student towards curriculum mastery."
        )
    else:
        system_instruction = base_instruction

    if document_context:
        system_instruction += (
            f"\n\nGROUNDING CONTEXT (STUDENT'S UPLOADED SYLLABUS / NOTES):\n"
            f"{document_context[:2500]}\n"
            f"Strictly prioritize information from these course notes when answering student questions."
        )

    # Build prompt context with recent conversation turns
    turns_context = ""
    if conversation_history:
        recent_turns = conversation_history[-6:]
        for msg in recent_turns:
            role = "Student" if msg.get("role") == "user" else "AI Tutor"
            turns_context += f"{role}: {msg.get('content', '')}\n\n"

    full_prompt = (
        f"Current Student Query: {prompt}\n\n"
        f"Recent Dialogue History:\n{turns_context if turns_context else '(No prior messages in this session)'}\n\n"
        f"Please respond as the AI tutor according to your pedagogical instructions. "
        f"Provide an insightful, well-formatted markdown response."
    )

    candidate_models = [settings.GEMINI_MODEL, "gemini-2.5-flash", "gemini-1.5-flash"]
    models_to_try = list(dict.fromkeys([m for m in candidate_models if m]))

    for model_name in models_to_try:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            loop = asyncio.get_running_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=model_name,
                        contents=full_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.7,
                            max_output_tokens=2048,
                        )
                    )
                ),
                timeout=12.0
            )

            response_text = response.text if response.text else "I am here to help you learn! What part would you like to explore next?"

            suggestions = [
                f"Can you give me a real-world example in {topic_name}?",
                "Can you test my understanding with a question?",
                "Could you explain that in simpler terms?"
            ]

            return {
                "content": response_text,
                "suggested_followups": suggestions,
                "model_used": model_name
            }

        except Exception as e:
            logger.warning(f"Error calling Gemini AI Tutor with model {model_name}: {e}. Trying fallback...")
            continue

    logger.warning("All Gemini tutor models failed; using pedagogical fallback response.")
    return generate_fallback_tutor_response(prompt, topic_name, mode, diff, learning_objectives, document_context)
