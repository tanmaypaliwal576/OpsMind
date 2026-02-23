export const streamChat = async (question, documentId, onChunk) => {
  const response = await fetch("http://localhost:5000/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question, documentId })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (let line of lines) {
      if (line.startsWith("data: ")) {
        const json = line.replace("data: ", "");
        const parsed = JSON.parse(json);

        if (parsed.chunk) {
          onChunk(parsed.chunk);
        }

        if (parsed.done) {
          return;
        }
      }
    }
  }
};