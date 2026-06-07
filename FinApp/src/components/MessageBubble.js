/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import {COLORS} from '../theme/theme';
import {useState, useEffect, useRef} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Clipboard from '@react-native-clipboard/clipboard';
import API from '../api/client';
import Tts from 'react-native-tts';

export default function MessageBubble({message, onEdit}) {
  const isUser = message?.isUser;

  const [copied, setCopied] = useState(false);

  const [feedbackGiven, setFeedbackGiven] = useState(
    message?.feedbackGiven || false,
  );
  const [selected, setSelected] = useState(null);

  const [speaking, setSpeaking] = useState(false);
  const [ttsReady, setTtsReady] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const words = (message?.text || '').split(' ');
  const scale = useRef(new Animated.Value(1)).current;

  // 🔥 COPY
  const copyText = () => {
    Clipboard.setString(message?.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 🔥 TTS INIT
  useEffect(() => {
    let finishSub;
    let cancelSub;
    let progressSub;

    Tts.getInitStatus().then(() => {
      setTtsReady(true);
      Tts.setDefaultRate(0.45);
    });

    progressSub = Tts.addEventListener('tts-progress', event => {
      const {start} = event;

      let charCount = 0;
      for (let i = 0; i < words.length; i++) {
        charCount += words[i].length + 1;

        if (start <= charCount) {
          setHighlightIndex(i);
          break;
        }
      }
    });

    finishSub = Tts.addEventListener('tts-finish', () => {
      setSpeaking(false);
      setHighlightIndex(-1);
    });

    cancelSub = Tts.addEventListener('tts-cancel', () => {
      setSpeaking(false);
      setHighlightIndex(-1);
    });

    return () => {
      finishSub?.remove();
      cancelSub?.remove();
      progressSub?.remove();
    };
  }, []);

  const speak = text => {
    if (!text || !ttsReady) return;

    Tts.stop();
    setSpeaking(true);
    setHighlightIndex(0);
    Tts.speak(text);
  };

  const stopSpeak = () => {
    Tts.stop();
    setSpeaking(false);
    setHighlightIndex(-1);
  };

  // 👍 👎 animation
  const animate = () => {
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
  };

  // 🔥 FEEDBACK API
  const handleFeedback = async rating => {
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
  };

  return (
    <View
      style={[
        styles.container,
        {
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          backgroundColor: isUser ? '#14532D' : COLORS.card,
        },
      ]}>
      {/* TEXT */}
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
    </View>
  );
}

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
});
