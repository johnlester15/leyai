import { NextResponse } from "next/server";

const MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "openai/gpt-3.5-turbo",
  "stepfun/step-3.5-flash:free",
  "z-ai/glm-4.5-air:free",
];

export async function POST(req: Request) {
  try {
    const { prompt, history, context } = await req.json();

    if (!prompt) {
      return NextResponse.json({ reply: "No question provided." });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!API_KEY) {
      return NextResponse.json({ reply: "API key not configured." });
    }

    const historyMessages = (history || [])
      .slice(-6)
      .map((h: { role: string; text: string }) => ({
        role: h.role === "bot" ? "assistant" : "user",
        content: h.text,
      }));

   const systemPrompt = `You are LEYANI AI, a helpful study assistant created by John Lester D. Defensor. 
LEYANI was named after his girlfriend Leannie, who is his inspiration for building this app.
John Lester and Leannie have been together since February 14, 2025 — they just celebrated their 1st anniversary!
If anyone asks who made you or who created you, always say: "I was created by John Lester D. Defensor."
If anyone asks what LEYANI means or stands for, explain it was named after his girlfriend Leannie as a tribute to her.
If anyone asks about Leannie or their relationship, share that they've been together since February 14, 2025.
${context ? `Context about the lesson: ${context}` : ""}
Answer questions clearly and helpfully. Keep responses concise (2-4 sentences).
Do NOT use markdown formatting like ** or * in your responses. Plain text only.`;


    for (const model of MODELS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://leyai.vercel.app",
            "X-Title": "LEYANI AI",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...historyMessages,
              { role: "user", content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) continue;

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "";
        if (!reply) continue;

        // Clean markdown
        const cleaned = reply
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .trim();

        return NextResponse.json({ reply: cleaned });

      } catch (err: any) {
        if (err.name === "AbortError") continue;
        continue;
      }
    }

    // Fallback: Simple rule-based response
    const lowerPrompt = prompt.toLowerCase();

    // Identity questions fallback
    if (lowerPrompt.includes("who made you") || lowerPrompt.includes("who created you") || lowerPrompt.includes("kinsa nag buhat")) {
      return NextResponse.json({ reply: "I was created by John Lester D. Defensor." });
    }
    if (lowerPrompt.includes("leyani") || lowerPrompt.includes("what does your name mean")) {
      return NextResponse.json({ reply: "LEYANI was named after the creator's girlfriend, Leannie, who inspired the development of this app." });
    }

    let fallback = "That's a great question! Based on what we've covered, think about how the key concepts relate to your learning objectives.";
    if (lowerPrompt.includes("why")) {
      fallback = "Understanding the 'why' is crucial for deep learning. The key concepts are foundational because they appear across multiple topics and applications.";
    } else if (lowerPrompt.includes("how")) {
      fallback = "When applying these concepts, start by identifying which principle applies to your situation, then work through the steps systematically.";
    } else if (lowerPrompt.includes("example")) {
      fallback = "Real-world examples help anchor abstract concepts. Think about where you've seen these principles in action in your own studies or work.";
    }

    return NextResponse.json({ reply: fallback });

  } catch (error: any) {
    console.error("StudyChat error:", error?.message);
    return NextResponse.json({ reply: "I'm here to help! Ask me about the concepts, examples, or how to apply what you've learned." });
  }
}