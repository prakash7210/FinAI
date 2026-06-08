import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import API from "../api/api";

function Home({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const [healthRes, chatsRes] = await Promise.all([
          API.get("/health"),
          API.get("/chats"),
        ]);

        if (!ignore) {
          setApiStatus(healthRes.data.status === "ok" ? "online" : "offline");
          setChats(chatsRes.data ?? []);
        }
      } catch (error) {
        console.log(error);

        if (!ignore) {
          setApiStatus("offline");
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const createChat = async () => {
    const res = await API.post("/chats", { title: "New Chat" });
    const chat = res.data;

    setChats((prev) => [chat, ...prev]);
    setSelectedChat(chat);
    setSidebarOpen(false);
  };

  const renameChat = async (chatId, title) => {
    const nextTitle = title.trim() || "New Chat";

    await API.put(`/chats/${chatId}`, { title: nextTitle });
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title: nextTitle } : chat,
      ),
    );
    setSelectedChat((chat) =>
      chat?.id === chatId ? { ...chat, title: nextTitle } : chat,
    );
  };

  const deleteChat = async (chatId) => {
    await API.delete(`/chats/${chatId}`);
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));

    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
    }
  };

  const updateChatTitle = (chatId, title) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)),
    );
    setSelectedChat((chat) =>
      chat?.id === chatId ? { ...chat, title } : chat,
    );
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
    setSidebarOpen(false);
  };

  return (
    <div className="home">
      <button
        className={`mobile-menu ${sidebarOpen ? "hidden" : ""}`}
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <Sidebar
        chats={chats}
        selectedChat={selectedChat}
        isOpen={sidebarOpen}
        apiStatus={apiStatus}
        user={user}
        onCreateChat={createChat}
        onSelectChat={selectChat}
        onRenameChat={renameChat}
        onDeleteChat={deleteChat}
        onLogout={onLogout}
      />

      <ChatWindow
        selectedChat={selectedChat}
        onCreateChat={createChat}
        onChatTitleChange={updateChatTitle}
      />
    </div>
  );
}

export default Home;
