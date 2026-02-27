/**
 * Split long text into overlapping chunks
 */
export const chunkText = (
  text,
  chunkSize = 1200,
  overlap = 200
) => {
  if (!text || text.length === 0) return [];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 50) {   // avoid tiny garbage chunks
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
};