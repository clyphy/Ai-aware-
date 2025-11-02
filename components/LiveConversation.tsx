
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from "@google/genai";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { decode, decodeAudioData, createBlob } from '../utils/audio';

type TranscriptionTurn = {
    user: string;
    model: string;
};

const LiveConversation: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcription, setTranscription] = useState<TranscriptionTurn[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ user: '', model: '' });
    
    const currentTurnRef = useRef(currentTurn);
    useEffect(() => {
        currentTurnRef.current = currentTurn;
    }, [currentTurn]);
    
    const sessionRef = useRef<Promise<LiveSession> | null>(null);
    const audioResources = useRef<{
        stream: MediaStream | null;
        inputAudioContext: AudioContext | null;
        outputAudioContext: AudioContext | null;
        outputGainNode: GainNode | null;
        scriptProcessor: ScriptProcessorNode | null;
        sources: Set<AudioBufferSourceNode>;
        nextStartTime: number;
    }>({ stream: null, inputAudioContext: null, outputAudioContext: null, outputGainNode: null, scriptProcessor: null, sources: new Set(), nextStartTime: 0 });

    const stopConversation = useCallback(() => {
        setIsActive(false);
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close());
            sessionRef.current = null;
        }
        audioResources.current.stream?.getTracks().forEach(track => track.stop());
        audioResources.current.outputGainNode?.disconnect();
        audioResources.current.inputAudioContext?.close();
        audioResources.current.outputAudioContext?.close();
        audioResources.current.scriptProcessor?.disconnect();
        audioResources.current = { stream: null, inputAudioContext: null, outputAudioContext: null, outputGainNode: null, scriptProcessor: null, sources: new Set(), nextStartTime: 0 };
    }, []);

    const startConversation = async () => {
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioResources.current.stream = stream;
            
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioResources.current.inputAudioContext = inputAudioContext;
            
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioResources.current.outputAudioContext = outputAudioContext;

            const outputGainNode = outputAudioContext.createGain();
            outputGainNode.connect(outputAudioContext.destination);
            audioResources.current.outputGainNode = outputGainNode;
            
            audioResources.current.nextStartTime = 0;
            audioResources.current.sources = new Set();
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            sessionRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: "You are a helpful, friendly AI assistant integrated into a paranormal investigation toolkit. Keep your responses concise."
                },
                callbacks: {
                    onopen: () => {
                        console.log('Session opened');
                        setIsConnecting(false);
                        setIsActive(true);
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        audioResources.current.scriptProcessor = scriptProcessor;
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, user: prev.user + message.serverContent!.inputTranscription!.text }));
                        }
                        if (message.serverContent?.outputTranscription) {
                            setCurrentTurn(prev => ({...prev, model: prev.model + message.serverContent!.outputTranscription!.text }));
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscription(prev => [...prev, currentTurnRef.current]);
                            setCurrentTurn({ user: '', model: '' });
                        }
                        
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (audioData && audioResources.current.outputGainNode) {
                             audioResources.current.nextStartTime = Math.max(
                                audioResources.current.nextStartTime,
                                outputAudioContext.currentTime,
                            );
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioResources.current.outputGainNode);
                            source.addEventListener('ended', () => {
                                audioResources.current.sources.delete(source);
                            });
                            source.start(audioResources.current.nextStartTime);
                            audioResources.current.nextStartTime += audioBuffer.duration;
                            audioResources.current.sources.add(source);
                        }
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        stopConversation();
                    },
                    onclose: () => {
                        console.log('Session closed');
                        stopConversation();
                    }
                }
            });
        } catch (error) {
            console.error("Failed to start conversation:", error);
            setIsConnecting(false);
        }
    };
    
    const handleToggleConversation = () => {
        if (isActive || isConnecting) {
            stopConversation();
        } else {
            setTranscription([]);
            setCurrentTurn({ user: '', model: '' });
            startConversation();
        }
    };
    
    return (
        <div className="feature-card relative w-full max-w-2xl p-6 rounded-lg text-center flex flex-col h-[70vh]">
            <h3 className="text-xl font-bold text-cyan-200 holographic-glow mb-2">Live AI Agent</h3>
            <p className="text-cyan-300 mb-4 text-sm">Speak directly with the AI Core.</p>

            <div className="flex-grow bg-black/30 border border-cyan-500/30 rounded-lg p-4 overflow-y-auto text-left space-y-4">
                {transcription.map((turn, i) => (
                    <div key={i}>
                        <p><strong className="text-cyan-200">YOU:</strong> {turn.user}</p>
                        <p><strong className="text-cyan-400">AI:</strong> {turn.model}</p>
                    </div>
                ))}
                { (currentTurn.user || currentTurn.model) && <div>
                    <p className="opacity-70"><strong className="text-cyan-200">YOU:</strong> {currentTurn.user}</p>
                    <p className="opacity-70"><strong className="text-cyan-400">AI:</strong> {currentTurn.model}</p>
                </div>}
                {!isActive && transcription.length === 0 && <p className="text-cyan-400/50 text-center pt-8">Press the microphone to begin.</p>}
            </div>

            <button onClick={handleToggleConversation} disabled={isConnecting} className={`holographic-button rounded-full w-20 h-20 mx-auto mt-6 flex items-center justify-center ${isActive ? 'bg-red-500/30 border-red-500/50' : ''}`}>
                {isConnecting ? 
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div> :
                    (isActive ? <MicOff size={40} /> : <Mic size={40} />)
                }
            </button>
            <p className="text-sm mt-2 text-cyan-400/60">{isConnecting ? "Initializing..." : (isActive ? "Listening... (Click to Stop)" : "Connection Closed")}</p>
        </div>
    );
};

export default LiveConversation;
