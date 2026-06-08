/* eslint-disable react-native/no-inline-styles */
import React, {useMemo, useState} from 'react';
import {
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import {COLORS} from '../theme/theme';
import {useTheme} from '../context/ThemeContext';
import {useProfile} from '../context/ProfileContext';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function Sidebar({
  chats,
  user,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onLogout,
}) {
  const [activeChat, setActiveChat] = useState(null);
  const [query, setQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const {theme, colors, toggleTheme} = useTheme();
  const {profile, updateProfile} = useProfile();

  const filteredChats = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter(chat =>
      String(chat.title || '')
        .toLowerCase()
        .includes(needle),
    );
  }, [chats, query]);

  const SettingInput = ({label, value, onChangeText}) => (
    <View style={{marginBottom: 12}}>
      <Text style={{color: colors.textSecondary, marginBottom: 6}}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textSecondary}
        style={{
          minHeight: 42,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          color: colors.textPrimary,
          paddingHorizontal: 10,
          backgroundColor: colors.background,
        }}
      />
    </View>
  );

  return (
    <View
      style={{
        width: 286,
        flex: 1,
        backgroundColor: colors.card,
        padding: 12,
      }}>
      <View
        style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}>
          <Text style={{color: '#00150c', fontWeight: '900'}}>FA</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{color: colors.textPrimary, fontWeight: '800'}}>
            {profile.appName}
          </Text>
          <Text
            style={{color: colors.textSecondary, fontSize: 12}}
            numberOfLines={1}>
            {profile.caption}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onNew}
        style={{
          backgroundColor: colors.accent,
          padding: 12,
          borderRadius: 10,
          marginBottom: 10,
        }}>
        <Text style={{color: '#00150c', fontWeight: '800'}}>+ New chat</Text>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 10,
          marginBottom: 10,
        }}>
        <Icon name="search" size={14} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={colors.textSecondary}
          style={{flex: 1, color: colors.textPrimary, minHeight: 40}}
        />
      </View>

      {settingsOpen ? (
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
          {/* PROFILE SECTION */}
          <TouchableOpacity
            onPress={() => setProfileOpen(!profileOpen)}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.background,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <View>
              <Text style={{color: colors.textPrimary, fontWeight: '800'}}>
                {user?.name || 'User'}
              </Text>
              <Text style={{color: colors.textSecondary}}>{user?.email}</Text>
            </View>
            <Icon
              name={profileOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {profileOpen && (
            <>
              <SettingInput
                label="App name"
                value={profile.appName}
                onChangeText={value =>
                  updateProfile(prev => ({...prev, appName: value}))
                }
              />
              <SettingInput
                label="Profile caption"
                value={profile.caption}
                onChangeText={value =>
                  updateProfile(prev => ({...prev, caption: value}))
                }
              />
              <SettingInput
                label="Language"
                value={profile.language}
                onChangeText={value =>
                  updateProfile(prev => ({...prev, language: value}))
                }
              />
            </>
          )}

          {/* THEME SECTION */}
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.background,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Icon
                name={theme === 'dark' ? 'moon-o' : 'sun-o'}
                size={16}
                color={colors.accent}
                style={{marginRight: 10}}
              />
              <Text style={{color: colors.textPrimary, fontWeight: '700'}}>
                {theme === 'dark' ? 'Dark' : 'Light'} Theme
              </Text>
            </View>
            <Switch
              value={theme === 'light'}
              onValueChange={toggleTheme}
              thumbColor={colors.accent}
              trackColor={{false: colors.border, true: colors.accent}}
            />
          </View>

          {/* ADDITIONAL SETTINGS */}
          <TouchableOpacity
            style={{
              minHeight: 42,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
              marginTop: 10,
            }}
            onPress={() => console.log('Refer link copied')}>
            <Text style={{color: colors.textPrimary, fontWeight: '700'}}>
              Refer a friend
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              minHeight: 42,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
              marginTop: 10,
            }}>
            <Text style={{color: colors.textPrimary, fontWeight: '700'}}>
              JWT Active
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id || item._id}
          ListEmptyComponent={
            <Text style={{color: colors.textSecondary, padding: 10}}>
              No chats found
            </Text>
          }
          renderItem={({item}) => {
            const id = item.id || item._id;
            const isActive = activeChat === id;

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                delayLongPress={300}
                onPress={() => onSelect(id)}
                onLongPress={() => setActiveChat(id)}
                style={{
                  padding: 10,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: isActive ? colors.background : 'transparent',
                  borderRadius: 8,
                }}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text
                    style={{color: colors.textPrimary, flex: 1}}
                    numberOfLines={1}>
                    {String(item.title || '')}
                  </Text>

                  {isActive && (
                    <View style={{flexDirection: 'row', gap: 14}}>
                      <TouchableOpacity
                        onPress={() => onRename(id, item.title)}>
                        <Icon
                          name="pencil"
                          size={15}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          onDelete(id);
                          setActiveChat(null);
                        }}>
                        <Icon name="trash" size={15} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        onPress={() => setSettingsOpen(prev => !prev)}
        style={{
          minHeight: 42,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.08)',
          marginTop: 10,
        }}>
        <Text style={{color: colors.textPrimary, fontWeight: '700'}}>
          {settingsOpen ? 'Back to chats' : 'Settings'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onLogout}
        style={{
          minHeight: 42,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.08)',
          marginTop: 10,
        }}>
        <Text style={{color: colors.textPrimary, fontWeight: '700'}}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
