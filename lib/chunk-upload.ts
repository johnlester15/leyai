export async function uploadFileInChunks(file: File, onProgress?: (progress: number) => void): Promise<{ uploadId: string; storagePath: string }> {
  const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let storagePath = "";

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunkIndex", i.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("uploadId", uploadId);
    formData.append("fileName", file.name);
    formData.append("fileSize", file.size.toString());

    const response = await fetch("/api/upload-chunk", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }

    const result = await response.json();
    if (result.complete && result.storagePath) {
      storagePath = result.storagePath;
    }

    const progress = Math.round(((i + 1) / totalChunks) * 100);
    onProgress?.(progress);
  }

  return { uploadId, storagePath };
}
