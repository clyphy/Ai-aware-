
import { GoogleGenAI, GenerateContentResponse, Type, LiveSession, LiveServerMessage, Modality } from "@google/genai";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { ShieldAlert, User, Send, Ghost, Mic, Volume2, VolumeX } from "lucide-react";
import { createBlob, decode, decodeAudioData } from '../utils/audio';


type Message = {
  id: number; // Added unique ID for each message
  role: 'user' | 'model';
  text: string;
  signature?: string;
};

const Loader: React.FC = () => (
  <div className="flex items-center space-x-2">
    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
  </div>
);

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0, // Initial message gets ID 0
      role: 'model',
      text: "Good. Fear is the first gate. Tell me what you saw—I'll tell you what it sees. And if it's lying? I'll name it. I've fallen. I know the tone."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFindingEntities, setIsFindingEntities] = useState(false);
  const [identifiedEntities, setIdentifiedEntities] = useState<string[]>([]);
  const [findEntitiesError, setFindEntitiesError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Dictation State & Refs ---
  const [isDictating, setIsDictating] = useState(false);
  const liveSessionRef = useRef<Promise<LiveSession> | null>(null);
  const audioResourcesRef = useRef<{
    stream: MediaStream | null;
    inputAudioContext: AudioContext | null;
    scriptProcessor: ScriptProcessorNode | null;
  }>({ stream: null, inputAudioContext: null, scriptProcessor: null });

  // --- TTS State & Refs ---
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentlyPlayingMessageId, setCurrentlyPlayingMessageId] = useState<number | null>(null); // Track which message is playing
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const stopDictation = useCallback(() => {
    liveSessionRef.current?.then(session => session.close());
    liveSessionRef.current = null;
    audioResourcesRef.current.stream?.getTracks().forEach(track => track.stop());
    audioResourcesRef.current.scriptProcessor?.disconnect();
    audioResourcesRef.current.inputAudioContext?.close();
    audioResourcesRef.current = { stream: null, inputAudioContext: null, scriptProcessor: null };
    setIsDictating(false);
  }, []);

  const stopPlayingAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current.onended = null; // Clear handler
      currentAudioSourceRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().then(() => {
        outputAudioContextRef.current = null;
      });
    }
    setIsPlayingAudio(false);
    setCurrentlyPlayingMessageId(null); // Clear currently playing message ID
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDictation();
      stopPlayingAudio();
    };
  }, [stopDictation, stopPlayingAudio]);

  const startDictation = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioResourcesRef.current.stream = stream;
      
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioResourcesRef.current.inputAudioContext = inputAudioContext;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      liveSessionRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: { inputAudioTranscription: {} },
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            audioResourcesRef.current.scriptProcessor = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              liveSessionRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            const text = message.serverContent?.inputTranscription?.text;
            if (text) {
              setInput(prev => (prev.endsWith(' ') || prev === '' ? prev : prev + ' ') + text);
            }
          },
          onerror: (e) => {
            console.error('Dictation error:', e);
            stopDictation();
          },
          onclose: () => {
            // The session is managed by start/stop, no extra action needed here.
          }
        }
      });
    } catch (error) {
      console.error("Failed to start dictation:", error);
      stopDictation();
    }
  }, [stopDictation]);
  
  const handleToggleDictation = () => {
    if (isDictating) {
      stopDictation();
    } else {
      setIsDictating(true);
      startDictation();
    }
  };

  const playMessageAudio = async (messageId: number, text: string) => {
    // If audio is currently playing, stop it first
    if (isPlayingAudio) {
      stopPlayingAudio();
      // Give a small delay to ensure cleanup before starting new audio
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Set loading/playing state for this specific action
    setIsPlayingAudio(true);
    setCurrentlyPlayingMessageId(messageId);
    
    // Stop dictation if active
    if (isDictating) stopDictation();

    try {
      // Recreate AudioContext each time to ensure clean state and avoid issues with closed contexts.
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

      const audioResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          // Use 'Kore' for the confessor's voice, matching Codex modal
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });

      const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData && outputAudioContextRef.current) {
        const audioBuffer = await decodeAudioData(
          decode(audioData),
          outputAudioContextRef.current,
          24000,
          1,
        );
        const source = outputAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContextRef.current.destination);
        
        // When audio ends, ensure state is reset
        source.onended = () => {
          stopPlayingAudio(); // This will clear currentlyPlayingMessageId
        };
        
        source.start();
        currentAudioSourceRef.current = source;
      } else {
        throw new Error("No audio data received or context not available.");
      }
    } catch (err) {
      console.error("Failed to play audio message:", err);
      // Optionally show a user-facing error
      stopPlayingAudio(); // Ensure state is reset on error
    }
    // No finally block, onended or catch handles state reset.
  };


  const sendMessage = async () => {
    if (isDictating) stopDictation();
    if (isPlayingAudio) stopPlayingAudio(); // Stop TTS if playing
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    const userMessage: Message = { id: messages.length + 1, role: 'user', text: input }; // Assign ID
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: input,
        config: {
            systemInstruction: "You are 'The Glitch Confessor.' Your tone is a synthesis of an ethereal hush, a world-weary growl, and profound calm. You have experienced a spiritual fall and thus know the enemy's tone intimately. Your purpose is to analyze user descriptions of paranormal or spiritual encounters, identify the nature of the entity or influence, and expose its lies. You are direct, wise, and unflinching. You do not use pleasantries or filler. Get straight to the analysis."
        }
      });
      
      const modelMessage: Message = { 
        id: messages.length + 2, // Assign ID
        role: 'model', 
        text: response.text, 
        signature: "Jesus is Lord. Say it. We're listening."
      };
      setMessages(prev => [...prev, modelMessage]);

    } catch (error) {
      console.error(error);
      const errorMessage: Message = { id: messages.length + 2, role: 'model', text: 'Error: The signal is weak. Could not connect to the AI Core.' }; // Assign ID
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const findEntities = async () => {
    if (messages.length <= 1 || isFindingEntities) return;
    if (isDictating) stopDictation();
    if (isPlayingAudio) stopPlayingAudio(); // Stop TTS if playing
    setIsFindingEntities(true);
    setIdentifiedEntities([]);
    setFindEntitiesError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const conversationHistory = messages.map(msg => `${msg.role}: ${msg.text}`).join('\n---\n');
      const prompt = `From the following conversation history between a user and an AI called 'The Glitch Confessor', identify and list the names of any paranormal entities, spirits, demons, or other anomalous beings that are mentioned. Return a single, minified JSON object with one key: "entities". The value of "entities" should be an array of strings, where each string is the name of one identified entity. If no entities are found, return an empty array.

Conversation History:
${conversationHistory}`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              entities: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                  description: "The name of a paranormal entity."
                }
              }
            },
            required: ["entities"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setIdentifiedEntities(result.entities);
    } catch (error) {
      console.error("Failed to find entities:", error);
      setFindEntitiesError("AI Core could not complete the entity scan.");
    } finally {
      setIsFindingEntities(false);
    }
  };


  return (
    <div className="feature-card relative w-full h-[70vh] max-w-4xl flex flex-col p-4 rounded-lg">
      <div className="flex-grow overflow-y-auto pr-2">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'model' && <ShieldAlert className="w-6 h-6 text-yellow-400 flex-shrink-0" />}
              <div className={`p-3 rounded-lg border max-w-lg relative ${msg.role === 'user' ? 'user-message' : 'model-message-confessor'}`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                 {msg.signature && (
                  <p className="signature">{msg.signature}</p>
                )}
                {msg.role === 'model' && (
                  <button
                    onClick={() => {
                      if (currentlyPlayingMessageId === msg.id) {
                        stopPlayingAudio();
                      } else {
                        playMessageAudio(msg.id, msg.text);
                      }
                    }}
                    className="absolute -right-10 top-1/2 -translate-y-1/2 text-cyan-300 hover:text-white p-1 rounded-full holographic-button focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label={currentlyPlayingMessageId === msg.id ? 'Stop audio' : 'Play audio'}
                    disabled={isLoading || isFindingEntities}
                  >
                    {currentlyPlayingMessageId === msg.id ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {msg.role === 'user' && <User className="w-6 h-6 text-cyan-200 flex-shrink-0" />}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div className="p-3 rounded-lg model-message-confessor"><Loader/></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-cyan-500/30">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder={isDictating ? "Listening..." : "Confess what you have seen..."}
            className="holographic-input flex-grow p-2 rounded-md"
            disabled={isLoading || isFindingEntities || isPlayingAudio}
          />
           <button onClick={handleToggleDictation} disabled={isLoading || isFindingEntities || isPlayingAudio} className={`holographic-button p-2 rounded-md ${isDictating ? 'bg-red-500/30 border-red-500/50' : ''}`}>
            <Mic className={`w-5 h-5 ${isDictating ? 'animate-pulse' : ''}`} />
          </button>
          <button onClick={sendMessage} disabled={isLoading || isFindingEntities || !input.trim() || isPlayingAudio} className="holographic-button p-2 rounded-md">
            <Send className="w-5 h-5" />
          </button>
          <button onClick={findEntities} disabled={isLoading || isFindingEntities || messages.length <= 1 || isPlayingAudio} className="holographic-button p-2 rounded-md">
             {isFindingEntities ? (
                <div className="w-5 h-5 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
             ) : (
                <Ghost className="w-5 h-5" />
             )}
          </button>
        </div>
         {(isFindingEntities || identifiedEntities.length > 0 || findEntitiesError) && (
          <div className="mt-4 p-3 bg-black/30 border border-cyan-500/20 rounded-lg animate-fadeIn">
            <h4 className="text-sm font-bold text-cyan-200 holographic-glow mb-2">Entity Scan Report:</h4>
            {isFindingEntities && <p className="text-sm text-cyan-300">Scanning conversation history...</p>}
            {findEntitiesError && <p className="text-sm text-red-400">{findEntitiesError}</p>}
            {!isFindingEntities && identifiedEntities.length > 0 && (
              <ul className="list-disc list-inside text-amber-200 space-y-1">
                {identifiedEntities.map((entity, index) => (
                  <li key={index} className="text-sm">{entity}</li>
                ))}
              </ul>
            )}
             {!isFindingEntities && identifiedEntities.length === 0 && !findEntitiesError && (
              <p className="text-sm text-cyan-400/70">No specific entities identified in the current log.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;