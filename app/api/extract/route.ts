import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();
    let text = "";

    if (ext === "txt") {
      text = buffer.toString("utf-8");

    } else if (ext === "docx") {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch {
        return NextResponse.json({ error: "Install mammoth: npm install mammoth" }, { status: 500 });
      }

    } else if (ext === "pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } catch {
        return NextResponse.json({ error: "Install pdf-parse: npm install pdf-parse" }, { status: 500 });
      }

    } else if (ext === "pptx" || ext === "ppt") {
      try {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(buffer);
        const slideTexts: string[] = [];

        const slideFiles = Object.keys(zip.files)
          .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
            return numA - numB;
          });

        for (const slideName of slideFiles) {
          const slideXml = await zip.files[slideName].async("string");
          // Extract text from XML tags
          const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
          const slideText = textMatches
            .map(t => t.replace(/<[^>]+>/g, ""))
            .filter(t => t.trim())
            .join(" ");
          if (slideText.trim()) {
            const slideNum = slideName.match(/slide(\d+)/)?.[1];
            slideTexts.push(`[Slide ${slideNum}] ${slideText}`);
          }
        }

        text = slideTexts.join("\n");
      } catch (err: any) {
        return NextResponse.json({ error: "Failed to read PPTX: " + err.message }, { status: 500 });
      }

    } else {
      return NextResponse.json({ error: "Unsupported file. Use PDF, PPTX, DOCX, or TXT." }, { status: 400 });
    }

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "Could not extract text. Try pasting your notes instead." }, { status: 400 });
    }

    return NextResponse.json({ 
      text: text.trim().slice(0, 6000),
      chars: text.length,
      ext 
    });

  } catch (error: any) {
    console.error("Extract error:", error?.message);
    return NextResponse.json({ error: "Failed to read file." }, { status: 500 });
  }
}