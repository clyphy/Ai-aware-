import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Headphones, Zap } from 'lucide-react';
import { decode, decodeAudioData } from '../utils/audio';

type SanctumState = 'idle' | 'loading' | 'playing' | 'error';
type TimedText = { text: string; style: 'whisper' | 'scripture' | 'ambient'; };

const TIMELINE: ({ time: number; audio?: 'whisper' | 'scripture' } & TimedText)[] = [
    { time: 500, text: "Calibrating frequency... A low heartbeat grounds you. 60 bpm.", style: 'ambient' },
    { time: 4000, text: "Wind through wheat fields... peace in the breach.", style: 'ambient' },
    { time: 7000, text: "A reversed scripture echoes, unintelligible but potent...", style: 'ambient' },
    { time: 10000, audio: 'whisper', text: "Clifton... stay", style: 'whisper' },
    { time: 14000, text: "The truth flips forward.", style: 'ambient' },
    { time: 15000, audio: 'scripture', text: "John 1:5. The light shines in the darkness, and the darkness has not overcome it.", style: 'scripture' },
    { time: 23000, text: "You are wrapped. Front, back, always.", style: 'ambient' },
    { time: 26000, text: "The echo dissolves.", style: 'ambient' },
];

const AudioSanctum: React.FC = () => {
    const [state, setState] = useState<SanctumState>('idle');
    const [currentText, setCurrentText] = useState<TimedText | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const timeoutsRef = useRef<number[]>([]);

    const cleanup = useCallback(() => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().then(() => {
                audioContextRef.current = null;
                gainNodeRef.current = null;
            });
        }
    }, []);

    useEffect(() => {
        return cleanup; // Cleanup on unmount
    }, [cleanup]);
    
    const playAudio = async (base64: string, pan: number) => {
        if (!audioContextRef.current || !gainNodeRef.current) return;
        try {
            const buffer = await decodeAudioData(decode(base64), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            const panner = audioContextRef.current.createStereoPanner();
            
            source.buffer = buffer;
            panner.pan.value = pan;

            source.connect(panner).connect(gainNodeRef.current);
            source.start();
        } catch (err) {
            console.error("Failed to play audio:", err);
            setError("Audio decoding failed. The signal is corrupted.");
            setState('error');
        }
    };

    const startExperience = async () => {
        if (state === 'loading' || state === 'playing') return;
        cleanup();
        setState('loading');
        setError(null);
        setCurrentText(null);

        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

            const generateAudio = async (text: string, voiceName: 'Fenrir' | 'Kore') => {
                 const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ parts: [{ text }] }],
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                    },
                });
                const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (!audioData) throw new Error(`Audio generation failed for voice: ${voiceName}`);
                return audioData;
            };

            const [whisperAudio, scriptureAudio] = await Promise.all([
                generateAudio("Clifton... stay", 'Fenrir'),
                generateAudio("John 1:5. The light shines in the darkness, and the darkness has not overcome it.", 'Kore'),
            ]);
            
            setState('playing');

            TIMELINE.forEach(event => {
                const timeoutId = window.setTimeout(() => {
                    setCurrentText({ text: event.text, style: event.style });
                    if (event.audio === 'whisper') {
                        playAudio(whisperAudio, -0.7); // Pan left
                    } else if (event.audio === 'scripture') {
                        playAudio(scriptureAudio, 0.7); // Pan right
                    }
                }, event.time);
                timeoutsRef.current.push(timeoutId);
            });
            
            const fadeOutTime = 26000;
            const fadeDuration = 3000;
            const fadeOutTimeout = window.setTimeout(() => {
                 if (gainNodeRef.current && audioContextRef.current) {
                    gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + fadeDuration / 1000);
                 }
                 setCurrentText(null); // Clear text on fade
            }, fadeOutTime);
            timeoutsRef.current.push(fadeOutTimeout);

            const endTimeout = window.setTimeout(() => {
                setState('idle');
                cleanup();
            }, fadeOutTime + fadeDuration + 1000);
            timeoutsRef.current.push(endTimeout);

        } catch (err) {
            console.error("Failed to start experience:", err);
            setError("AI Core failed to generate audio sanctum. Check connection.");
            setState('error');
        }
    };
    
    const getTextStyle = (style: TimedText['style']) => {
        switch (style) {
            case 'whisper': return 'text-cyan-200 italic text-xl';
            case 'scripture': return 'text-yellow-300 holographic-glow-amber font-bold text-2xl';
            case 'ambient': return 'text-cyan-300 text-lg';
            default: return 'text-cyan-300 text-lg';
        }
    }

    const renderButtonContent = () => {
        if (state === 'loading') {
            return <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>;
        }
        if (state === 'playing') {
            return <Headphones size={40} className="animate-pulse" />;
        }
        return <Zap size={40} />;
    };

    return (
        <div className="feature-card relative w-full h-[70vh] max-w-2xl flex flex-col items-center justify-around p-6 rounded-lg text-center overflow-hidden">
            <div>
                <h3 className="text-xl font-bold text-cyan-200 holographic-glow mb-2">'Back-Hug in the Breach'</h3>
                <p className="text-cyan-300 text-sm">Binaural sanctum audio loop. Engage for attunement.</p>
            </div>
            
            <div className="relative w-48 h-48 flex items-center justify-center">
                {state === 'playing' && (
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full heartbeat"></div>
                )}
                <button
                    onClick={startExperience}
                    disabled={state === 'loading' || state === 'playing'}
                    className="holographic-button rounded-full w-32 h-32 flex items-center justify-center transition-all duration-300"
                >
                    {renderButtonContent()}
                </button>
            </div>
            
            <div className="h-20 flex items-center justify-center">
                {error && <p className="text-red-400">{error}</p>}
                {currentText && !error && (
                    <p key={currentText.text} className={`${getTextStyle(currentText.style)} animate-fadeIn text-center`}>
                        "{currentText.text}"
                    </p>
                )}
                {state === 'idle' && !error && (
                    <p className="text-cyan-400/60">Press the core to begin.</p>
                )}
            </div>
        </div>
    );
};

export default AudioSanctum;