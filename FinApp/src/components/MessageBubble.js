/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Pressable,
  InteractionManager,
  Image,
} from 'react-native';
import {useTheme} from '../context/ThemeContext';
import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Clipboard from '@react-native-clipboard/clipboard';
import API from '../api/client';
import Tts from 'react-native-tts';
import {Platform} from 'react-native';

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

function MessageBubble({
  message,
  messageIndex,
  onEdit,
  onEditStart,
  onEditEnd,
}) {
  const {colors} = useTheme();
  const isUser = message?.isUser;

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEditOption, setShowEditOption] = useState(false);

  const [feedbackGiven, setFeedbackGiven] = useState(
    message?.feedbackGiven || false,
  );
  const [selected, setSelected] = useState(null);

  const [speaking, setSpeaking] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [imageError, setImageError] = useState(false);

  const words = useMemo(
    () => (message?.text || '').split(' '),
    [message?.text],
  );
  const wordsRef = useRef(words);
  const editHideTimerRef = useRef(null);
  const editInputRef = useRef(null);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    if (!editing) return;

    const interaction = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        editInputRef.current?.focus();
      }, 80);
    });

    return () => {
      interaction?.cancel?.();
    };
  }, [editing]);

  useEffect(() => {
    return () => {
      if (editHideTimerRef.current) {
        clearTimeout(editHideTimerRef.current);
      }
    };
  }, []);

  // 🔥 COPY
  const copyText = useCallback(() => {
    Clipboard.setString(message?.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [message?.text]);

  // 🔥 TTS INIT
  useEffect(() => {
    if (!speaking) {
      return undefined;
    }

    let finishSub;
    let cancelSub;
    let progressSub;

    progressSub = Tts.addEventListener('tts-progress', event => {
      const {start} = event;

      const currentWords = wordsRef.current;
      let charCount = 0;
      for (let i = 0; i < currentWords.length; i++) {
        charCount += currentWords[i].length + 1;

        if (start <= charCount) {
          setHighlightIndex(prev => (prev === i ? prev : i));
          break;
        }
      }
    });

    finishSub = Tts.addEventListener('tts-finish', () => {
      setSpeaking(prev => (prev ? false : prev));
      setHighlightIndex(prev => (prev === -1 ? prev : -1));
    });

    cancelSub = Tts.addEventListener('tts-cancel', () => {
      setSpeaking(prev => (prev ? false : prev));
      setHighlightIndex(prev => (prev === -1 ? prev : -1));
    });

    return () => {
      finishSub?.remove();
      cancelSub?.remove();
      progressSub?.remove();
    };
  }, [speaking]);

  const speak = useCallback(text => {
    if (!text) return;

    Tts.getInitStatus()
      .then(() => {
        Tts.setDefaultRate(0.45);
        Tts.stop();
        setSpeaking(true);
        setHighlightIndex(0);
        Tts.speak(text);
      })
      .catch(err => {
        console.log('TTS SPEAK ERROR:', err);
      });
  }, []);

  const stopSpeak = useCallback(() => {
    Tts.stop();
    setSpeaking(false);
    setHighlightIndex(-1);
  }, []);

  const clearEditHideTimer = useCallback(() => {
    if (editHideTimerRef.current) {
      clearTimeout(editHideTimerRef.current);
      editHideTimerRef.current = null;
    }
  }, []);

  const revealEditOption = useCallback(() => {
    if (!isUser || editing || !onEdit) return;

    clearEditHideTimer();
    setShowEditOption(true);
    editHideTimerRef.current = setTimeout(() => {
      setShowEditOption(false);
      editHideTimerRef.current = null;
    }, 15000);
  }, [isUser, editing, onEdit, clearEditHideTimer]);

  const startEdit = useCallback(() => {
    clearEditHideTimer();
    setShowEditOption(false);
    setDraftText(message?.text || '');
    setEditing(true);
    onEditStart?.(messageIndex);
  }, [message?.text, messageIndex, onEditStart, clearEditHideTimer]);

  const cancelEdit = useCallback(() => {
    setDraftText(message?.text || '');
    setEditing(false);
    onEditEnd?.();
  }, [message?.text, onEditEnd]);

  const submitEdit = useCallback(async () => {
    const trimmedText = draftText.trim();

    if (!trimmedText || savingEdit) return;

    if (trimmedText === (message?.text || '').trim()) {
      setEditing(false);
      onEditEnd?.();
      return;
    }

    try {
      setSavingEdit(true);
      await onEdit?.(messageIndex, trimmedText);
      setEditing(false);
    } finally {
      setSavingEdit(false);
      onEditEnd?.();
    }
  }, [draftText, savingEdit, message?.text, messageIndex, onEdit, onEditEnd]);

  // 👍 👎 animation
  const animate = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  // 🔥 FEEDBACK API
  const handleFeedback = useCallback(
    async rating => {
      if (feedbackGiven) return;

      try {
        setSelected(rating);
        animate();

        await API.post('/feedback', {
          query: message?.query || '',
          answer: message?.text || '',
          rating,
          source: message?.source || 'llm_generated',
        });

        setFeedbackGiven(true);
      } catch (err) {
        console.log(err);
      }
    },
    [feedbackGiven, animate, message?.query, message?.text, message?.source],
  );

  return (
    <Pressable
      onLongPress={revealEditOption}
      delayLongPress={350}
      style={[
        styles.container,
        {
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          backgroundColor: isUser ? '#14532D' : "rgba(29, 106, 47, 0.95)",
          textColor: isUser ? colors.textPrimary : colors.textPrimary,  
        },
      ]}>
      {/* TEXT */}
      {editing ? (
        <>
          <TextInput
            ref={editInputRef}
            value={draftText}
            onChangeText={setDraftText}
            multiline
            autoFocus
            placeholder="Edit message..."
            placeholderTextColor="#9ca3af"
            style={styles.editInput}
          />

          <View style={styles.editActionRow}>
            <TouchableOpacity
              onPress={cancelEdit}
              disabled={savingEdit}
              style={styles.editActionButton}>
              <Icon name="times" size={14} color="#ddd" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={submitEdit}
              disabled={savingEdit || !draftText.trim()}
              style={[
                styles.editActionButton,
                savingEdit || !draftText.trim() ? styles.disabledButton : null,
              ]}>
              <Icon name="check" size={14} color="#22c55e" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          {message?.fileName && (
            <View style={styles.attachmentContainer}>
              {message?.fileType?.includes('image') &&
              message?.fileUrl &&
              !imageError ? (
                <Image
                  source={{uri: formatImageUri(message.fileUrl)}}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.attachmentFileIcon}>
                  <Icon name="file" size={18} color="#bbb" />
                </View>
              )}

              <View style={styles.attachmentMeta}>
                <Text style={styles.attachmentLabel}>Attached file</Text>
                <Text style={styles.attachmentText} numberOfLines={1}>
                  {message.fileName || message.fileUrl}
                </Text>
              </View>
            </View>
          )}

          <Text style={{flexWrap: 'wrap', lineHeight: 22}}>
            {words.map((word, index) => {
              let color = '#aaa';

              if (speaking) {
                if (index === highlightIndex) color = '#22c55e';
                else if (index < highlightIndex) color = '#fff';
              } else {
                color = '#fff';
              }

              return (
                <Text key={index} style={{color, fontSize: 15}}>
                  {word + ' '}
                </Text>
              );
            })}
          </Text>
        </>
      )}

      {isUser && !editing && showEditOption && onEdit && (
        <View style={styles.userActionRow}>
          <TouchableOpacity onPress={startEdit}>
            <Icon name="pen" size={14} color="#d1d5db" />
          </TouchableOpacity>
        </View>
      )}

      {/* 🔥 ACTION ROW */}
      {!isUser && (
        <View style={styles.actionRow}>
          {/* 🔊 SPEAKER */}
          {!speaking ? (
            <TouchableOpacity onPress={() => speak(message.text)}>
              <Icon name="volume-up" size={16} color="#aaa" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={stopSpeak}>
              <Icon name="times" size={16} color="rgb(220, 28, 8)" />
            </TouchableOpacity>
          )}

          {/* 📋 COPY */}
          <TouchableOpacity onPress={copyText} style={{marginLeft: 3}}>
            <Icon
              name={copied ? 'check' : 'copy'}
              size={16}
              color={copied ? '#22c55e' : '#aaa'}
            />
          </TouchableOpacity>

          {/* 👍 */}
          <Animated.View style={{transform: [{scale}], marginLeft: 10}}>
            <TouchableOpacity
              onPress={() => handleFeedback(1)}
              disabled={feedbackGiven}>
              <Icon
                name="thumbs-up"
                size={16}
                color={selected === 1 ? '#22c55e' : '#888'}
                solid
              />
            </TouchableOpacity>
          </Animated.View>

          {/* 👎 */}
          <Animated.View style={{transform: [{scale}], marginLeft: 5}}>
            <TouchableOpacity
              onPress={() => handleFeedback(-1)}
              disabled={feedbackGiven}>
              <Icon
                name="thumbs-down"
                size={16}
                color={selected === -1 ? '#22c55e' : '#888'}
                solid
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

export default React.memo(MessageBubble, (prevProps, nextProps) => {
  const prev = prevProps.message || {};
  const next = nextProps.message || {};

  return (
    prev.id === next.id &&
    prev.localId === next.localId &&
    prev.text === next.text &&
    prev.isUser === next.isUser &&
    prev.fileName === next.fileName &&
    prev.fileType === next.fileType &&
    prev.fileUrl === next.fileUrl &&
    prev.feedbackGiven === next.feedbackGiven &&
    prevProps.messageIndex === nextProps.messageIndex &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onEditStart === nextProps.onEditStart &&
    prevProps.onEditEnd === nextProps.onEditEnd
  );
});

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    padding: 12,
    marginVertical: 6,
    borderRadius: 12,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 14,
    alignItems: 'center',
  },
  userActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  editInput: {
    minWidth: 220,
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
    textAlignVertical: 'top',
  },
  editActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  editActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },
  attachmentImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 10,
  },
  attachmentFileIcon: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  attachmentText: {
    color: '#fff',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
