import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function Chat() {
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  // 🔐 Get logged-in user
  const user = JSON.parse(localStorage.getItem("rag_user"));

  /* ============================= */
  /* Auto-scroll */
  /* ============================= */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ============================= */
  /* Redirect if not logged in */
  /* ============================= */
  useEffect(() => {
    const token = localStorage.getItem("rag_token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  /* ============================= */
  /* FILE UPLOAD (UNCHANGED) */
  /* ============================= */
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem("rag_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `📄 Document "${file.name}" uploaded successfully.`,
        },
      ]);

      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Document upload failed.",
        },
      ]);
    } finally {
      setUploading(false);
      fileInputRef.current.value = "";
    }
  };

  /* ============================= */
  /* CHAT STREAM (UNCHANGED) */
  /* ============================= */
  const handleAsk = async () => {
    if (!question.trim()) return;

    const token = localStorage.getItem("rag_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const userMessage = { role: "user", content: question };
    const aiMessage = { role: "assistant", content: "", sources: [] };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/chat/stream",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question }),
        }
      );

      if (response.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (let line of lines) {
          if (!line.startsWith("data: ")) continue;

          const parsed = JSON.parse(line.replace("data: ", ""));

          if (parsed.chunk) {
            const text = parsed.chunk;

            for (let i = 0; i < text.length; i++) {
              await new Promise((resolve) => setTimeout(resolve, 8));
              accumulatedText += text[i];

              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: accumulatedText,
                };
                return updated;
              });
            }
          }

          if (parsed.sources) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                sources: parsed.sources,
              };
              return updated;
            });
          }

          if (parsed.done) {
            setLoading(false);
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      
      {/* HEADER */}
      <div className="border-b border-white/10 bg-zinc-950 px-8 py-5 flex justify-between items-center">
        <h1 className="text-xl font-semibold tracking-wide">
          Enterprise AI Knowledge Assistant
        </h1>

        <div className="flex items-center gap-4">

          {/* 👑 Analytics Button Only for Admin */}
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin/analytics")}
              className="text-sm border border-white/20 px-4 py-2 rounded-lg hover:bg-white hover:text-black transition"
            >
              Analytics
            </button>
          )}

          <button
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className="text-sm bg-white text-black px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>

          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />

          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xl px-5 py-4 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-white text-black"
                    : "bg-zinc-900 border border-white/10"
                }`}
              >
                {msg.content}

                {loading && index === messages.length - 1 && (
                  <span className="animate-pulse ml-1">|</span>
                )}

                {msg.sources?.length > 0 && (
                  <div className="mt-4 text-xs text-gray-400 border-t border-white/10 pt-3 space-y-1">
                    <div className="font-medium text-gray-300">
                      Sources:
                    </div>
                    {msg.sources.map((src, i) => (
                      <div key={i}>
                        {src.filename} — Page {src.page ?? "N/A"} (
                        {(src.similarityScore * 100).toFixed(1)}%)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT AREA */}
      <div className="border-t border-white/10 bg-zinc-950 px-6 py-5">
        <div className="max-w-4xl mx-auto flex gap-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            rows={2}
            className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-white text-black px-6 rounded-xl text-sm font-medium hover:opacity-90 transition"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;