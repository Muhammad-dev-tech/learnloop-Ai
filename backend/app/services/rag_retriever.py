import re
import math
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
    "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", 
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", 
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", 
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", 
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she", 
    "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", 
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", 
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", 
    "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
}

def tokenize(text: str) -> List[str]:
    """Tokenizes text into lowercase alphanumeric stems, filtering common English stop words."""
    words = re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', text.lower())
    return [w for w in words if w not in STOP_WORDS]

def retrieve_relevant_chunks(
    query: str,
    chunks: List[Any],
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    Ranks document chunks using BM25-inspired term-frequency and keyword overlap.
    Returns the top_k most relevant chunks with metadata.
    """
    if not chunks:
        return []

    query_tokens = tokenize(query)
    if not query_tokens:
        # Fallback to returning the first few chunks if query is empty or just punctuation
        return [
            {
                "chunk_index": c.chunk_index,
                "content": c.content,
                "page_or_section": c.page_or_section,
                "score": 1.0
            }
            for c in chunks[:top_k]
        ]

    scored_chunks = []
    query_str_lower = query.lower()

    for c in chunks:
        content_lower = c.content.lower()
        chunk_tokens = tokenize(content_lower)
        if not chunk_tokens:
            continue

        score = 0.0
        # 1. Exact phrase bonus
        if len(query_tokens) > 1 and query_str_lower in content_lower:
            score += 15.0

        # 2. Token overlap and frequency
        chunk_token_counts = {}
        for t in chunk_tokens:
            chunk_token_counts[t] = chunk_token_counts.get(t, 0) + 1

        for qt in query_tokens:
            tf = chunk_token_counts.get(qt, 0)
            if tf > 0:
                # Sub-linear term frequency weight
                score += (1.0 + math.log(tf)) * 2.5

        if score > 0:
            scored_chunks.append({
                "chunk_index": c.chunk_index,
                "content": c.content,
                "page_or_section": c.page_or_section,
                "score": score
            })

    # Sort descending by relevance score
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)

    # If no chunk had keyword hits, provide the opening chunks for baseline context
    if not scored_chunks:
        return [
            {
                "chunk_index": c.chunk_index,
                "content": c.content,
                "page_or_section": c.page_or_section,
                "score": 0.1
            }
            for c in chunks[:top_k]
        ]

    return scored_chunks[:top_k]

async def query_document_rag(
    query: str,
    document_title: str,
    chunks: List[Any],
    top_k: int = 4
) -> Dict[str, Any]:
    """
    Executes a Retrieval-Augmented Generation (RAG) query against a student's syllabus/notes document.
    Returns: { "answer": str, "citations": List[Dict], "model_used": str }
    """
    relevant_chunks = retrieve_relevant_chunks(query, chunks, top_k=top_k)

    # Construct grounded context block
    context_blocks = []
    citations = []

    for idx, c in enumerate(relevant_chunks):
        label = c["page_or_section"] or f"Excerpt {idx + 1}"
        context_blocks.append(f"[{label}]\n{c['content']}")
        citations.append({
            "source_document": document_title,
            "page_or_section": label,
            "snippet": c["content"][:240] + "..." if len(c["content"]) > 240 else c["content"],
            "score": round(c["score"], 2)
        })

    formatted_context = "\n\n---\n\n".join(context_blocks)

    system_instruction = (
        "You are LearnLoop AI's Syllabus RAG Tutor.\n"
        "Your task is to answer the student's question accurately and strictly based on the provided document excerpts.\n"
        "Rules:\n"
        "1. GROUNDING: Anchor your explanation firmly in the provided excerpts. Do not fabricate facts outside the text.\n"
        "2. CITATIONS: Whenever stating a fact, rule, or concept, explicitly cite its source location in brackets, e.g. [Page 2] or [Section 1].\n"
        "3. HONESTY: If the provided excerpts do not contain sufficient details to answer fully, explicitly state: 'The provided document excerpts do not specify this detail, but based on the text...' and provide what is known.\n"
        "4. CLARITY: Format your response cleanly using Markdown headings, bullet points, and code blocks if applicable."
    )

    user_prompt = (
        f"Document Title: {document_title}\n\n"
        f"=== AUTHORITATIVE COURSE EXCERPTS ===\n"
        f"{formatted_context}\n"
        f"====================================\n\n"
        f"Student Query: {query}\n\n"
        f"Please provide a comprehensive, grounded explanation with explicit bracketed source citations."
    )

    # If Gemini is not configured, generate educational grounded fallback
    if not settings.is_gemini_configured:
        fallback_answer = (
            f"### Grounded Response from {document_title}\n\n"
            f"Based on **{citations[0]['page_or_section'] if citations else 'the document'}**:\n\n"
            f"{relevant_chunks[0]['content'] if relevant_chunks else 'No excerpt found.'}\n\n"
            f"**Verified Citation:** [{citations[0]['page_or_section'] if citations else 'Document'}]"
        )
        return {
            "answer": fallback_answer,
            "citations": citations,
            "model_used": "offline-fallback"
        }

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3, # low temperature for high grounding fidelity
                max_output_tokens=2048,
            )
        )

        answer_text = response.text if response.text else "Unable to parse response from course document."

        return {
            "answer": answer_text,
            "citations": citations,
            "model_used": settings.GEMINI_MODEL
        }

    except Exception as e:
        logger.error(f"Gemini RAG query error: {e}. Returning grounded excerpt synthesis.")
        fallback_answer = (
            f"### Grounded Answer from {document_title}\n\n"
            f"According to **{citations[0]['page_or_section'] if citations else 'the uploaded notes'}**:\n\n"
            f"{relevant_chunks[0]['content'] if relevant_chunks else 'Document content unavailable.'}\n\n"
            f"*(Generated from verified syllabus excerpts)*"
        )
        return {
            "answer": fallback_answer,
            "citations": citations,
            "model_used": "offline-fallback"
        }
