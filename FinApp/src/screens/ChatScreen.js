/* eslint-disable prettier/prettier */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react-native/no-inline-styles */
import {View, FlatList, TouchableOpacity, Text} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {useRef, useState} from 'react';

import useChat from '../hooks/useChat';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import Sidebar from '../components/Sidebar';
import {COLORS} from '../theme/theme';
import {Pressable} from 'react-native';

export default function ChatScreen() {
  // ✅ ALL HOOKS AT TOP (NO CONDITIONS)
  const {
    messages,
    chats,
    sendMessage,
    addMessage,
    loadMessages,
    createNewChat,
    editMessage,
    renameChat,
    deleteChat,
    loading,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const flatListRef = useRef(null);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.background,
      }}>
      {sidebarOpen && (
        <Pressable
          onPress={() => setSidebarOpen(false)}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.3)', // 🔥 dim effect
            zIndex: 1,
          }}
        />
      )}
      {sidebarOpen && (
        <View style={{zIndex: 2}}>
          <Sidebar
            chats={chats}
            onSelect={id => {
              loadMessages(id);
              setSidebarOpen(false);
            }}
            onNew={() => {
              createNewChat();
              setSidebarOpen(false);
            }}
            onDelete={id => {
              deleteChat(id);
            }}
            onRename={id => {
              renameChat(id);
            }}
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
            borderColor: COLORS.border,
          }}>
          <TouchableOpacity onPress={() => setSidebarOpen(!sidebarOpen)}>
            <Text style={{color: COLORS.accent, fontSize: 18}}>☰</Text>
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 'bold',
              color: COLORS.accent,
            }}>
            FinAI
          </Text>
        </View>

        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({item, index}) => (
            <MessageBubble
              message={item}
              onEdit={text => editMessage(index, text)}
            />
          )}
          contentContainerStyle={{padding: 10, flexGrow: 1}}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({animated: true})
          }
        />

        {loading && (
          <Text style={{color: COLORS.textSecondary, padding: 10}}>
            thinking...
          </Text>
        )}

        <ChatInput onSend={sendMessage} addMessage={addMessage} />
      </View>
    </SafeAreaView>
  );
}
