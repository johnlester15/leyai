import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = [
  "openai/gpt-3.5-turbo",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
];

async function callLLM(
  model: string,
  prompt: string,
  apiKey: string,
  maxTokens: number,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leyai.vercel.app",
        "X-Title": "LEYANI AI",
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
    if (!response.ok) throw new Error(`${model}: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    if (!raw) throw new Error("Empty response");
    return raw;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function extractJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Try direct parse first
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // JSON may be truncated — try to repair it
    }
  }

  // Repair truncated JSON: find the outermost { and try to close it
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON found");
  let jsonStr = cleaned.substring(start);

  // Remove any trailing incomplete item (cut mid-string, mid-object, etc.)
  // Find the last complete question object by finding last "}" before truncation
  const lastCompleteObj = jsonStr.lastIndexOf("}");
  if (lastCompleteObj === -1) throw new Error("No JSON found");

  jsonStr = jsonStr.substring(0, lastCompleteObj + 1);

  // Close any unclosed arrays and objects
  const openBraces = (jsonStr.match(/\{/g) || []).length;
  const closeBraces = (jsonStr.match(/\}/g) || []).length;
  const openBrackets = (jsonStr.match(/\[/g) || []).length;
  const closeBrackets = (jsonStr.match(/\]/g) || []).length;

  // Add missing closing brackets and braces
  jsonStr += "]".repeat(Math.max(0, openBrackets - closeBrackets));
  jsonStr += "}".repeat(Math.max(0, openBraces - closeBraces));

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error("Could not parse AI response. Please try again.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, settings } = await req.json();
    const questionCount = parseInt(settings.count || "10");

    const API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const prompt = `You are an expert study assistant and educator. Analyze the following study material and generate a comprehensive study kit in JSON format.

STUDY MATERIAL:
${content}

SETTINGS:
- Quiz Type: ${settings.type}
- Difficulty: ${settings.difficulty}
- Number of Questions: ${questionCount}

Generate a JSON object with EXACTLY this structure:

{
  "summary": "A comprehensive, student-friendly explanation of ALL the key topics in the material. This should be like a mini-lecture that helps students UNDERSTAND the material deeply. Write 400–600 words MINIMUM. Cover every major topic. Explain concepts clearly using simple language. Use short paragraphs (3-4 sentences each). Explain WHY things matter, give examples, and connect ideas together. A student reading ONLY this summary should be able to understand the core material well enough to answer questions about it.",

  "objectives": [
    "After studying this material, students will be able to...",
    "Include 5–8 specific, measurable learning objectives that cover all key topics"
  ],

  "key_concepts": [
    "List 8–15 key concepts/terms from the material"
  ],

  "glossary": [
    {
      "term": "Term Name",
      "definition": "A clear definition in 1–3 sentences. Include an example or analogy when helpful."
    }
  ],

  "case_studies": [
    {
      "title": "Short descriptive title",
      "scenario": "A realistic real-world scenario (4–6 sentences) that applies concepts from the material. Make it engaging and relatable.",
      "lesson": "What this teaches — connect it to 2–3 key concepts."
    }
  ],

  "questions": [
    {
      "type": "MCQ",
      "question": "Clear question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The correct option exactly as written",
      "explanation": "2–3 sentence explanation of why this is correct."
    },
    {
      "type": "Identification",
      "question": "What is ___?",
      "answer": "Short answer (1–5 words)",
      "explanation": "2–3 sentence explanation."
    }
  ]
}

CRITICAL RULES:
- Summary: MUST be 400–600 words minimum. Cover ALL major topics. Plain English paragraphs, NO bullet points. Make it educational — students should learn from reading it.
- Glossary: 8–15 terms with clear, student-friendly definitions.
- Case Studies: 3–4 realistic scenarios.
- Objectives: 5–8 clear learning objectives.
- Key Concepts: 8–15 concepts.

QUESTION RULES (VERY IMPORTANT):
- You MUST generate EXACTLY ${questionCount} questions. Not fewer, not more. COUNT THEM.
- I repeat: the "questions" array MUST contain exactly ${questionCount} items.
- Type: ${settings.type === "Mixed" ? "roughly half MCQ and half Identification" : settings.type === "MCQ" ? "ALL questions must be MCQ" : "ALL questions must be Identification"}.
- Every MCQ must have exactly 4 options with one correct answer.
- Difficulty "${settings.difficulty}": ${settings.difficulty === "Easy" ? "basic recall, definitions, and simple facts" : settings.difficulty === "Medium" ? "application, understanding, and comparing concepts" : "analysis, synthesis, evaluation, and critical thinking"}.
- Make questions diverse — cover different parts of the material. Do not repeat similar questions.
- Each question must be unique and test a different concept or angle.

Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.`;

    // Calculate tokens needed: ~200 tokens per question + ~3000 for study kit content
    const maxTokens = Math.min(3000 + questionCount * 200, 16000);

    // Race all models in parallel — first successful response wins
    const result = await Promise.any(
      MODELS.map((model) => callLLM(model, prompt, API_KEY, maxTokens, 55000))
    ).catch(() => null);

    if (!result) {
      return NextResponse.json(
        { error: "All models are busy. Please try again in a moment." },
        { status: 500 }
      );
    }

    const parsed = extractJSON(result);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "Invalid response from AI. Please try again." },
        { status: 500 }
      );
    }

    // Enforce exact question count — trim extras, never return more than requested
    parsed.questions = (parsed.questions as any[]).slice(0, questionCount);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}