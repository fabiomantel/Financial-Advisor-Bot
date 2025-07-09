# Context Management Feature Design for WhatsApp GPT Bot

## 📋 **IMPLEMENTATION INSTRUCTIONS FOR LLM**

**READ THIS FIRST:** This document contains a complete technical specification for optimizing WhatsApp bot response times. Each section includes:
- Clear problem identification
- Specific code implementations
- Detailed logging requirements
- Performance targets
- Testing instructions

**FOLLOW THESE STEPS IN ORDER:**
1. Read the entire specification
2. Implement Phase 1 components first
3. Add comprehensive logging to every function
4. Test each component individually
5. Measure performance improvements
6. Deploy monitoring and tracer
7. Iterate based on results

## 📊 **CURRENT PERFORMANCE ANALYSIS**

## Objective

Implement an optimized context strategy that maintains conversational coherence while minimizing GPT token usage, improving latency, and ensuring scalable storage. The design is based on OpenAI platform recommendations and recent architecture refinements.

## Design Goals

- Store only relevant context needed for GPT to understand and respond coherently
- Include a persistent, LLM-optimized summary of the conversation
- Include a short window of recent valid message pairs
- Exclude fallback, error, or clarification messages from context
- Trigger summary updates based on message count, not time

## Redis Schema (Per User)

**Key:** `chat_context:{userId}`

**Value structure:**

```json
{
  "summary": "Condensed knowledge of recent exchanges",
  "recent_messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "message_count_since_summary": 0,
  "last_interaction_timestamp": 1234567890
}
```

- `summary`: A GPT-generated paragraph summarizing the key themes and user intent across the conversation. Used only for GPT input.
- `recent_messages`: Up to 5 recent valid user/assistant pairs.
- `message_count_since_summary`: Counter of accepted message pairs since the last summary update. **This counter increments only for valid message pairs (see filtering rules below), ensuring that only meaningful exchanges contribute to summary updates.**

## GPT Context Construction (Per Message)

Every GPT API call includes:

1. Static system prompt (stored server-side)
2. `summary` (passed as system or assistant message)
3. `recent_messages`
4. Current user message

## Summary Generation Logic

- On each incoming message, check if `message_count_since_summary >= N` (default: 10)
- If true:
  - Use GPT to summarize the conversation using:
    - The **current summary**
    - **All recent valid message pairs accumulated since the last summary update**
  - Replace the stored `summary` with the new one
  - Reset the counter to 0

## Summary Prompt for GPT

```
Summarize the following conversation between the user and the assistant in 1–2 paragraphs.
The goal is to preserve the assistant's memory of what has been discussed so far, including the user's goals, questions, preferences, and any relevant decisions or recommendations already given.
The summary should be factual, concise, and suitable for use as internal context in future API calls.
Do not include any greetings, closing phrases, or unnecessary detail. Only include information relevant to the assistant's ability to continue the conversation coherently.

Context to summarize:
- Current summary: <current_summary>
- Recent messages since last summary: <recent_message_pairs>
```

## Message Filtering Rules

Only store user/assistant pairs that meet these criteria:

- Assistant reply is complete, coherent, and not a fallback or error
- Message length is above a defined threshold (e.g., 50 characters)
- Does not contain phrases like “please rephrase” or “I didn’t understand”
- **Non-text messages (e.g., images, audio, stickers) are out of scope for context.**
  - By default, ignore and log them as invalid for context.
  - Optionally, convert to a placeholder (e.g., "[Image received]") if you want to preserve the event in logs or context.

Invalid pairs are not stored in `recent_messages` or used in summaries.

## Logging Guidelines

- Log each accepted message and whether it is included in context
- Log when a summary is triggered, including token count and result
- Log rejection reasons for skipped messages (e.g., fallback, error, non-text)
- Log GPT call durations and token usage

## Unit Testing Guidelines

- Test summary generation flow independently
- Test Redis structure updates after valid message input
- Test that invalid/fallback/non-text messages are excluded or handled as configured
- Test that GPT context is constructed correctly under various input cases
- Include tests for boundary conditions (e.g., 5 vs. 6 messages, missing summary)

## Success Criteria

- GPT response latency is below 2.5 seconds on average
- GPT token count per call stays below 800 tokens
- Redis size per user remains under 10 KB
- Summary reflects true conversation themes after 10 valid pairs
- Assistant maintains continuity and personalization across turns

**TESTING REQUIREMENTS:**
- Test each component individually
- Verify logging works correctly
- Measure performance improvements
- Document any issues found

## Next Steps

1. Implement new Redis schema and message validation logic
2. Create summary update logic triggered by message count
3. Update GPT context builder to include summary + recent + current message
4. Add unit tests and structured logs for each phase
5. Validate performance improvements against baseline implementation

---

## ⚠️ Topic Shift & Context Reset Handling

**Issue:** The summary updates periodically based on message count, but there’s no mechanism to handle abrupt topic shifts or user requests to reset context (e.g., "forget everything"). This could lead to irrelevant summaries if the conversation changes direction significantly, reducing coherence.

**Recommendation:**
- **Topic Shift Detection:**
  - Optionally implement logic to detect topic shifts using keywords (e.g., "new topic", "start over") or semantic analysis of user messages.
  - If a topic shift is detected, trigger an immediate summary update or context reset.
- **User-Initiated Context Reset:**
  - Support explicit user requests to reset context (e.g., "forget everything", "clear chat").
  - On reset, clear `summary`, `recent_messages`, and reset the counter.
  - Log all resets and topic shifts for audit and debugging.

**Testing:**
- Add tests for topic shift detection and user-initiated resets.
- Ensure summaries remain relevant after abrupt changes.

---

This design ensures that GPT receives only the most relevant and compressed context, providing scalable, efficient, and personalized conversational experiences over WhatsApp. 