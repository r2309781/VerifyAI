import { useState } from "react";

export default function AIAgent() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi! I’m your VerifyAI assistant. Ask me about fact-checking, URLs, or credibility." }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userMessage.text })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.reply }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.message || "Something went wrong." }
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Could not connect to the AI service." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button className="ai-fab" onClick={() => setOpen(true)}>
          AI
        </button>
      )}

      {open && (
        <div className="ai-popup">
          <div className="ai-header">
            <span>VerifyAI Assistant</span>
            <button className="ai-close" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div className="ai-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`ai-message ${msg.sender === "user" ? "user-msg" : "ai-msg"}`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="ai-input-row">
            <input
              type="text"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
            <button onClick={handleSend} disabled={loading}>
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}