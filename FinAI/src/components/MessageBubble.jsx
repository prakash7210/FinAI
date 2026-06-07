import {
  Check,
  Copy,
  FileText,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./MessageBubble.css";

function MessageBubble({ msg, onEdit, onDelete, onFeedback }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.text);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState(null);
  const speechTimeoutRef = useRef(null);
  const wordsRef = useRef([]);
  const feedbackLocked = Boolean(msg.feedback);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(msg.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const speakMessage = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setHighlightedWord(null);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      return;
    }

    // Split text into words
    const words = msg.text.split(/\s+/).filter((w) => w.length > 0);
    wordsRef.current = words;

    const utterance = new SpeechSynthesisUtterance(msg.text);
    utterance.rate = 1;
    let currentWordIndex = 0;

    // Calculate average time per word based on total text length and speech rate
    // Average speaking rate is ~150 words per minute at rate 1
    const totalWordsCount = words.length;
    const avgTimePerWord = 60000 / 150 / (utterance.rate || 1); // ms per word

    const updateHighlight = () => {
      if (currentWordIndex < words.length) {
        setHighlightedWord(currentWordIndex);
        currentWordIndex++;
        // Use calculated average time based on speech rate
        speechTimeoutRef.current = setTimeout(updateHighlight, avgTimePerWord);
      } else {
        setHighlightedWord(null);
      }
    };

    // Use boundary event for better sync if available
    let boundarySupported = false;
    if ("onboundary" in utterance) {
      boundarySupported = true;
      utterance.onboundary = (event) => {
        if (event.name === "word") {
          if (currentWordIndex < words.length) {
            setHighlightedWord(currentWordIndex);
            currentWordIndex++;
          }
        }
      };
    }

    utterance.onstart = () => {
      setSpeaking(true);
      currentWordIndex = 0;
      // Only use timeout fallback if boundary event is not supported
      if (!boundarySupported) {
        updateHighlight();
      }
    };

    utterance.onend = () => {
      setSpeaking(false);
      setHighlightedWord(null);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };

    utterance.onerror = () => {
      setSpeaking(false);
      setHighlightedWord(null);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  const saveEdit = async () => {
    const nextText = draft.trim();
    if (!nextText) return;

    await onEdit(msg.id, nextText);
    setEditing(false);
  };

  const renderHighlightedText = () => {
    if (!speaking || !msg.text)
      return <ReactMarkdown>{msg.text}</ReactMarkdown>;

    const words = msg.text.split(/(\s+)/);
    let wordIndex = 0;

    return (
      <div className="highlighted-text">
        {words.map((word, idx) => {
          // Count only non-whitespace as words
          if (/\s+/.test(word)) {
            return <span key={idx}>{word}</span>;
          }

          const isHighlighted = wordIndex === highlightedWord;
          const element = (
            <span
              key={idx}
              className={isHighlighted ? "speaking-word" : ""}
              data-highlight={isHighlighted}
            >
              {word}
            </span>
          );
          wordIndex++;
          return element;
        })}
      </div>
    );
  };

  return (
    <div className={msg.isUser ? "message-row user-row" : "message-row ai-row"}>
      <div className="avatar">{msg.isUser ? "You" : "AI"}</div>

      <article className={msg.isUser ? "message user" : "message ai"}>
        {msg.fileName && (
          <div className="attachment">
            <FileText size={16} />
            <span>{msg.fileName}</span>
          </div>
        )}

        {editing ? (
          <textarea
            className="message-editor"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
        ) : !msg.isUser && speaking ? (
          renderHighlightedText()
        ) : (
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        )}

        <div className="message-tools">
          {editing ? (
            <>
              <button
                type="button"
                onClick={saveEdit}
                aria-label="Save message"
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Cancel edit"
              >
                <X size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={copyMessage}
                aria-label="Copy message"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
              {msg.isUser && msg.id && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit message"
                >
                  <Pencil size={15} />
                </button>
              )}
              {msg.isUser && msg.id && (
                <button
                  type="button"
                  onClick={() => onDelete(msg.id)}
                  aria-label="Delete message"
                >
                  <Trash2 size={15} />
                </button>
              )}
              {!msg.isUser && msg.id && (
                <>
                  <button
                    type="button"
                    onClick={speakMessage}
                    className={speaking ? "active-feedback" : ""}
                    aria-label={speaking ? "Stop speaking" : "Speak message"}
                  >
                    <Volume2 size={15} />
                  </button>
                  <button
                    type="button"
                    className={msg.feedback === "up" ? "active-feedback" : ""}
                    onClick={() => onFeedback(msg, "up")}
                    disabled={feedbackLocked}
                    aria-label="Good response"
                  >
                    <ThumbsUp size={15} />
                  </button>
                  <button
                    type="button"
                    className={msg.feedback === "down" ? "active-feedback" : ""}
                    onClick={() => onFeedback(msg, "down")}
                    disabled={feedbackLocked}
                    aria-label="Bad response"
                  >
                    <ThumbsDown size={15} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </article>
    </div>
  );
}

export default MessageBubble;
