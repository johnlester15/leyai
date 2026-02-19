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
      } catch (err: any) {
        console.error("Mammoth error:", err?.message);
        return NextResponse.json({ error: "Failed to read DOCX: " + err?.message }, { status: 500 });
      }

    } else if (ext === "pdf") {
      try {
        const pdfModule = await import("pdf-parse");
        const pdfParse = (pdfModule as any).default || pdfModule;
        
        if (typeof pdfParse !== 'function') {
          throw new Error("pdf-parse is not callable");
        }
        
        const pdfData = await pdfParse(buffer);
        text = pdfData?.text || "";
      } catch (err: any) {
        console.error("PDF error:", err?.message);
        return NextResponse.json({ error: "Failed to read PDF: " + err?.message }, { status: 500 });
      }

    } else if (ext === "pptx" || ext === "ppt") {
      try {
        let JSZip: any;
        try {
          const jsZipModule = await import("jszip");
          JSZip = jsZipModule.default || jsZipModule;
        } catch (importErr: any) {
          console.error("JSZip import error:", importErr?.message);
          return NextResponse.json({ error: "PPTX module not available" }, { status: 500 });
        }

        if (!buffer || buffer.length === 0) {
          throw new Error("Invalid file buffer");
        }

        const zip = await JSZip.loadAsync(buffer);
        const slideTexts: string[] = [];

        const slideFiles = Object.keys(zip.files)
          .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
            return numA - numB;
          });

        console.log(`Found ${slideFiles.length} slides in PPTX`);

        for (const slideName of slideFiles) {
          try {
            const slideXml = await zip.files[slideName].async("string");
            const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
            const slideText = textMatches
              .map((t: string) => t.replace(/<[^>]+>/g, ""))
              .filter((t: string) => t.trim())
              .join(" ");
            if (slideText.trim()) {
              const slideNum = slideName.match(/slide(\d+)/)?.[1];
              slideTexts.push(`[Slide ${slideNum}] ${slideText}`);
            }
          } catch (slideErr: any) {
            console.error(`Error reading slide ${slideName}:`, slideErr?.message);
          }
        }

        text = slideTexts.join("\n");
        
        if (!text || text.trim().length === 0) {
          return NextResponse.json({ error: "No text found in PPTX file. Make sure it has text content." }, { status: 400 });
        }
      } catch (err: any) {
        console.error("PPTX error:", err?.message, err?.stack);
        return NextResponse.json({ error: "Failed to read PPTX: " + (err?.message || "Unknown error") }, { status: 500 });
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
    console.error("Extract error:", error?.message, error?.stack);
    return NextResponse.json({ error: "Failed to read file: " + (error?.message || "Unknown error") }, { status: 500 });
  }
}