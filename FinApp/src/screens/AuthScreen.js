/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../api/client';
import {COLORS} from '../theme/theme';

export default function AuthScreen({onAuthenticated}) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const submit = async () => {
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const res = await API.post(`/auth/${mode}`, {
        name: isRegister ? name : undefined,
        email,
        password,
      });
      onAuthenticated(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not sign you in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{flex: 1, backgroundColor: COLORS.background}}>
      <View style={{flex: 1, justifyContent: 'center', padding: 22}}>
        <View
          style={{
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 20,
          }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.accent,
              marginBottom: 14,
            }}>
            <Text style={{color: '#00150c', fontSize: 18, fontWeight: '900'}}>
              FA
            </Text>
          </View>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: 30,
              fontWeight: '800',
              marginBottom: 6,
            }}>
            FinAI
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              lineHeight: 21,
              marginBottom: 22,
            }}>
            Sign in before opening your private financial research workspace.
          </Text>

          {isRegister && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={COLORS.textSecondary}
              style={inputStyle}
            />
          )}

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            style={inputStyle}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry
            style={inputStyle}
          />

          {!!error && (
            <Text
              style={{
                color: '#fecaca',
                backgroundColor: 'rgba(220,38,38,0.18)',
                padding: 10,
                borderRadius: 10,
                marginBottom: 12,
              }}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            onPress={submit}
            disabled={loading}
            style={{
              minHeight: 48,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.accent,
            }}>
            {loading ? (
              <ActivityIndicator color="#00150c" />
            ) : (
              <Text style={{color: '#00150c', fontWeight: '800'}}>
                {isRegister ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMode(isRegister ? 'login' : 'register');
              setError('');
            }}
            style={{alignItems: 'center', paddingTop: 16}}>
            <Text style={{color: COLORS.accent, fontWeight: '700'}}>
              {isRegister
                ? 'Already have an account? Sign in'
                : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  minHeight: 48,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 12,
  color: COLORS.textPrimary,
  paddingHorizontal: 12,
  marginBottom: 12,
  backgroundColor: '#09241c',
};
