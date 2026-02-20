import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "openai/gpt-3.5-turbo",
  "stepfun/step-3.5-flash:free",
  "z-ai/glm-4.5-air:free",
];

export async function POST(req: NextRequest) {
  try {
    const { content, settings } = await req.json();

    const prompt = `You are an expert study assistant. Analyze the following study material and generate a comprehensive study kit in JSON format.

STUDY MATERIAL:
${content}

SETTINGS:
- Quiz Type: ${settings.type} (Mixed = both MCQ and Identification, MCQ = multiple choice only, Identification = fill-in-the-blank only)
- Difficulty: ${settings.difficulty}
- Number of Questions: ${settings.count}

Generate a JSON object with EXACTLY this structure:

{
  "summary": "A clear, student-friendly explanation of the material. Write 150–300 words in plain English. Use simple language a student can easily read and understand. Break it into short paragraphs — each covering one main idea. Explain WHY things matter, not just WHAT they are. Write as if you are a friendly teacher giving a quick but meaningful overview.",
  
  "objectives": [
    "After studying this material, students will be able to...",
    "...at least 3–5 clear learning objectives"
  ],
  
  "key_concepts": [
    "concept1", "concept2", "concept3"
  ],
  
  "glossary": [
    {
      "term": "Term Name",
      "definition": "A clear, concise definition in 1–2 sentences that a student can understand."
    }
  ],
  
  "case_studies": [
    {
      "title": "Short descriptive title for the scenario",
      "scenario": "A realistic real-world scenario (3–5 sentences) that applies the concepts from the material. Make it relatable and interesting.",
      "lesson": "What this scenario teaches — connect it back to 1–2 key concepts from the material."
    }
  ],
  
  "questions": [
    {
      "type": "MCQ",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct option text exactly as written above",
      "explanation": "2–3 sentence explanation of why this is correct and what concept it tests."
    },
    {
      "type": "Identification",
      "question": "Question text here — what is ___?",
      "answer": "Short answer (1–5 words)",
      "explanation": "2–3 sentence explanation."
    }
  ]
}

RULES:
- Glossary: Include 5–10 of the most important terms. Each definition must be clear and student-friendly.
- Case Studies: Include 2–3 realistic scenarios that apply the material to real life. Make them engaging.
- Summary: MUST be 150–300 words, written in plain English paragraphs separated by newlines. DO NOT use bullet points in the summary.
- Questions: Generate exactly ${settings.count} questions. Type distribution based on setting: ${settings.type === "Mixed" ? "roughly half MCQ, half Identification" : settings.type === "MCQ" ? "all MCQ" : "all Identification"}.
- All MCQ must have exactly 4 options.
- Difficulty ${settings.difficulty}: ${settings.difficulty === "Easy" ? "basic recall and definitions" : settings.difficulty === "Medium" ? "application and understanding" : "analysis, synthesis, and evaluation"}.
- Return ONLY valid JSON, no markdown, no backticks, no extra text.`;

    const API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const maxTokens = Math.min(Math.max(4000, parseInt(settings.count || "10") * 200), 16000);

    for (const model of MODELS) {
      try {
        const controller = new AbortController();
        const timeoutMs = Math.max(25000, parseInt(settings.count || "10") * 1500);
        const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 55000));

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "StudyGen AI",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) continue;

        const data = await response.json();
        let raw = data.choices?.[0]?.message?.content || "";

        // Clean markdown if present
        raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

        // Validate JSON
        const parsed = JSON.parse(raw);
        return NextResponse.json(parsed);

      } catch (err: any) {
        if (err.name === "AbortError") continue;
        continue;
      }
    }

    return NextResponse.json(
      { error: "All models failed. Try again with shorter text." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate" }, { status: 500 });
  }
}