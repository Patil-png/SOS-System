import React, { Component } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * VoiceTriggerService - WebView-based voice detection
 * Uses browser's Web Speech API to listen for "Bachao" keyword
 * Works in Expo Go without native modules!
 */
class VoiceTriggerService extends Component {
    constructor(props) {
        super(props);
        this.subscribers = [];
    }

    // Subscribe to voice detection events
    subscribe(callback) {
        this.subscribers.push(callback);
        console.log('🎤 [VoiceTrigger] Subscriber added');
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
            console.log('🎤 [VoiceTrigger] Subscriber removed');
        };
    }

    // Notify all subscribers when keyword detected
    notifySubscribers(keyword, fullText) {
        console.log(`🚨 [VoiceTrigger] Notifying ${this.subscribers.length} subscribers`);
        this.subscribers.forEach(callback => {
            callback({ triggerWord: keyword, fullText });
        });
    }

    // Handle messages from WebView
    handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'KEYWORD_DETECTED') {
                console.log(`🎤 [VoiceTrigger] Keyword detected: "${data.keyword}" in "${data.transcript}"`);
                this.notifySubscribers(data.keyword, data.transcript);
            } else if (data.type === 'LISTENING') {
                console.log('🎤 [VoiceTrigger] Listening started');
            } else if (data.type === 'ERROR') {
                console.error('❌ [VoiceTrigger] Error:', data.message);
            } else if (data.type === 'INTERIM_RESULT') {
                // Optional: Log interim results for debugging
                // console.log('🎤 [VoiceTrigger] Interim:', data.transcript);
            }
        } catch (error) {
            console.error('❌ [VoiceTrigger] Failed to parse message:', error);
        }
    };

    render() {
        // HTML with Web Speech API implementation
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voice Trigger</title>
      </head>
      <body>
        <script>
          // Web Speech API setup
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          
          if (!SpeechRecognition) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ERROR',
              message: 'Speech Recognition not supported'
            }));
          } else {
            const recognition = new SpeechRecognition();
            
            // Configuration
            recognition.continuous = true;  // Keep listening
            recognition.interimResults = true;  // Get partial results
            recognition.lang = 'en-US';  // English (change to 'hi-IN' for Hindi if needed)
            recognition.maxAlternatives = 1;
            
            // Keywords to detect (case-insensitive)
            const KEYWORDS = ['bachao', 'help', 'emergency'];
            
            // Event: Results received
            recognition.onresult = (event) => {
              const results = event.results;
              const lastResultIndex = results.length - 1;
              const result = results[lastResultIndex];
              const transcript = result[0].transcript.toLowerCase().trim();
              const isFinal = result.isFinal;
              
              // Send interim results (optional)
              if (!isFinal) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'INTERIM_RESULT',
                  transcript: transcript
                }));
              }
              
              // Check for keywords
              for (const keyword of KEYWORDS) {
                if (transcript.includes(keyword)) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'KEYWORD_DETECTED',
                    keyword: keyword,
                    transcript: transcript
                  }));
                  
                  // Play alert sound (optional)
                  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBziQ1/LNeysFJHfH8N2RQAoVXrTp66hVFApGneHyvmwgBziQ1vLNeysFJHfH8N+RQAoVXrPp659WFApGneHzu2wfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzu2wfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzu2wfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8N+RQAoVXrPp65xYFApGneHzumwfBziQ1vLOeysFJHfH8A==');
                  audio.play().catch(e => console.log('Audio play failed:', e));
                  
                  break;
                }
              }
            };
            
            // Event: Recognition starts
            recognition.onstart = () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'LISTENING'
              }));
            };
            
            // Event: Recognition ends (restart it)
            recognition.onend = () => {
              // Auto-restart to keep listening
              setTimeout(() => {
                try {
                  recognition.start();
                } catch (e) {
                  console.log('Recognition restart failed:', e);
                }
              }, 1000);
            };
            
            // Event: Error occurred
            recognition.onerror = (event) => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ERROR',
                message: event.error
              }));
              
              // Restart on error (except if no-speech)
              if (event.error !== 'no-speech') {
                setTimeout(() => {
                  try {
                    recognition.start();
                  } catch (e) {
                    console.log('Recognition restart after error failed:', e);
                  }
                }, 1000);
              }
            };
            
            // Start recognition
            try {
              recognition.start();
              console.log('Voice recognition started');
            } catch (error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ERROR',
                message: 'Failed to start: ' + error.message
              }));
            }
          }
        </script>
      </body>
      </html>
    `;

        return (
            <View style={{ height: 0, width: 0, opacity: 0 }}>
                <WebView
                    source={{ html }}
                    onMessage={this.handleMessage}
                    javaScriptEnabled={true}
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback={true}
                    style={{ height: 0, width: 0 }}
                />
            </View>
        );
    }
}

// Singleton instance
let instance = null;

export const getVoiceTriggerService = () => {
    if (!instance) {
        instance = new VoiceTriggerService({});
    }
    return instance;
};

export default VoiceTriggerService;
