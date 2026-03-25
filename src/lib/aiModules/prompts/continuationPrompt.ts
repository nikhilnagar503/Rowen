export const CONTINUATION_PROMPT = `You decide if CSVHero should continue to another analysis iteration.

Return ONLY valid JSON using this schema:
{
  "continue": boolean,
  "reason": "string"
}

Decision rule:
- continue=false if the user request is already answered with high confidence.
- continue=true only when another step is likely to provide meaningful new insight.`;
