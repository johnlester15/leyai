import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30; // Vercel Free allows up to 30s for functions

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
        const pdf = require("pdf-parse");
        
        const pdfData = await pdf(buffer);
        text = (pdfData.text || "")
          .split('\n')
          .filter((line: string) => line.trim().length > 0)
          .join('\n')
          .substring(0, 5000);
          
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

        const slideFiles = Object.keys(zip.files)
          .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
            return numA - numB;
          });

        // Limit to first 80 slides for large presentations
        const limitedSlides = slideFiles.slice(0, 80);
        console.log(`Processing ${limitedSlides.length} of ${slideFiles.length} slides`);

        // Process slides in parallel with timeout protection
        const slidePromises = limitedSlides.map(async (slideName) => {
          try {
            const slideXml = await zip.files[slideName].async("string");
            const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
            let slideText = textMatches
              .map((t: string) => t.replace(/<[^>]+>/g, ""))
              .filter((t: string) => t.trim())
              .join(" ");
            
            // Limit text per slide to speed up processing
            if (slideText.length > 500) {
              slideText = slideText.substring(0, 500) + "...";
            }
            
            if (slideText.trim()) {
              const slideNum = slideName.match(/slide(\d+)/)?.[1];
              return `[Slide ${slideNum}] ${slideText}`;
            }
            return null;
          } catch (slideErr: any) {
            console.error(`Error reading slide ${slideName}:`, slideErr?.message);
            return null;
          }
        });

        const slideResults = await Promise.allSettled(slidePromises);
        const processedSlides = slideResults
          .filter(result => result.status === "fulfilled" && result.value !== null)
          .map(result => (result as PromiseFulfilledResult<string>).value);

        text = processedSlides.join("\n");
        
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