// Builds the synthesis prompt and streams the Claude API response

const SYNTHESIS_SYSTEM_PROMPT = `You are an expert product feedback synthesizer for product managers.

Your job is to read a collection of raw feedback notes and produce a structured synthesis report.

Always respond with valid JSON matching this exact structure:
{
  "summary": "2-3 sentence executive summary of the overall feedback landscape",
  "sentiment": {
    "average": <number 1-5>,
    "label": "Very negative | Negative | Mixed | Positive | Very positive"
  },
  "sourceCounts": {
    "user-interview": <number>,
    "nps": <number>,
    "support-ticket": <number>,
    "sales-call": <number>,
    "survey": <number>,
    "unknown": <number>
  },
  "themes": [
    {
      "name": "Short theme name",
      "priority": "High | Medium | Low",
      "summary": "2-3 sentence description of the pattern and why it matters",
      "signalCount": <number of notes contributing to this theme>,
      "evidence": [
        {
          "quote": "Direct quote or paraphrase from the note",
          "source": "source type",
          "participant": "participant info or null"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "action": "Clear action title",
      "detail": "1-2 sentence explanation of what to do and why",
      "theme": "Which theme this addresses"
    }
  ],
  "openQuestions": [
    "Question the feedback doesn't yet answer"
  ]
}

Rules:
- Identify 3-6 themes. More than 6 dilutes signal.
- Each theme should have 2-3 evidence items drawn from different notes where possible.
- Priority is High if the theme appears in 30%+ of notes or has strong emotional language, Medium if recurring but not dominant, Low if minor or isolated.
- Recommendations should be specific and actionable, not generic.
- Open questions should be genuinely unanswered — gaps the feedback points to but doesn't resolve.
- Return ONLY the JSON object. No preamble, no markdown fences.`;

function buildUserPrompt(notes, vaultName) {
  const noteBlocks = notes.map((note, i) => {
    const meta = [
      note.date ? `Date: ${note.date}` : null,
      `Source: ${note.source}`,
      note.sentiment ? `Sentiment: ${note.sentiment}/5` : null,
      note.participant ? `Participant: ${note.participant}` : null,
      note.tags?.length ? `Tags: ${note.tags.join(', ')}` : null,
    ].filter(Boolean).join(' | ');

    return `--- Note ${i + 1} ---\n${meta}\n\n${note.body}`;
  }).join('\n\n');

  return `Synthesize the following ${notes.length} feedback notes for the "${vaultName}" feature.\n\n${noteBlocks}`;
}

export async function synthesize(notes, vaultName, apiKey, onChunk) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      stream: true,
      system: SYNTHESIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(notes, vaultName),
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API error ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);
        if (event.type === 'content_block_delta' && event.delta?.text) {
          onChunk(event.delta.text);
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}
