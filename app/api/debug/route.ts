import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    // 1. Check if API Key exists
    if (!apiKey) {
      return NextResponse.json({
        status: "Error",
        message: "API Key is missing from .env.local",
        suggestion: "Ensure you have OPENROUTER_API_KEY=your_key in your .env.local file."
      }, { status: 500 });
    }

    // 2. Test connection with the simplest model (NVIDIA Nano is very fast)
    const testResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "StudyGen Debugger",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
        messages: [{ role: "user", content: "Say 'API Connection Successful'" }],
        max_tokens: 10
      }),
    });

    const data = await testResponse.json();

    if (!testResponse.ok) {
      return NextResponse.json({
        status: "API Error",
        openRouterResponse: data
      }, { status: testResponse.status });
    }

    // 3. Return Success
    return NextResponse.json({
      status: "Success",
      message: "API is correctly configured!",
      aiResponse: data.choices[0].message.content,
      configuredKeyPrefix: apiKey.substring(0, 10) + "...",
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      status: "Crash",
      error: error.message
    }, { status: 500 });
  }
}