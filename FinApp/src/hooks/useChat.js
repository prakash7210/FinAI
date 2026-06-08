/* eslint-disable no-shadow */
import {useState, useEffect, useCallback, useRef} from 'react';
import API from '../api/client';

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef([]);
  const typingIntervalRef = useRef(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 🔥 LOAD CHATS
  const loadChats = useCallback(async () => {
    try {
      const res = await API.get('/chats');
      setChats(res.data);
    } catch (err) {
      console.log('LOAD CHATS ERROR:', err?.message);
    }
  }, []);

  // 🔥 LOAD MESSAGES
  const loadMessages = useCallback(async id => {
    try {
      setChatId(id);
      const res = await API.get(`/chats/${id}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.log('LOAD MESSAGES ERROR:', err?.message);
    }
  }, []);

  // 🔥 NEW CHAT
  const createNewChat = useCallback(() => {
    setMessages([]);
    setChatId(null);
  }, []);

  // 🔥 SAFE RESPONSE HANDLER
  const getAIResponse = useCallback(data => {
    return (
      data?.answer ||
      data?.response ||
      data?.data?.answer ||
      '⚠️ No response from server'
    );
  }, []);

  const getSavedMessageMeta = useCallback((data, fallbackChatId) => {
    return {
      id: data?.id,
      chatId: data?.chatId || fallbackChatId,
    };
  }, []);

  // 🔥 SMOOTH TYPING
  const typeMessage = useCallback(
    (text, query, source = 'llm_generated', messageMeta = {}) => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }

      let index = 0;
      const chunkSize = 3;

      typingIntervalRef.current = setInterval(() => {
        index += chunkSize;

        setMessages(prev => {
          const last = prev[prev.length - 1];

          if (!last || last.isUser) {
            return [
              ...prev,
              {
                ...messageMeta,
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

        if (index >= text.length) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }, 30);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // 🔥 SEND MESSAGE
  const sendMessage = useCallback(
    async (text, file) => {
      if (!text.trim() && !file) return;

      let id = chatId;

      // ✅ CREATE CHAT IF NOT EXISTS
      if (!id) {
        try {
          const titleRes = await API.post('/generate-title', {
            query: text || file?.name || 'New chat',
          });
          const chatRes = await API.post('/chats', {
            title:
              titleRes.data?.title ||
              (text || file?.fileName || file?.name || 'New Chat').slice(0, 20),
          });

          id = chatRes.data.id;
          setChatId(id);
          loadChats();
        } catch (err) {
          console.log('CREATE CHAT ERROR:', err?.message);
        }
      }

      const attachment = file
        ? {
            fileName: file.fileName || file.name,
            fileType: file.type,
            fileUrl: file.uri,
            file,
          }
        : null;

      // ✅ ADD USER MESSAGE
      const userLocalId = `user-${Date.now()}`;

      setMessages(prev => [
        ...prev,
        {
          localId: userLocalId,
          text: text || '',
          isUser: true,
          chatId: id,
          fileName: attachment?.fileName,
          fileType: attachment?.fileType,
          fileUrl: attachment?.fileUrl,
          file: attachment?.file,
        },
      ]);

      let uploadedFile = null;
      let uploadedFileText = '';
      let uploadedFileName = attachment?.fileName;

      try {
        if (file) {
          const formData = new FormData();
          formData.append('file', {
            uri: file.uri,
            name: file.fileName || file.name,
            type: file.type || 'application/octet-stream',
          });

          const uploadRes = await API.post('/upload', formData, {
            headers: {'Content-Type': 'multipart/form-data'},
          });

          uploadedFile = uploadRes.data?.filename;
          uploadedFileName = uploadRes.data?.filename || uploadedFileName;
          uploadedFileText = uploadRes.data?.extractedText || '';
        }

        const savedMessageData = {
          chatId: id,
          text: text || '',
          isUser: true,
        };

        if (attachment) {
          savedMessageData.fileName = attachment.fileName;
          savedMessageData.fileType = attachment.fileType;
          savedMessageData.fileUrl = uploadedFile || attachment.fileUrl;
        }

        const userSaveRes = await API.post('/messages', savedMessageData);

        setMessages(prev =>
          prev.map(message =>
            message.localId === userLocalId
              ? {
                  ...message,
                  ...getSavedMessageMeta(userSaveRes.data, id),
                  localId: undefined,
                }
              : message,
          ),
        );
      } catch (err) {
        console.log(
          'SAVE USER MSG ERROR:',
          err?.response?.data || err?.message,
        );
      }

      setLoading(true);

      try {
        const queryText =
          text.trim() ||
          `Analyze the attached file ${
            uploadedFileName || attachment?.fileName || ''
          }`.trim();

        const res = await API.post('/analyze', {
          query: queryText,
          chatId: id,
          fileName: uploadedFileName,
          fileContext: uploadedFileText,
        });

        console.log('API RESPONSE:', res.data); // 🔥 DEBUG

        const responseText = getAIResponse(res.data);
        const source = res.data?.source || 'llm_generated';

        const assistantSaveRes = await API.post('/messages', {
          chatId: id,
          text: responseText,
          isUser: false,
        });

        setTimeout(() => {
          typeMessage(
            responseText,
            queryText,
            source,
            getSavedMessageMeta(assistantSaveRes.data, id),
          );
        }, 200);
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
    },
    [chatId, getAIResponse, getSavedMessageMeta, loadChats, typeMessage],
  );

  // 🔥 EDIT MESSAGE
  const editMessage = useCallback(
    async (index, newText) => {
      const currentMessages = messagesRef.current;
      const msg = currentMessages[index];
      const editedText = newText.trim();
      const activeChatId = msg?.chatId || chatId;

      if (!msg?.isUser || !editedText) return;

      const updatedMessages = currentMessages.slice(0, index + 1);
      updatedMessages[index] = {...msg, text: editedText, chatId: activeChatId};
      setMessages(updatedMessages);

      try {
        setLoading(true);

        if (msg?.id) {
          await API.put(`/messages/${msg.id}`, {
            text: editedText,
          });
        }

        const messagesToDelete = currentMessages
          .slice(index + 1)
          .filter(item => item?.id);

        await Promise.all(
          messagesToDelete.map(item => API.delete(`/messages/${item.id}`)),
        );

        const res = await API.post('/analyze', {
          query: editedText,
          chatId: activeChatId,
        });

        const responseText = getAIResponse(res.data);
        const source = res.data?.source || 'llm_generated';
        const assistantSaveRes = await API.post('/messages', {
          chatId: activeChatId,
          text: responseText,
          isUser: false,
        });

        setTimeout(() => {
          typeMessage(
            responseText,
            editedText,
            source,
            getSavedMessageMeta(assistantSaveRes.data, activeChatId),
          );
        }, 200);
      } catch (err) {
        console.log('EDIT ERROR:', err?.response?.data || err.message);
        setMessages(prev => [
          ...prev,
          {
            text: 'Could not regenerate response. Please try again.',
            isUser: false,
          },
        ]);
      }

      setLoading(false);
    },
    [chatId, getAIResponse, getSavedMessageMeta, typeMessage],
  );

  // 🔥 DELETE CHAT
  const deleteChat = useCallback(async chatId => {
    setChats(prev => prev.filter(c => c.id !== chatId));

    try {
      await API.delete(`/chats/${chatId}`);
    } catch (err) {
      console.log(err);
    }
  }, []);

  // 🔥 RENAME CHAT
  const renameChat = useCallback(async (chatId, newTitle) => {
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
  }, []);

  // 🔥 SEND VOICE (UPDATED SAFE)
  const sendVoice = useCallback(
    async filePath => {
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
    },
    [getAIResponse],
  );
  useEffect(() => {
    loadChats();
  }, [loadChats]);

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
