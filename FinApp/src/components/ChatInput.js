/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  PermissionsAndroid,
  Text,
  Animated,
  Image,
  Platform,
} from 'react-native';

import Voice from '@react-native-voice/voice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useTheme} from '../context/ThemeContext';

// 🔥 FORMAT URI FOR REACT NATIVE
const formatImageUri = uri => {
  if (!uri) return null;
  if (Platform.OS === 'android') {
    if (uri.startsWith('content://') || uri.startsWith('file://')) {
      return uri;
    }
    if (!uri.startsWith('/')) {
      return `file://${uri}`;
    }
    return `file://${uri}`;
  }
  return uri;
};

export default function ChatInput({onSend}) {
  const {colors} = useTheme();
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);

  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  const [showOptions, setShowOptions] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleMenu = useRef(new Animated.Value(0.8)).current;

  // 🎤 VOICE EVENTS (ULTRA FIXED)
  useEffect(() => {
    Voice.onSpeechResults = e => {
      if (e.value?.length) {
        setVoiceText(e.value[0]);
      }
    };

    Voice.onSpeechEnd = () => {
      setListening(false);
    };

    Voice.onSpeechError = e => {
      console.log('Voice Error:', e);
      setListening(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // 🎤 MIC ANIMATION
  useEffect(() => {
    let pulseAnimation;

    if (listening) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );

      pulseAnimation.start();
    } else {
      scaleAnim.setValue(1);
    }

    return () => {
      pulseAnimation?.stop?.();
    };
  }, [listening, scaleAnim]);

  // 🎤 START
  const startListening = useCallback(async () => {
    try {
      if (listening) return;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;

      setVoiceText('');
      setListening(true);

      await Voice.start('en-US');

      // 🔥 AUTO STOP (SMART)
      setTimeout(async () => {
        if (listening) {
          await Voice.stop();
          setListening(false);
        }
      }, 5000);
    } catch (e) {
      console.log(e);
      setListening(false);
    }
  }, [listening]);

  // 🎤 CANCEL
  const cancelVoice = useCallback(async () => {
    try {
      await Voice.cancel();
    } catch {}
    setListening(false);
    setVoiceText('');
  }, []);

  // 🎤 SEND
  const sendVoice = useCallback(() => {
    if (!voiceText.trim()) return;

    onSend(voiceText, null);
    setVoiceText('');
    setListening(false);
  }, [voiceText, onSend]);

  // 🔥 MENU ANIMATION
  const openMenu = useCallback(() => {
    setShowOptions(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleMenu, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleMenu]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleMenu, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setShowOptions(false));
  }, [fadeAnim, scaleMenu]);

  // 📸 CAMERA
  const openCamera = useCallback(async () => {
    closeMenu();
    setImageLoadError(false);
    const res = await launchCamera({mediaType: 'photo'});
    if (res.assets?.length) {
      const asset = res.assets[0];
      asset.uri = formatImageUri(asset.uri);
      setFile(asset);
    }
  }, [closeMenu]);

  // 🖼️ GALLERY
  const openGallery = useCallback(async () => {
    closeMenu();
    setImageLoadError(false);
    const res = await launchImageLibrary({mediaType: 'photo'});
    if (res.assets?.length) {
      const asset = res.assets[0];
      asset.uri = formatImageUri(asset.uri);
      setFile(asset);
    }
  }, [closeMenu]);

  // 📄 FILE
  const openFiles = useCallback(async () => {
    closeMenu();
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });
      setFile(res);
    } catch {}
  }, [closeMenu]);

  // 🚀 SEND
  const handleSend = useCallback(async () => {
    if (!text.trim() && !file) return;

    const messageText = text;
    const attachment = file;

    setText('');
    setFile(null);
    setImageLoadError(false);

    try {
      if (attachment) {
        setUploadStatus('...');
      }

      await onSend(messageText, attachment);

      setTimeout(() => setUploadStatus(''), 1500);
    } catch (err) {
      console.log('SEND ERROR:', err?.message || err);
      setUploadStatus('❌ Failed');
      setTimeout(() => setUploadStatus(''), 1500);
    }
  }, [text, file, onSend]);

  return (
    <View style={{position: 'relative'}}>
      {/* 🔥 TAP OUTSIDE CLOSE */}
      {showOptions && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={closeMenu}
          style={{
            position: 'absolute',
            top: -500,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
          }}
        />
      )}

      {/* STATUS */}
      {uploadStatus !== '' && (
        <Text style={{color: '#aaa', padding: 6}}>{uploadStatus}</Text>
      )}

      {/* FILE PREVIEW */}
      {file && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.card,
            margin: 10,
            padding: 8,
            borderRadius: 12,
            alignItems: 'center',
          }}>
          {file.type?.includes('image') && !imageLoadError ? (
            <Image
              source={{uri: file.uri}}
              style={{width: 60, height: 60, borderRadius: 8}}
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <Icon name="insert-drive-file" size={28} color="#aaa" />
          )}

          <Text style={{color: '#fff', flex: 1, marginLeft: 10}}>
            {file.fileName || file.name}
          </Text>

          <TouchableOpacity onPress={() => setFile(null)}>
            <Icon name="close" size={20} color="red" />
          </TouchableOpacity>
        </View>
      )}

      {/* FLOATING MENU */}
      {showOptions && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 70,
            left: 10,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 10,
            opacity: fadeAnim,
            transform: [{scale: scaleMenu}],
            elevation: 10,
            zIndex: 100,
          }}>
          <TouchableOpacity onPress={openCamera} style={styles.option}>
            <Icon name="photo-camera" size={20} color="#fff" />
            <Text style={styles.text}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openGallery} style={styles.option}>
            <Icon name="image" size={20} color="#fff" />
            <Text style={styles.text}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openFiles} style={styles.option}>
            <Icon name="insert-drive-file" size={20} color="#fff" />
            <Text style={styles.text}>Files</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* INPUT BAR */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
        }}>
        <TouchableOpacity onPress={openMenu}>
          <Icon name="add" size={24} color={colors.accent} />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask something..."
          placeholderTextColor="#888"
          style={{
            flex: 1,
            backgroundColor: colors.card,
            color: colors.textPrimary,
            padding: 12,
            borderRadius: 10,
            marginLeft: 8,
          }}
        />

        {/* 🎤 MIC */}
        {!listening && voiceText === '' && (
          <TouchableOpacity onPress={startListening}>
            <Icon name="mic" size={22} color={colors.accent} margin={10} />
          </TouchableOpacity>
        )}

        {/* 🎤 LISTENING */}
        {listening && (
          <>
            <Animated.View style={{transform: [{scale: scaleAnim}]}}>
              <Icon name="mic" size={26} color="red" margin={10} />
            </Animated.View>
            <TouchableOpacity onPress={cancelVoice}>
              <Icon name="close" size={22} color="red" />
            </TouchableOpacity>
          </>
        )}

        {/* 🎤 AFTER SPEECH */}
        {!listening && voiceText !== '' && (
          <>
            <TouchableOpacity onPress={cancelVoice}>
              <Icon name="close" size={22} color="red" margin={10} />
            </TouchableOpacity>

            <TouchableOpacity onPress={sendVoice}>
              <Icon name="send" size={22} color="#22c55e" marginRight={5} />
            </TouchableOpacity>
          </>
        )}

        {/* SEND TEXT */}
        {!listening && voiceText === '' && (
          <TouchableOpacity onPress={handleSend}>
            <Icon name="send" size={22} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = {
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  text: {
    color: '#fff',
    marginLeft: 8,
  },
};
