import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import API from "../api/api";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import "./ChatWindow.css";

const titleFromPrompt = (text) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 38
    ? `${cleaned.slice(0, 38)}...`
    : cleaned || "New Chat";
};

function ChatWindow({ selectedChat, onCreateChat, onChatTitleChange }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    async function loadMessages() {
      if (!selectedChat) {
        setMessages([]);
        return;
      }

      setError("");

      try {
        const res = await API.get(`/chats/${selectedChat.id}`);

        if (!ignore) {
          setMessages(res.data.messages ?? []);
        }
      } catch (err) {
        console.log(err);

        if (!ignore) {
          setError("Could not load this chat.");
        }
      }
    }

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const updateTitleIfNeeded = async (text) => {
    if (!selectedChat || selectedChat.title !== "New Chat") return;

    const nextTitle = titleFromPrompt(text);
    await API.put(`/chats/${selectedChat.id}`, { title: nextTitle });
    onChatTitleChange(selectedChat.id, nextTitle);
  };

  const saveMessage = async (payload) => {
    const res = await API.post("/messages", payload);
    return { ...payload, id: res.data.id };
  };

  const sendMessage = async ({ text, file }) => {
    if (!selectedChat || isLoading || uploading) return;

    const prompt = text.trim();
    if (!prompt && !file) return;

    setError("");
    setIsLoading(true);

    try {
      let uploadData = null;

      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await API.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadData = uploadRes.data;
        setUploading(false);
      }

      const userText =
        prompt || `Uploaded ${uploadData?.filename ?? file.name}`;
      const savedUser = await saveMessage({
        chatId: selectedChat.id,
        text: userText,
        isUser: true,
        fileName: uploadData?.filename,
        fileType: file?.type || file?.name?.split(".").pop(),
        fileUrl: uploadData?.fileUrl,
      });

      setMessages((prev) => [...prev, savedUser]);
      await updateTitleIfNeeded(userText);

      const aiRes = await API.post("/analyze", {
        query: userText,
        chatId: selectedChat.id,
        fileName: uploadData?.filename,
        fileContext: uploadData?.extractedText,
      });

      const savedAi = await saveMessage({
        chatId: selectedChat.id,
        text: aiRes.data.response || "I could not produce a response.",
        isUser: false,
      });

      setMessages((prev) => [
        ...prev,
        {
          ...savedAi,
          source: aiRes.data.source,
          confidence: aiRes.data.confidence,
          mode: aiRes.data.mode,
          latency: aiRes.data.latency,
        },
      ]);
    } catch (err) {
      console.log(err);
      setUploading(false);
      setError("Something went wrong while processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

  const editMessage = async (messageId, nextText) => {
    await API.put(`/messages/${messageId}`, { text: nextText });
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, text: nextText } : message,
      ),
    );
  };

  const deleteMessage = async (messageId) => {
    await API.delete(`/messages/${messageId}`);
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
  };

  const sendFeedback = async (message, rating) => {
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    const previousUserMessage =
      messages
        .slice(0, messageIndex)
        .reverse()
        .find((item) => item.isUser)?.text ?? "";

    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id ? { ...item, feedback: rating } : item,
      ),
    );

    try {
      await API.post("/feedback", {
        query: previousUserMessage,
        answer: message.text,
        rating,
        source: message.source ?? "ai",
        mode: message.mode ?? null,
      });
    } catch (err) {
      console.log(err);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, feedback: undefined } : item,
        ),
      );
    }
  };

  if (!selectedChat) {
    return (
      <main className="chat-window empty">
        <section className="welcome-panel">
          <div className="welcome-icon">
            <Sparkles size={28} />
          </div>
          <h1>Financial AI Analyst</h1>
          <p>
            Ask market questions, analyze uploaded files, and keep each research
            thread organized.
          </p>
          <button type="button" onClick={onCreateChat}>
            Start a new chat
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="chat-window">
      <header className="chat-header">
        <div>
          <h1>{selectedChat.title}</h1>
        </div>
      </header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="starter-grid">
            <button
              type="button"
              onClick={() =>
                sendMessage({
                  text: "Summarize today's key market risks.",
                  file: null,
                })
              }
            >
              Market risk summary
            </button>
            <button
              type="button"
              onClick={() =>
                sendMessage({
                  text: "Explain this company like an equity analyst.",
                  file: null,
                })
              }
            >
              Equity analysis
            </button>
            <button
              type="button"
              onClick={() =>
                sendMessage({
                  text: "Build a concise investment thesis with risks.",
                  file: null,
                })
              }
            >
              Investment thesis
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onEdit={editMessage}
            onDelete={deleteMessage}
            onFeedback={sendFeedback}
          />
        ))}

        {isLoading && (
          <div className="message-row ai-row">
            <div className="avatar">AI</div>
            <div className="message ai typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <div className="chat-error">{error}</div>}

      <ChatInput
        disabled={isLoading || uploading}
        loadingLabel={uploading ? "Uploading..." : "Thinking..."}
        onSend={sendMessage}
      />
    </main>
  );
}

export default ChatWindow;
