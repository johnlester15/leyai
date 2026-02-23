import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>404 – Not Found</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #111;
      color: #ededed;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .code {
      font-size: 8rem;
      font-weight: 900;
      color: #3ecf8e;
      line-height: 1;
      letter-spacing: -4px;
    }
    .title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 1rem 0 0.5rem;
      color: #ededed;
    }
    .desc {
      font-size: 0.875rem;
      color: #555;
    }
    .back {
      display: inline-block;
      margin-top: 2rem;
      padding: 0.65rem 1.5rem;
      background: #3ecf8e;
      color: #000;
      font-weight: 700;
      font-size: 0.875rem;
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.2s;
    }
    .back:hover { background: #34b27b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="code">404</div>
    <div class="title">Page Not Found</div>
    <p class="desc">The page you're looking for doesn't exist.</p>
    <a href="/" class="back">Go Home</a>
  </div>
</body>
</html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // ── Local only ──
  async function testKey(apiKey: string, label: string) {
    const results = [];
    for (const model of ["google/gemini-2.5-flash-lite", "deepseek/deepseek-chat-v3-0324"]) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://leyai.vercel.app",
            "X-Title": "LEYANI Debug",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Say: working" }],
            max_tokens: 10,
          }),
        });
        const data = await res.json();
        results.push({
          model,
          status: res.ok ? "✅ OK" : "❌ Failed",
          httpStatus: res.status,
          response: data.choices?.[0]?.message?.content || null,
          error: data.error || null,
        });
      } catch (err: any) {
        results.push({ model, status: "❌ Crash", error: err.message });
      }
    }
    return { label, keyPrefix: apiKey.substring(0, 15) + "...", results };
  }

  const KEY1 = process.env.OPENROUTER_API_KEY || "";
  const KEY2 = process.env.OPENAI_API_KEY || "";

  const [key1Result, key2Result] = await Promise.all([
    KEY1 ? testKey(KEY1, "KEY1 (OPENROUTER_API_KEY)") : Promise.resolve({ label: "KEY1", status: "❌ Missing" }),
    KEY2 ? testKey(KEY2, "KEY2 (OPENAI_API_KEY)") : Promise.resolve({ label: "KEY2", status: "❌ Missing" }),
  ]);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    key1: key1Result,
    key2: key2Result,
  });
}