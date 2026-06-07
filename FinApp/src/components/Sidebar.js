/* eslint-disable react-native/no-inline-styles */
import {View, Text, TouchableOpacity, FlatList} from 'react-native';
import {useState} from 'react';
import {COLORS} from '../theme/theme';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function Sidebar({chats, onSelect, onNew, onDelete, onRename}) {
  const [activeChat, setActiveChat] = useState(null);

  return (
    <View
      style={{
        width: 260,
        backgroundColor: COLORS.card,
        padding: 10,
      }}>
      {/* NEW CHAT */}
      <TouchableOpacity
        onPress={onNew}
        style={{
          backgroundColor: COLORS.accent,
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
        }}>
        <Text style={{color: '#000', fontWeight: 'bold'}}>+ New Chat</Text>
      </TouchableOpacity>

      {/* CHAT LIST */}
      <FlatList
        data={chats}
        keyExtractor={item => item.id || item._id}
        renderItem={({item}) => {
          const id = item.id || item._id;
          const isActive = activeChat === id;

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              delayLongPress={300}
              onPress={() => onSelect(id)}
              onLongPress={() => setActiveChat(id)}
              style={{
                padding: 10,
                borderBottomWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: isActive ? '#0B3D2E' : 'transparent',
              }}>
              {/* 🔥 ROW: TITLE + DELETE */}
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {/* TITLE */}
                <Text
                  style={{
                    color: '#fff',
                    flex: 1, // 🔥 pushes delete to right
                  }}
                  numberOfLines={1}>
                  {String(item.title || '')}
                </Text>

                {/* DELETE (RIGHT SIDE) */}
                {isActive && (
                  <TouchableOpacity
                    onPress={() => {
                      onDelete(id);
                      setActiveChat(null);
                    }}>
                    <Text style={{color: 'red', marginLeft: 10, fontSize: 10}}>
                      <Icon name="trash" size={16} />
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
