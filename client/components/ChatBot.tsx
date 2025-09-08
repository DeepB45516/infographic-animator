// client/components/ChatBot.tsx
import React, { useState } from "react";

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
  if (!input.trim()) return;

  // Add user message
  setMessages((prev) => [...prev, { sender: "user", text: input }]);
  const userInput = input;
  setInput("");
  setLoading(true);

  try {
    const response = await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userInput }),
    });

    const data = await response.json();

    let botText = "I'm here to help! Could you please rephrase your question?";

    if (Array.isArray(data)) {
      botText = data[0]?.generated_text || botText;
    } else if (data.generated_text) {
      botText = data.generated_text;
    }

    setMessages((prev) => [...prev, { sender: "bot", text: botText }]);
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: "I'm temporarily unavailable. Please try again." },
    ]);
  }

  setLoading(false);
};


  return (
    <div>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700"
      >
        💬
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-white border rounded-2xl shadow-lg flex flex-col">
          <div className="p-3 bg-blue-600 text-white rounded-t-2xl font-bold">
            Website Assistant
          </div>
          <div className="flex-1 p-3 overflow-y-auto max-h-96">
            {messages.length === 0 && (
              <div className="text-gray-600 text-sm mb-2">
                Hi! I'm here to help with any questions about our website.
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`my-2 p-2 rounded-lg ${
                  msg.sender === "user" ? "bg-blue-100 text-right" : "bg-gray-100 text-left"
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && <div className="text-gray-400">Thinking...</div>}
          </div>
          <div className="p-2 flex border-t">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 border rounded px-2 py-1"
              placeholder="Ask me anything..."
            />
            <button
              onClick={sendMessage}
              className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
