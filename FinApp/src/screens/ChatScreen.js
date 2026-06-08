/* eslint-disable prettier/prettier */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react-native/no-inline-styles */
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {useCallback, useRef, useState, useEffect} from 'react';

import useChat from '../hooks/useChat';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import Sidebar from '../components/Sidebar';
import {useTheme} from '../context/ThemeContext';
import {Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function ChatScreen({user, onLogout}) {
  // ✅ ALL HOOKS AT TOP (NO CONDITIONS)
  const {
    messages,
    chats,
    sendMessage,
    loadMessages,
    createNewChat,
    editMessage,
    renameChat,
    deleteChat,
    loading,
  } = useChat();

  const {colors} = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const flatListRef = useRef(null);

  // 🔥 AUTO-SCROLL WHEN MESSAGES CHANGE OR LOADING
  useEffect(() => {
    if (messages.length > 0 || loading) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, loading]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSelectChat = useCallback(
    id => {
      loadMessages(id);
      setSidebarOpen(false);
    },
    [loadMessages],
  );

  const handleNewChat = useCallback(() => {
    createNewChat();
    setSidebarOpen(false);
  }, [createNewChat]);

  const keyExtractor = useCallback(
    (item, index) => item?.id || item?.localId || index.toString(),
    [],
  );

  const handleContentSizeChange = useCallback(() => {
    if (editingMessageIndex === null) {
      flatListRef.current?.scrollToEnd({animated: true});
    }
  }, [editingMessageIndex]);

  const handleEditStart = useCallback(index => {
    setEditingMessageIndex(index);
  }, []);

  const handleEditEnd = useCallback(() => {
    setEditingMessageIndex(null);
  }, []);

  const renderMessage = useCallback(
    ({item, index}) => (
      <MessageBubble
        message={item}
        messageIndex={index}
        onEdit={editMessage}
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
    ),
    [editMessage, handleEditEnd, handleEditStart],
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.background,
        textColor: colors.textPrimary,
      }}>
      {sidebarOpen && (
        <Pressable
          onPress={closeSidebar}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 1,
          }}
        />
      )}
      {sidebarOpen && (
        <View style={{zIndex: 2}}>
          <Sidebar
            chats={chats}
            user={user}
            onSelect={handleSelectChat}
            onNew={handleNewChat}
            onDelete={id => {
              deleteChat(id);
            }}
            onRename={(id, title) => {
              renameChat(id, title || 'New Chat');
            }}
            onLogout={onLogout}
          />
        </View>
      )}

      <View style={{flex: 1}}>
        {/* HEADER */}
        <View
          style={{
            flexDirection: 'row',
            padding: 10,
            borderBottomWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            alignItems: 'center',
            textColor: colors.textPrimary,
          }}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Icon name="bars" size={18} color={colors.accent} />
          </TouchableOpacity>
          <View style={{flex: 1}} />
          <TouchableOpacity
            onPress={() => {
              setSidebarOpen(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: colors.background,
              textColor: colors.textPrimary,
            }}>
            <Icon
              name="user-circle"
              size={16}
              color={colors.accent}
              style={{marginRight: 6}}
            />
            <Text
              style={{
                color: colors.textPrimary,
                fontWeight: '700',
                fontSize: 12,
              }}>
              {user?.name?.split(' ')[0] || 'User'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={{marginLeft: 12}}>
            <Icon name="sign-out" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          contentContainerStyle={{padding: 10, flexGrow: 1}}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleContentSizeChange}
        />

        {loading && (
          <View
            style={{
              paddingVertical: 12,
              paddingHorizontal: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{color: colors.textSecondary, fontSize: 12}}>
              Generating response...
            </Text>
          </View>
        )}

        <ChatInput onSend={sendMessage} />
      </View>
    </SafeAreaView>
  );
}
