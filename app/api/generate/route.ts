import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = [
  "openai/gpt-3.5-turbo",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
];

async function tryModel(
  model: string,
  prompt: string,
  apiKey: string,
  maxTokens: number,
  timeoutMs: number
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leyai.vercel.app",
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

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`Model ${model} returned ${response.status}`);
    }

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || "";

    if (!raw) throw new Error("Empty response");

    // Clean markdown fences if present
    raw = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    // Try to extract JSON object if there's extra text around it
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");

    const parsed = JSON.parse(jsonMatch[0]);

    // Basic validation
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid response structure");
    }

    return parsed;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

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

    // Race all models in parallel — first successful response wins
    const result = await Promise.any(
      MODELS.map((model) => tryModel(model, prompt, API_KEY, maxTokens, 50000))
    ).catch(() => null);

    if (result) {
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "All models are busy. Please try again in a moment." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}