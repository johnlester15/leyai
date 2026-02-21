import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// ⚡ Ordered by speed: fastest first — Promise.any picks the winner!
const FREE_MODELS = [
  "stepfun/step-3.5-flash:free",                   // 🥇 ultra fast
  "z-ai/glm-4.5-air:free",                         // 🥈 fast
  "mistralai/mistral-small-3.1-24b-instruct:free", // 🥉 fast + great JSON
  "google/gemini-2.0-flash-exp:free",              // ⚡ fast + 1M context
  "nvidia/nemotron-3-nano-30b-a3b:free",           // ⚡ fast nano
  "meta-llama/llama-3.3-70b-instruct:free",        // reliable quality
  "arcee-ai/trinity-large-preview:free",           // solid fallback
  "openai/gpt-oss-120b:free",                      // OpenAI free 120B
  "qwen/qwen3-235b-a22b-thinking:free",            // 🧠 best reasoning (slower)
];

// 🔁 Fallback: fastest free model if all above fail
const FALLBACK_MODEL = "stepfun/step-3.5-flash:free";

async function callModel(
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
        messages: [
          {
            role: "system",
            content: `You are LEYANI AI, an expert study assistant created by John Lester D. Defensor. LEYANI was named after his girlfriend Leannie, who is his inspiration for building this app. If anyone asks who made you, always say: "I was created by John Lester D. Defensor." If anyone asks what LEYANI means or stands for, explain it was named after his girlfriend Leannie as a tribute to her.`
          },
          { role: "user", content: prompt }
        ],
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

// ⚡ Race ALL free models simultaneously — fastest wins!
// Simple = race fast models first (top 5)
// Hard/Large = race all models at once
async function callLLM(
  prompt: string,
  apiKey: string,
  maxTokens: number,
  contentLength: number,
  difficulty: string
): Promise<string> {
  const isSimple = contentLength < 3000 && difficulty !== "Hard";

  // For simple tasks, only race the top 5 fastest models
  const modelsToRace = isSimple ? FREE_MODELS.slice(0, 5) : FREE_MODELS;

  try {
    return await Promise.any(
      modelsToRace.map((model) => callModel(model, prompt, apiKey, maxTokens, 20000))
    );
  } catch {
    // All raced models failed — try fallback
    try {
      return await callModel(FALLBACK_MODEL, prompt, apiKey, maxTokens, 25000);
    } catch {
      throw new Error("All models failed. Please try again.");
    }
  }
}

function repairAndParseJSON(raw: string): Record<string, unknown> {
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* try repair */ }
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
    try { return JSON.parse(match[0]); } catch { /* try repair */ }
  }

  const start = cleaned.indexOf("[");
  if (start === -1) throw new Error("No array found");
  let arrStr = cleaned.substring(start);

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

function normalizeQuestions(questions: any[]): any[] {
  const letterPrefixRegex = /^[A-Da-d][.):\-]\s*/;
  return questions.map((q: any) => {
    if (q.type === "MCQ" && Array.isArray(q.options)) {
      q.options = q.options.map((opt: string) => opt.replace(letterPrefixRegex, "").trim());

      const letterMatch = q.answer?.trim().match(/^([A-Da-d])\.?$/);
      if (letterMatch) {
        const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < q.options.length) {
          q.answer = q.options[idx];
        }
      } else if (q.answer) {
        q.answer = q.answer.replace(letterPrefixRegex, "").trim();
      }

      if (q.answer && !q.options.includes(q.answer)) {
        const match = q.options.find((opt: string) =>
          opt.toLowerCase().trim() === q.answer.toLowerCase().trim()
        );
        if (match) q.answer = match;
      }
    }
    return q;
  });
}

function buildStudyKitPrompt(content: string, settings: any, questionCount: number): string {
  return `You are an expert study assistant. Analyze this material and generate a study kit as JSON.

MATERIAL:
${content}

Return this EXACT JSON structure:
{
  "summary": "400-600 word comprehensive explanation covering ALL topics. Plain paragraphs, no bullets.",
  "objectives": ["5-8 learning objectives"],
  "key_concepts": ["8-15 key terms"],
  "glossary": [{"term":"Name","definition":"Clear 1-3 sentence definition"}],
  "case_studies": [{"title":"Title","scenario":"4-6 sentence real scenario","lesson":"Connection to concepts"}],
  "questions": [
    {"type":"MCQ","question":"?","options":["Option 1","Option 2","Option 3","Option 4"],"answer":"Option 1","explanation":"why"},
    {"type":"Identification","question":"?","answer":"1-5 words","explanation":"why"}
  ]
}

STRICT RULES:
- Summary: 400-600 words, cover all topics, plain paragraphs
- Glossary: 8-15 terms
- Case Studies: 3-4 scenarios
- EXACTLY ${questionCount} questions, no more no less
- Type: ${settings.type === "Mixed" ? "half MCQ, half Identification" : settings.type === "MCQ" ? "all MCQ" : "all Identification"}
- MCQ: exactly 4 options. Difficulty: ${settings.difficulty}
- MCQ OPTIONS must NOT have letter prefixes like "A." or "B."
- MCQ ANSWER must be the EXACT full text of the correct option
- Return ONLY valid JSON, no markdown, no extra text`;
}

function buildQuestionsOnlyPrompt(content: string, settings: any, count: number, existing: string): string {
  return `Generate EXACTLY ${count} quiz questions from this material. Do NOT repeat existing questions.

MATERIAL:
${content}

EXISTING QUESTIONS (do not repeat):
${existing}

Return ONLY a valid JSON array, nothing else:
[
  {"type":"MCQ","question":"?","options":["Option 1","Option 2","Option 3","Option 4"],"answer":"Option 1","explanation":"why"},
  {"type":"Identification","question":"?","answer":"1-5 words","explanation":"why"}
]

STRICT RULES:
- EXACTLY ${count} questions total
- Type: ${settings.type === "Mixed" ? "mix MCQ and Identification evenly" : settings.type}
- MCQ: exactly 4 options, no letter prefixes
- MCQ ANSWER must be EXACT full text of correct option
- Identification: no options field, answer is 1-5 words
- Difficulty: ${settings.difficulty}
- Cover DIFFERENT topics than existing questions
- Return ONLY the JSON array, no markdown, no extra text`;
}

export async function POST(req: NextRequest) {
  try {
    const { content, settings } = await req.json();
    const requestedCount = Math.min(parseInt(settings.count || "10"), 30);
    const API_KEY = process.env.OPENROUTER_API_KEY || "";
    const contentLength = (content || "").length;
    const difficulty = settings.difficulty || "Medium";

    if (!API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // ── STEP 1: Generate study kit + first 10 questions ──
    const firstBatchCount = Math.min(requestedCount, 10);
    const studyKitPrompt = buildStudyKitPrompt(content, settings, firstBatchCount);

    let studyKit: Record<string, unknown>;
    try {
      const raw = await callLLM(studyKitPrompt, API_KEY, 4000, contentLength, difficulty);
      studyKit = repairAndParseJSON(raw);
      if (!studyKit.questions || !Array.isArray(studyKit.questions)) {
        throw new Error("Missing questions");
      }
    } catch (err) {
      console.error("Study kit generation failed:", err);
      return NextResponse.json(
        { error: "Failed to generate study kit. Please try again." },
        { status: 500 }
      );
    }

    let allQuestions: any[] = studyKit.questions as any[];

    // ── STEP 2: Fetch remaining questions in parallel batches of 10 ──
    if (requestedCount > allQuestions.length) {
      const remaining = requestedCount - allQuestions.length;
      const batchSize = 10;
      const batches: number[] = [];

      for (let i = 0; i < remaining; i += batchSize) {
        batches.push(Math.min(batchSize, remaining - i));
      }

      const batchPromises = batches.map((batchCount) => {
        const existingSummary = allQuestions
          .map((q: any, i: number) => `${i + 1}. ${q.question}`)
          .join("\n");
        const prompt = buildQuestionsOnlyPrompt(content, settings, batchCount, existingSummary);
        return callLLM(prompt, API_KEY, batchCount * 200, contentLength, difficulty)
          .then((raw) => parseJSONArray(raw))
          .catch((err) => {
            console.error("Batch failed:", err);
            return [] as any[];
          });
      });

      const batchResults = await Promise.allSettled(batchPromises);
      for (const result of batchResults) {
        if (result.status === "fulfilled" && Array.isArray(result.value)) {
          allQuestions = allQuestions.concat(result.value);
        }
      }
    }

    // ── STEP 3: Normalize + enforce exact count ──
    allQuestions = normalizeQuestions(allQuestions);
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