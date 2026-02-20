import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Store chunks in memory temporarily (clears when serverless function ends)
const uploadSessions: Record<string, { chunks: Buffer[]; fileName: string; fileSize: number }> = {};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const chunk = formData.get("chunk") as File;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    const uploadId = formData.get("uploadId") as string;
    const fileName = formData.get("fileName") as string;
    const fileSize = parseInt(formData.get("fileSize") as string);

    if (!chunk || uploadId === null) {
      return NextResponse.json({ error: "Missing chunk or uploadId" }, { status: 400 });
    }

    // Initialize session if needed
    if (!uploadSessions[uploadId]) {
      uploadSessions[uploadId] = { chunks: [], fileName, fileSize };
    }

    // Store chunk
    const buffer = Buffer.from(await chunk.arrayBuffer());
    uploadSessions[uploadId].chunks[chunkIndex] = buffer;

    // Check if all chunks received
    const session = uploadSessions[uploadId];
    const allChunksReceived = session.chunks.length === totalChunks && 
                              session.chunks.every(c => c !== undefined);

    if (allChunksReceived) {
      // Reconstruct file
      const fileBuffer = Buffer.concat(session.chunks);
      
      // Upload to Supabase
      const timestamp = Date.now();
      const storagePath = `${timestamp}-${fileName}`;
      
      await supabase.storage
        .from("LeyaAI")
        .upload(storagePath, fileBuffer, { contentType: "application/octet-stream" });

      // Clean up session
      delete uploadSessions[uploadId];

      return NextResponse.json({ uploadId, storagePath, complete: true });
    }

    return NextResponse.json({ uploadId, chunkIndex, complete: false });
  } catch (error: any) {
    console.error("Chunk upload error:", error?.message);
    return NextResponse.json({ error: error?.message || "Chunk upload failed" }, { status: 500 });
  }
}
