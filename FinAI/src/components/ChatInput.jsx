import { Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import "./ChatInput.css";

function ChatInput({ onSend, disabled, loadingLabel }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const canSend = !disabled && (text.trim().length > 0 || file);

  const submit = () => {
    if (!canSend) return;

    onSend({ text, file });
    setText("");
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <footer className="chat-input-wrap">
      {file && (
        <div className="file-chip">
          <Paperclip size={15} />
          <span>{file.name}</span>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove file">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="chat-input">
        <button
          className="icon-button"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Attach file"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <textarea
          placeholder="Message FinWeb..."
          value={text}
          rows={1}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          hidden
        />

        <button
          className="send-button"
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          title="Send"
        >
          {disabled ? loadingLabel : <Send size={20} />}
        </button>
      </div>
    </footer>
  );
}

export default ChatInput;
