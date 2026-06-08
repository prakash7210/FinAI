import { Check, Copy, Languages, LogOut, MessageSquare, MoreVertical, Palette, Pencil, Plus, Search, Settings, Trash2, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import API from "../api/api";
import "./Sidebar.css";

function Sidebar({
  chats,
  selectedChat,
  isOpen,
  apiStatus,
  user,
  onCreateChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onLogout,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    return JSON.parse(localStorage.getItem("finweb_settings") || "null") || {
      appName: "FinAI",
      caption: "Financial research, faster.",
      wallpaper: "clean",
      theme: "light",
      language: "English",
    };
  });
  const [sessions, setSessions] = useState([]);

  const filteredChats = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((chat) => chat.title?.toLowerCase().includes(needle));
  }, [chats, searchTerm]);

  useEffect(() => {
    localStorage.setItem("finweb_settings", JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.wallpaper = settings.wallpaper;
  }, [settings]);

  useEffect(() => {
    if (!settingsOpen) return;
    API.get("/auth/sessions")
      .then((res) => setSessions(res.data.sessions || []))
      .catch(() => setSessions([]));
  }, [settingsOpen]);

  const startRename = (chat) => {
    setEditingId(chat.id);
    setDraftTitle(chat.title);
    setMenuOpenId(null);
  };

  const saveRename = async (chatId) => {
    await onRenameChat(chatId, draftTitle);
    setEditingId(null);
    setDraftTitle("");
  };

  return (
    <aside className={isOpen ? "sidebar open" : "sidebar"}>
      <div className="sidebar-brand">
        <div>
          <span className="brand-mark">FA</span>
          <span className="brand-title">{settings.appName}</span>
        </div>
        <span className={`api-pill ${apiStatus}`}>
          {apiStatus === "online" ? "Online" : apiStatus === "offline" ? "Offline" : "Checking"}
        </span>
      </div>

      <div className="sidebar-user">
        <div>
          <strong>{user?.name || "User"}</strong>
          <span>{user?.email}</span>
        </div>
        <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>

      <button className="new-chat" type="button" onClick={onCreateChat}>
        <Plus size={18} />
        New chat
      </button>

      <label className="chat-search">
        <Search size={16} />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search chats"
        />
      </label>

      <div className="chat-list">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            className={selectedChat?.id === chat.id ? "chat-item active" : "chat-item"}
          >
            {editingId === chat.id ? (
              <div className="chat-select editing">
                <MessageSquare size={17} />
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveRename(chat.id);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <button
                className="chat-select"
                type="button"
                onClick={() => onSelectChat(chat)}
                title={chat.title}
              >
                <MessageSquare size={17} />
                <span>{chat.title}</span>
              </button>
            )}

            {editingId === chat.id ? (
              <div className="chat-actions">
                <button type="button" onClick={() => saveRename(chat.id)} aria-label="Save title">
                  <Check size={16} />
                </button>
                <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel rename">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="chat-actions">
                <button
                  type="button"
                  onClick={() => setMenuOpenId(menuOpenId === chat.id ? null : chat.id)}
                  aria-label="Chat actions"
                >
                  <MoreVertical size={16} />
                </button>
                {menuOpenId === chat.id && (
                  <div className="chat-menu">
                    <button type="button" onClick={() => startRename(chat)}>
                      <Pencil size={15} />
                      Rename
                    </button>
                    <button type="button" onClick={() => onDeleteChat(chat.id)}>
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filteredChats.length === 0 && <div className="empty-search">No chats found</div>}
      </div>

      <button className="settings-button" type="button" onClick={() => setSettingsOpen(true)}>
        <Settings size={18} />
        Settings
      </button>

      {settingsOpen && (
        <div className="settings-scrim" role="presentation" onClick={() => setSettingsOpen(false)}>
          <section className="settings-panel" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>Settings</h2>
                <p>{settings.caption}</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                <X size={18} />
              </button>
            </header>

            <div className="settings-profile">
              <span className="profile-avatar"><User size={20} /></span>
              <div>
                <strong>{user?.name || "User"}</strong>
                <span>{user?.email}</span>
              </div>
            </div>

            <label>
              App name
              <input
                value={settings.appName}
                onChange={(event) => setSettings((prev) => ({ ...prev, appName: event.target.value || "FinAI" }))}
              />
            </label>

            <label>
              Profile caption
              <input
                value={settings.caption}
                onChange={(event) => setSettings((prev) => ({ ...prev, caption: event.target.value }))}
              />
            </label>

            <div className="settings-grid">
              <label>
                <Palette size={16} />
                Theme
                <select
                  value={settings.theme}
                  onChange={(event) => setSettings((prev) => ({ ...prev, theme: event.target.value }))}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="mint">Mint</option>
                </select>
              </label>
              <label>
                Wallpaper
                <select
                  value={settings.wallpaper}
                  onChange={(event) => setSettings((prev) => ({ ...prev, wallpaper: event.target.value }))}
                >
                  <option value="clean">Clean</option>
                  <option value="grid">Grid</option>
                  <option value="paper">Paper</option>
                </select>
              </label>
              <label>
                <Languages size={16} />
                Language
                <select
                  value={settings.language}
                  onChange={(event) => setSettings((prev) => ({ ...prev, language: event.target.value }))}
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Spanish</option>
                </select>
              </label>
            </div>

            <button
              className="refer-button"
              type="button"
              onClick={() => navigator.clipboard?.writeText(window.location.origin)}
            >
              <Copy size={16} />
              Copy refer link
            </button>

            <div className="login-details">
              <h3>Login details</h3>
              {sessions.map((session) => (
                <div key={session.id}>
                  <span>{session.device}</span>
                  <small>Active session</small>
                </div>
              ))}
              {sessions.length === 0 && <small>No session details available.</small>}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
