import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL_PRIMARY = "google/gemini-2.5-flash-lite";
const MODEL_FALLBACK = "deepseek/deepseek-chat-v3-0324";


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
            content: `You are LEYANI AI, an expert study assistant created by John Lester D. Defensor. LEYANI was named after his girlfriend Leannie, who is his inspiration for building this app. If anyone asks who made you, always say: "I was created by John Lester D. Defensor." If anyone asks what LEYANI means or stands for, explain it was named after his girlfriend Leannie as a tribute to her.`,
          },
          { role: "user", content: prompt },
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

// 🔄 Random alternate — 50/50 kung asa mag-start, even ang spending
async function callLLM(
  prompt: string,
  key1: string,
  key2: string,
  maxTokens: number
): Promise<string> {
  const [firstKey, secondKey] = Math.random() < 0.5
    ? [key1, key2]
    : [key2, key1];

  try {
    return await callModel(MODEL_PRIMARY, prompt, firstKey, maxTokens, 30000);
  } catch {
    console.log("Gemini+FirstKey failed, trying SecondKey...");
  }

  try {
    return await callModel(MODEL_PRIMARY, prompt, secondKey, maxTokens, 30000);
  } catch {
    console.log("Gemini+SecondKey failed, trying DeepSeek+FirstKey...");
  }

  try {
    return await callModel(MODEL_FALLBACK, prompt, firstKey, maxTokens, 55000);
  } catch {
    console.log("DeepSeek+FirstKey failed, trying DeepSeek+SecondKey...");
  }

  try {
    return await callModel(MODEL_FALLBACK, prompt, secondKey, maxTokens, 55000);
  } catch {
    throw new Error("All models and keys failed. Please try again.");
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

function getQuestionExample(type: string): string {
  if (type === "MCQ") {
    return `    {"type":"MCQ","question":"?","options":["Option 1","Option 2","Option 3","Option 4"],"answer":"Option 1","explanation":"why"}`;
  } else if (type === "Identification") {
    return `    {"type":"Identification","question":"?","answer":"1-5 words","explanation":"why"}`;
  }
  return `    {"type":"MCQ","question":"?","options":["Option 1","Option 2","Option 3","Option 4"],"answer":"Option 1","explanation":"why"},
    {"type":"Identification","question":"?","answer":"1-5 words","explanation":"why"}`;
}

function getTypeRule(type: string): string {
  if (type === "MCQ") return "ALL questions must be MCQ ONLY — do NOT generate any Identification questions!";
  if (type === "Identification") return "ALL questions must be Identification ONLY — do NOT generate any MCQ questions!";
  return "half MCQ, half Identification";
}

function buildStudyKitPrompt(content: string, settings: any, questionCount: number, customInstruction?: string): string {
  const hasInstruction = !!customInstruction?.trim();
  const instructionBlock = hasInstruction
    ? `
⚠️ CRITICAL USER INSTRUCTION — YOU MUST FOLLOW THIS STRICTLY:
"${customInstruction!.trim()}"

FOCUS ONLY on the topic mentioned above. 
- Summary must explain ONLY that specific topic from the material
- Case studies must be about that topic only  
- Questions must test knowledge of that topic only
- Ignore all other topics in the material
`
    : "";

  return `You are an expert study assistant. Analyze this material and generate a study kit as JSON.
${instructionBlock}
MATERIAL:
${content}

Return this EXACT JSON structure:
{
  "summary": "Start with 1-2 sentence topic intro. Then use bullet points with • symbol for key details and subtopics. 150-250 words total. Must be readable and well-structured.",
  "key_concepts": ["8-15 short key terms from the material"],
  "case_studies": [{"title":"Title","scenario":"2-3 sentence simple real-world scenario only"}],
  "questions": [
${getQuestionExample(settings.type)}
  ]
}

STRICT RULES:
- Summary: 1-2 sentence intro THEN bullet points using • symbol for details. 150-250 words MAX.
- key_concepts: 8-15 short key terms only, no definitions
- Case Studies: 3-4 scenarios, title + scenario ONLY — NO lesson field
- NO glossary field
- NO objectives field
- NO takeaways field
- NO key_takeaways field
- EXACTLY ${questionCount} questions, no more no less
- ⚠️ QUESTION TYPE: ${getTypeRule(settings.type)}
- MCQ: exactly 4 options. Difficulty: ${settings.difficulty}
- MCQ OPTIONS must NOT have letter prefixes like "A." or "B."
- MCQ ANSWER must be the EXACT full text of the correct option
- Identification: answer is 1-5 words, NO options field
- Return ONLY valid JSON, no markdown, no extra text`;
}

function buildQuestionsOnlyPrompt(content: string, settings: any, count: number, existing: string, customInstruction?: string): string {
  const instructionBlock = customInstruction?.trim()
    ? `⚠️ FOCUS ONLY ON: "${customInstruction.trim()}" — questions must be about this topic only!\n`
    : "";

  return `Generate EXACTLY ${count} quiz questions from this material. Do NOT repeat existing questions.
${instructionBlock}

MATERIAL:
${content}

EXISTING QUESTIONS (do not repeat):
${existing}

Return ONLY a valid JSON array, nothing else:
[
${getQuestionExample(settings.type)}
]

STRICT RULES:
- EXACTLY ${count} questions total
- ⚠️ QUESTION TYPE: ${getTypeRule(settings.type)}
- MCQ: exactly 4 options, no letter prefixes
- MCQ ANSWER must be EXACT full text of correct option
- Identification: no options field, answer is 1-5 words
- Difficulty: ${settings.difficulty}
- Cover DIFFERENT topics than existing questions
- Return ONLY the JSON array, no markdown, no extra text`;
}

export async function POST(req: NextRequest) {
  try {
    const { content, settings, customInstruction } = await req.json();
    const requestedCount = Math.min(parseInt(settings.count || "10"), 30);

    const KEY1 = process.env.OPENROUTER_API_KEY || "";
    const KEY2 = process.env.OPENAI_API_KEY || "";
    const contentLength = (content || "").length;
    const difficulty = settings.difficulty || "Medium";

    if (!KEY1) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const isFastMode = difficulty === "Easy" && requestedCount <= 15;
    const firstBatchCount = isFastMode ? requestedCount : Math.min(requestedCount, 10);
    const firstMaxTokens = isFastMode ? 5000 : 8000;
    const studyKitPrompt = buildStudyKitPrompt(content, settings, firstBatchCount, customInstruction);

    let studyKit: Record<string, unknown>;
    try {
      const raw = await callLLM(studyKitPrompt, KEY1, KEY2, firstMaxTokens);
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

    if (!isFastMode && requestedCount > allQuestions.length) {
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
        const prompt = buildQuestionsOnlyPrompt(content, settings, batchCount, existingSummary, customInstruction);
        return callLLM(prompt, KEY1, KEY2, batchCount * 600)
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

    allQuestions = normalizeQuestions(allQuestions);
    studyKit.questions = allQuestions.slice(0, requestedCount);

    // Force remove unwanted fields
    delete (studyKit as any).glossary;
    delete (studyKit as any).takeaways;
    delete (studyKit as any).key_takeaways;
    delete (studyKit as any).objectives;

    // Keep only title + scenario in case_studies
    if (Array.isArray(studyKit.case_studies)) {
      studyKit.case_studies = (studyKit.case_studies as any[]).map(
        ({ title, scenario }) => ({ title, scenario })
      );
    }

    return NextResponse.json(studyKit);
  } catch (error: any) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}