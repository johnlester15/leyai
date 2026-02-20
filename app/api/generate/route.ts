import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRIMARY_MODEL = "arcee-ai/trinity-large-preview:free";
const BACKUP_MODEL  = "openai/gpt-3.5-turbo";

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

// Try Trinity (10s) → if it fails, GPT (25s). Only 2 models, fast fallback.
async function smartGenerate(prompt: string, apiKey: string, maxTokens: number): Promise<string> {
  // Try free model first with short timeout
  try {
    return await callLLM(PRIMARY_MODEL, prompt, apiKey, maxTokens, 10000);
  } catch {
    // Free model failed — go straight to GPT (reliable)
    return await callLLM(BACKUP_MODEL, prompt, apiKey, maxTokens, 25000);
  }
}

function repairAndParseJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* truncated, try repair */ }
  }

  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON found");
  let jsonStr = cleaned.substring(start);

  const lastObj = jsonStr.lastIndexOf("}");
  if (lastObj === -1) throw new Error("No JSON found");
  jsonStr = jsonStr.substring(0, lastObj + 1);

  const openBraces = (jsonStr.match(/\{/g) || []).length;
  const closeBraces = (jsonStr.match(/\}/g) || []).length;
  const openBrackets = (jsonStr.match(/\[/g) || []).length;
  const closeBrackets = (jsonStr.match(/\]/g) || []).length;
  jsonStr += "]".repeat(Math.max(0, openBrackets - closeBrackets));
  jsonStr += "}".repeat(Math.max(0, openBraces - closeBraces));

  try { return JSON.parse(jsonStr); } catch {
    throw new Error("Could not parse AI response. Please try again.");
  }
}

function parseJSONArray(raw: string): any[] {
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* truncated */ }
  }

  const start = cleaned.indexOf("[");
  if (start === -1) throw new Error("No array found");
  let arrStr = cleaned.substring(start);

  // Find last complete object
  const lastObj = arrStr.lastIndexOf("}");
  if (lastObj === -1) throw new Error("No array found");
  arrStr = arrStr.substring(0, lastObj + 1);

  const openBrackets = (arrStr.match(/\[/g) || []).length;
  const closeBrackets = (arrStr.match(/\]/g) || []).length;
  arrStr += "]".repeat(Math.max(0, openBrackets - closeBrackets));

  const openBraces = (arrStr.match(/\{/g) || []).length;
  const closeBraces = (arrStr.match(/\}/g) || []).length;
  arrStr += "}".repeat(Math.max(0, openBraces - closeBraces));

  try { return JSON.parse(arrStr); } catch {
    throw new Error("Could not parse questions response.");
  }
}

function buildStudyKitPrompt(content: string, settings: any, questionCount: number): string {
  return `You are an expert study assistant. Analyze this material and generate a study kit as JSON.

MATERIAL:
${content}

Return this JSON structure:
{
  "summary": "400-600 word comprehensive explanation covering ALL topics. Plain paragraphs, no bullets. Explain why things matter. A student should learn from reading this alone.",
  "objectives": ["5-8 learning objectives"],
  "key_concepts": ["8-15 key terms"],
  "glossary": [{"term":"Name","definition":"Clear 1-3 sentence definition"}],
  "case_studies": [{"title":"Title","scenario":"4-6 sentence real scenario","lesson":"Connection to concepts"}],
  "questions": [
    {"type":"MCQ","question":"?","options":["A","B","C","D"],"answer":"correct option","explanation":"why"},
    {"type":"Identification","question":"?","answer":"1-5 words","explanation":"why"}
  ]
}

RULES:
- Summary: 400-600 words, cover all topics, plain English
- Glossary: 8-15 terms
- Case Studies: 3-4 scenarios
- EXACTLY ${questionCount} questions
- Type: ${settings.type === "Mixed" ? "half MCQ, half Identification" : settings.type === "MCQ" ? "all MCQ" : "all Identification"}
- MCQ: 4 options each. Difficulty: ${settings.difficulty}
- All questions must be different, covering different concepts
- ONLY valid JSON, no markdown`;
}

function buildQuestionsOnlyPrompt(content: string, settings: any, count: number, existing: string): string {
  return `Generate EXACTLY ${count} quiz questions from this material as a JSON array. Do NOT repeat existing questions.

MATERIAL:
${content}

EXISTING (do not repeat):
${existing}

Return ONLY a JSON array:
[{"type":"${settings.type === "Identification" ? "Identification" : "MCQ"}","question":"?","options":["A","B","C","D"],"answer":"correct","explanation":"why"}]

RULES:
- EXACTLY ${count} questions, count carefully
- Type: ${settings.type === "Mixed" ? "mix MCQ and Identification" : settings.type}
- MCQ: 4 options. Identification: no options field, answer is 1-5 words
- Difficulty: ${settings.difficulty}
- Cover DIFFERENT topics than existing questions
- ONLY valid JSON array, nothing else`;
}

export async function POST(req: NextRequest) {
  try {
    const { content, settings } = await req.json();
    // Cap at 30 max
    const requestedCount = Math.min(parseInt(settings.count || "10"), 30);

    const API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Step 1: Generate study kit + first set of questions
    // For 15 or fewer, ask for all. For more, ask for 15 to keep output small and reliable.
    const firstCount = Math.min(requestedCount, 15);
    const studyKitPrompt = buildStudyKitPrompt(content, settings, firstCount);

    const startTime = Date.now();

    let studyKit: Record<string, unknown>;
    try {
      const raw = await smartGenerate(studyKitPrompt, API_KEY, 8000);
      studyKit = repairAndParseJSON(raw);
      if (!studyKit.questions || !Array.isArray(studyKit.questions)) {
        throw new Error("Missing questions");
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to generate study kit. Please try again." },
        { status: 500 }
      );
    }

    let allQuestions = studyKit.questions as any[];

    // Step 2: If we need more questions, use GPT directly (fast, reliable)
    // Only attempt if we have enough time left (at least 20s)
    if (allQuestions.length < requestedCount && (Date.now() - startTime) < 35000) {
      const remaining = requestedCount - allQuestions.length;
      const existingSummary = allQuestions.map((q: any, i: number) => `${i + 1}. ${q.question}`).join("\n");
      const extraPrompt = buildQuestionsOnlyPrompt(content, settings, remaining, existingSummary);

      try {
        // Use GPT directly for Step 2 — fast and reliable, no wasting time on free models
        const raw = await callLLM(BACKUP_MODEL, extraPrompt, API_KEY, Math.min(remaining * 250, 8000), 20000);
        const extraQuestions = parseJSONArray(raw);
        if (Array.isArray(extraQuestions) && extraQuestions.length > 0) {
          allQuestions = allQuestions.concat(extraQuestions);
        }
      } catch {
        // Step 2 failed — return what we have from Step 1
      }
    }

    // Enforce exact count
    studyKit.questions = allQuestions.slice(0, requestedCount);

    return NextResponse.json(studyKit);
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}
