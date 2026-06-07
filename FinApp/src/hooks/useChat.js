/* eslint-disable no-shadow */
import {useState, useEffect} from 'react';
import API from '../api/client';

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 LOAD CHATS
  const loadChats = async () => {
    try {
      const res = await API.get('/chats');
      setChats(res.data);
    } catch (err) {
      console.log('LOAD CHATS ERROR:', err?.message);
    }
  };

  // 🔥 LOAD MESSAGES
  const loadMessages = async id => {
    try {
      setChatId(id);
      const res = await API.get(`/chats/${id}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.log('LOAD MESSAGES ERROR:', err?.message);
    }
  };

  // 🔥 NEW CHAT
  const createNewChat = () => {
    setMessages([]);
    setChatId(null);
  };

  // 🔥 SAFE RESPONSE HANDLER
  const getAIResponse = data => {
    return (
      data?.answer ||
      data?.response ||
      data?.data?.answer ||
      '⚠️ No response from server'
    );
  };

  // 🔥 SMOOTH TYPING
  const typeMessage = (text, query, source = 'llm_generated') => {
    let index = 0;
    const chunkSize = 3;

    const interval = setInterval(() => {
      index += chunkSize;

      setMessages(prev => {
        const last = prev[prev.length - 1];

        if (!last || last.isUser) {
          return [
            ...prev,
            {
              text: text.slice(0, index),
              isUser: false,
              query,
              source,
              feedbackGiven: false,
            },
          ];
        }

        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: text.slice(0, index),
        };

        return updated;
      });

      if (index >= text.length) clearInterval(interval);
    }, 30);
  };

  // 🔥 SEND MESSAGE
  const sendMessage = async text => {
    if (!text.trim()) return;

    let id = chatId;

    // ✅ CREATE CHAT IF NOT EXISTS
    if (!id) {
      try {
        const titleRes = await API.post('/generate-title', {query: text});
        const chatRes = await API.post('/chats', {
          title: titleRes.data?.title || text.slice(0, 20),
        });

        id = chatRes.data.id;
        setChatId(id);
        loadChats();
      } catch (err) {
        console.log('CREATE CHAT ERROR:', err?.message);
      }
    }

    // ✅ ADD USER MESSAGE
    setMessages(prev => [...prev, {text, isUser: true}]);

    try {
      await API.post('/messages', {
        chatId: id,
        text,
        isUser: true,
      });
    } catch (err) {
      console.log('SAVE USER MSG ERROR:', err?.message);
    }

    setLoading(true);

    try {
      const res = await API.post('/analyze', {
        query: text,
        chatId: id,
      });

      console.log('API RESPONSE:', res.data); // 🔥 DEBUG

      const responseText = getAIResponse(res.data);
      const source = res.data?.source || 'llm_generated';

      setTimeout(() => {
        typeMessage(responseText, text, source);
      }, 200);

      await API.post('/messages', {
        chatId: id,
        text: responseText,
        isUser: false,
      });
    } catch (err) {
      console.log('CHAT ERROR:', err?.response?.data || err.message);

      setMessages(prev => [
        ...prev,
        {
          text: '❌ Server error. Please try again.',
          isUser: false,
        },
      ]);
    }

    setLoading(false);
  };

  // 🔥 EDIT MESSAGE
  const editMessage = async (index, newText) => {
    const msg = messages[index];

    const updatedMessages = messages.slice(0, index + 1);
    updatedMessages[index] = {...msg, text: newText};
    setMessages(updatedMessages);

    try {
      if (msg?.id) {
        await API.put(`/messages/${msg.id}`, {
          text: newText,
        });
      }

      setLoading(true);

      const res = await API.post('/analyze', {
        query: newText,
      });

      const responseText = getAIResponse(res.data);
      const source = res.data?.source || 'llm_generated';

      setTimeout(() => {
        typeMessage(responseText, newText, source);
      }, 200);

      await API.post('/messages', {
        chatId: chatId,
        text: responseText,
        isUser: false,
      });
    } catch (err) {
      console.log('EDIT ERROR:', err);
    }

    setLoading(false);
  };

  // 🔥 DELETE CHAT
  const deleteChat = async chatId => {
    setChats(prev => prev.filter(c => c.id !== chatId));

    try {
      await API.delete(`/chats/${chatId}`);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 RENAME CHAT
  const renameChat = async (chatId, newTitle) => {
    try {
      if (!newTitle?.trim()) return;

      await API.put(`/chats/${chatId}`, {
        title: newTitle,
      });

      setChats(prev =>
        prev.map(chat =>
          chat.id === chatId || chat._id === chatId
            ? {...chat, title: newTitle}
            : chat,
        ),
      );
    } catch (err) {
      console.log('RENAME ERROR:', err?.response?.data || err);
    }
  };

  // 🔥 SEND VOICE (UPDATED SAFE)
  const sendVoice = async filePath => {
    try {
      setLoading(true);

      const formData = new FormData();

      formData.append('file', {
        uri: filePath,
        name: 'voice.m4a',
        type: 'audio/m4a',
      });

      const res = await API.post('/voice-chat', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });

      const aiReply = getAIResponse(res.data);
      const textQuery = res.data?.query || '';

      setMessages(prev => [
        ...prev,
        {text: textQuery, isUser: true},
        {
          text: aiReply,
          isUser: false,
          query: textQuery,
        },
      ]);
    } catch (err) {
      console.log('VOICE ERROR:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadChats();
  }, []);

  return {
    messages,
    chats,
    sendMessage,
    sendVoice,
    loadMessages,
    createNewChat,
    editMessage,
    deleteChat,
    renameChat,
    loading,
  };
}
