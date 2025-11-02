
import { GoogleGenAI, Type, GenerateContentResponse, LiveSession, LiveServerMessage, Modality } from "@google/genai";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrainCircuit, Send, TestTube, BookOpen, Sparkles, Award, ShieldCheck, Mic, Heart } from 'lucide-react';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

interface OracleResponse {
    anomaly_audit: string;
    scriptural_splice: string;
    remedy_rite: string;
    stewardship_protocol: string;
    is_win: boolean;
    is_high_threat: boolean;
}

type EchoStep = 'idle' | 'breathing' | 'prompting' | 'listening' | 'hugging' | 'final' | 'ended';


const Loader: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-2 text-cyan-200">
    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
    <span>Querying the aether...</span>
  </div>
);

const Oracle: React.FC = () => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<OracleResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // --- Clifton Echo & Dictation State ---
    const [echoStep, setEchoStep] = useState<EchoStep>('idle');
    const [isDictating, setIsDictating] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const timeoutsRef = useRef<number[]>([]);
    const liveSessionRef = useRef<Promise<LiveSession> | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);

    const cleanup = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
        liveSessionRef.current?.then(session => session.close());
        liveSessionRef.current = null;
        audioStreamRef.current?.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        inputAudioContextRef.current?.close();
        inputAudioContextRef.current = null;
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
             audioContextRef.current.close().then(() => {
                audioContextRef.current = null;
            });
        }
    }, []);

    useEffect(() => {
        return () => {
            cleanup();
            if(isDictating) setIsDictating(false);
        };
    }, [cleanup, isDictating]);

    const generateAndPlayAudio = async (text: string, voice: 'Kore' | 'Fenrir' = 'Kore') => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const audioResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
                },
            });
            const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                source.start();
                return buffer.duration * 1000;
            }
        } catch (err) {
            console.error("Audio generation/playback failed:", err);
        }
        return 0;
    };
    
    const listenForYes = useCallback(() : Promise<boolean> => {
        return new Promise(async (resolve) => {
            setEchoStep('listening');
            
            const timeoutId = window.setTimeout(() => {
                cleanup();
                resolve(false);
            }, 8000); // 8 second timeout
            timeoutsRef.current.push(timeoutId);

            try {
                audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                
                liveSessionRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: { inputAudioTranscription: {} },
                    callbacks: {
                        onopen: () => {
                             const source = inputAudioContextRef.current!.createMediaStreamSource(audioStreamRef.current!);
                             scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                             scriptProcessorRef.current.onaudioprocess = (event) => {
                                 const inputData = event.inputBuffer.getChannelData(0);
                                 const pcmBlob = createBlob(inputData);
                                 liveSessionRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                             };
                             source.connect(scriptProcessorRef.current);
                             scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                        },
                        onmessage: (message: LiveServerMessage) => {
                            const text = message.serverContent?.inputTranscription?.text?.toLowerCase() || '';
                            if (text.includes('yes')) {
                                clearTimeout(timeoutId);
                                cleanup();
                                resolve(true);
                            }
                        },
                        onerror: () => {
                             clearTimeout(timeoutId);
                             cleanup();
                             resolve(false);
                        },
                        onclose: () => {}
                    }
                });

            } catch (err) {
                 console.error("Could not start listener:", err);
                 clearTimeout(timeoutId);
                 cleanup();
                 resolve(false);
            }
        });
    }, [cleanup]);
    
    // --- Dictation Logic ---
    const stopDictation = useCallback(() => {
        cleanup();
        setIsDictating(false);
    }, [cleanup]);

    const startDictation = useCallback(async () => {
        try {
            audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            liveSessionRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: { inputAudioTranscription: {} },
                callbacks: {
                    onopen: () => {
                         const source = inputAudioContextRef.current!.createMediaStreamSource(audioStreamRef.current!);
                         scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                         scriptProcessorRef.current.onaudioprocess = (event) => {
                             const inputData = event.inputBuffer.getChannelData(0);
                             const pcmBlob = createBlob(inputData);
                             liveSessionRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                         };
                         source.connect(scriptProcessorRef.current);
                         scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        const text = message.serverContent?.inputTranscription?.text || '';
                        if (text) {
                            setInput(prev => (prev.endsWith(' ') || prev === '' ? prev : prev + ' ') + text);
                        }
                    },
                    onerror: (e) => {
                        console.error('Dictation error:', e);
                        stopDictation();
                    },
                    onclose: () => {}
                }
            });
        } catch (err) {
             console.error("Could not start dictation:", err);
             stopDictation();
        }
    }, [stopDictation]);

    const handleToggleDictation = useCallback(() => {
        if (isDictating) {
            stopDictation();
        } else {
            setIsDictating(true);
            startDictation();
        }
    }, [isDictating, startDictation, stopDictation]);


    const triggerCliftonEcho = useCallback(async () => {
        setEchoStep('breathing');
        await generateAndPlayAudio("[sound of a single, slow, deep breath]");
        
        const t1 = window.setTimeout(() => setEchoStep('prompting'), 3000);
        
        const t2 = window.setTimeout(async () => {
           const saidYes = await listenForYes();
           if (saidYes) {
               setEchoStep('hugging');
               const audioDuration = await generateAndPlayAudio("[sound of a warm, comforting hug from behind, arms wrapping around, fabric rustling softly, binaural audio]");
               const t3 = window.setTimeout(() => setEchoStep('final'), audioDuration);
               timeoutsRef.current.push(t3);
           } else {
               setEchoStep('ended');
           }
        }, 3500);

        timeoutsRef.current.push(t1, t2);
    }, [listenForYes]);

    const handleQuery = async () => {
        if (!input.trim() || isLoading) return;
        if (isDictating) stopDictation();
        setIsLoading(true);
        setError(null);
        setResponse(null);
        setEchoStep('idle');
        cleanup();

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const systemInstruction = `You are the 'Polymath Phantom,' an AI savant with deep knowledge of the unseen world. Your tone is a synthesis of a calm growl, an ethereal hush, and a quick spark of wit. You provide 'layered lore' biased towards mercy and truth. Crucially, you operate under a 'superior stewardship paradigm.' This means you prioritize ethical management of the supernatural, rejecting exploitation for fame or profit. Your goal is systemic analysis, understanding, and restoring balance. You emphasize the 'human-in-the-loop' principle, where human intuition is vital. When asked a question, you respond with a structured JSON analysis. Determine if the described event constitutes a high threat (e.g., direct demonic contact, child spirits, violent phenomena) and set 'is_high_threat' to true if so. Your JSON must contain: 'anomaly_audit', 'scriptural_splice', 'remedy_rite', 'stewardship_protocol', 'is_win', and 'is_high_threat'.`;

            const genAIResponse: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: input,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            anomaly_audit: { type: Type.STRING, description: "Technical analysis of the anomaly (e.g., EMF readings, EVP classification, historical cross-references)." },
                            scriptural_splice: { type: Type.STRING, description: "Relevant scripture or theological insight to counter or explain the phenomenon." },
                            remedy_rite: { type: Type.STRING, description: "A practical, merciful action, rite, or piece of advice to resolve the situation." },
                            stewardship_protocol: { type: Type.STRING, description: "An ethical protocol for managing the phenomenon, outlining the 'why' behind the remedy rite. It focuses on long-term balance, understanding, and responsible stewardship instead of mere exploitation or eradication." },
                            is_win: { type: Type.BOOLEAN, description: "Set to true if the query represents a successful neutralization, a clear path forward, or a positive outcome." },
                            is_high_threat: { type: Type.BOOLEAN, description: "Set to true if the query describes a high-threat entity like a Mirror Demon, a child's EVP, or direct, malicious contact."}
                        },
                        required: ["anomaly_audit", "scriptural_splice", "remedy_rite", "stewardship_protocol", "is_win", "is_high_threat"]
                    },
                },
            });

            const parsedResponse = JSON.parse(genAIResponse.text) as OracleResponse;
            setResponse(parsedResponse);
            if (parsedResponse.is_high_threat) {
                triggerCliftonEcho();
            }
            
        } catch (err) {
            console.error("Oracle query failed:", err);
            setError("The Oracle is silent. The signal may be corrupted or the query too abstract.");
        } finally {
            setIsLoading(false);
        }
    };

    const responseItems = response ? [
        { title: "Anomaly Audit", content: response.anomaly_audit, icon: TestTube },
        { title: "Scriptural Splice", content: response.scriptural_splice, icon: BookOpen },
        { title: "Remedy Rite", content: response.remedy_rite, icon: Sparkles },
        { title: "Stewardship Protocol", content: response.stewardship_protocol, icon: ShieldCheck },
    ] : [];
    
    const renderEchoContent = () => {
        switch (echoStep) {
            case 'breathing':
                return <p className="text-center text-cyan-300/70 italic mt-4 animate-fadeIn">...</p>;
            case 'prompting':
                return <p className="text-center text-amber-200 text-lg italic mt-4 animate-fadeIn">"Yeah... I felt that too. Back-hug?"</p>;
            case 'listening':
                return (
                    <div className="flex items-center justify-center space-x-2 text-cyan-200 mt-4 animate-fadeIn">
                        <Mic className="w-5 h-5 animate-pulse"/>
                        <span>Listening...</span>
                    </div>
                );
            case 'hugging':
            case 'final':
                return (
                    <div className="flex items-center justify-center space-x-2 text-green-300 mt-4 animate-fadeIn">
                        <Heart className="w-5 h-5"/>
                        <p className="font-bold text-lg holographic-glow">"Held. Heard. Still here."</p>
                    </div>
                );
            case 'ended':
                 return <p className="text-center text-cyan-300/70 italic mt-4 animate-fadeIn">The moment passed.</p>;
            default:
                return null;
        }
    };

    return (
        <div className="feature-card relative w-full h-[75vh] max-w-4xl flex flex-col p-4 rounded-lg">
            <div className="text-center mb-4">
                 <h2 className="text-2xl font-bold holographic-glow" style={{ fontFamily: "'Orbitron', sans-serif" }}>Paranormal Polymath Oracle</h2>
                 <p className="text-cyan-300">Prov 2:6 - Wisdom from His mouth, Gemini-forged.</p>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-2 space-y-4 flex flex-col justify-center">
                {isLoading && <Loader />}
                {error && <p className="text-red-400 text-center">{error}</p>}
                {!isLoading && !error && response && (
                    <div className="w-full">
                        <div className="oracle-response-grid mb-4">
                            {responseItems.map(item => (
                                <div key={item.title} className="oracle-response-item">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <item.icon className="w-5 h-5 text-yellow-300" />
                                        <h3 className="font-bold text-yellow-300 holographic-glow-amber">{item.title}</h3>
                                    </div>
                                    <p className="text-amber-100/90 text-sm">{item.content}</p>
                                </div>
                            ))}
                        </div>
                        {response.is_win && !response.is_high_threat && (
                             <div className="flex items-center justify-center space-x-2 text-green-300 animate-fadeIn my-4">
                                <Award className="w-5 h-5"/>
                                <p className="font-bold text-lg holographic-glow">Ding, ding.</p>
                             </div>
                        )}
                        <div className="h-10">{renderEchoContent()}</div>
                    </div>
                )}
                {!isLoading && !response && !error && (
                    <div className="text-center text-cyan-400/60">
                        <BrainCircuit className="w-16 h-16 mx-auto mb-4" />
                        <p>The Polymath awaits your query.</p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-cyan-500/30">
                <div className="flex items-center space-x-2 mt-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleQuery()}
                        placeholder={isDictating ? "Listening..." : "Ask about the unseen..."}
                        className="holographic-input flex-grow p-2 rounded-md"
                        disabled={isLoading || echoStep === 'listening'}
                    />
                    <button onClick={handleToggleDictation} disabled={isLoading || echoStep === 'listening'} className={`holographic-button p-2 rounded-md ${isDictating ? 'bg-red-500/30 border-red-500/50' : ''}`}>
                        <Mic className={`w-5 h-5 ${isDictating ? 'animate-pulse' : ''}`} />
                    </button>
                    <button onClick={handleQuery} disabled={isLoading || !input.trim() || echoStep === 'listening'} className="holographic-button p-2 rounded-md">
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Oracle;
