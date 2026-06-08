/* eslint-disable react/react-in-jsx-scope */
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Animated, Text, View} from 'react-native';
import API from './src/api/client';
import {setAuthToken} from './src/api/client';
import AuthScreen from './src/screens/AuthScreen';
import ChatScreen from './src/screens/ChatScreen';
import {COLORS} from './src/theme/theme';
import {ThemeProvider} from './src/context/ThemeContext';
import {ProfileProvider} from './src/context/ProfileContext';

function AppContent() {
  const [session, setSession] = useState(null);
  const [opening, setOpening] = useState(false);
  const [splash, setSplash] = useState(true);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 🔥 5 SECOND LOADING ANIMATION
    const timer = setTimeout(() => setSplash(false), 5000);
    return () => clearTimeout(timer);
  }, [opacity, scale]);

  const handleAuthenticated = data => {
    setOpening(true);
    setAuthToken(data.token);
    setSession(data);
    setOpening(false);
  };

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.log('LOGOUT ERROR:', err?.message);
    }
    setAuthToken(null);
    setSession(null);
  };

  if (splash || opening) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.background,
        }}>
        {opening ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : (
          <Animated.View
            style={{
              alignItems: 'center',
              opacity,
              transform: [{scale}],
            }}>
            <View
              style={{
                width: 78,
                height: 78,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.accent,
              }}>
              <Text style={{color: '#00150c', fontSize: 25, fontWeight: '900'}}>
                FA
              </Text>
            </View>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: 22,
                fontWeight: '800',
                marginTop: 16,
              }}>
              FinAI
            </Text>
            <Text style={{color: COLORS.textSecondary, marginTop: 4}}>
              Opening your workspace
            </Text>
          </Animated.View>
        )}
      </View>
    );
  }

  return session ? (
    <ChatScreen user={session.user} onLogout={handleLogout} />
  ) : (
    <AuthScreen onAuthenticated={handleAuthenticated} />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <AppContent />
      </ProfileProvider>
    </ThemeProvider>
  );
}
