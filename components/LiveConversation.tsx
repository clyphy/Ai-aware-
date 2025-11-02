import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from "@google/genai";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { decode, decodeAudioData, createBlob } from '../utils/audio';

type TranscriptionTurn = {
    user: string;
    model: string;
};

// Helper function to draw waveforms on a canvas
const drawWaveform = (canvas: HTMLCanvasElement, analyser: AnalyserNode, color: string) => {
    if (!canvas || !analyser) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Set FFT size for the analyser, this determines the number of data points
    analyser.fftSize = 2048; // Can be adjusted (powers of 2, e.g., 32, 64, ..., 2048, 4096, 8192, 16384, 32768)
    const bufferLength = analyser.frequencyBinCount; // half of fftSize for frequency data, but getByteTimeDomainData uses fftSize
    const dataArray = new Uint8Array(bufferLength);

    // Get time domain data and draw waveform
    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.clearRect(0, 0, width, height); // Clear the canvas
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = color;

    canvasCtx.beginPath();

    const sliceWidth = width * 1.0 / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        // Data points are 0-255, where 128 is the zero amplitude
        const v = dataArray[i] / 128.0; // Normalize to 0-2
        const y = v * height / 2;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtx.lineTo(width, height / 2); // Connect the last point to the center right edge
    canvasCtx.stroke();
};

export const LiveConversation: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [transcription, setTranscription] = useState<TranscriptionTurn[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ user: '', model: '' });
    // Add error state to display potential connection or session errors.
    const [error, setError] = useState<string | null>(null);
    
    const currentTurnRef = useRef(currentTurn);
    useEffect(() => {
        currentTurnRef.current = currentTurn;
    }, [currentTurn]);
    
    const sessionRef = useRef<Promise<LiveSession> | null>(null);

    // Refs for canvas elements
    const canvasRefInput = useRef<HTMLCanvasElement>(null);
    const canvasRefOutput = useRef<HTMLCanvasElement>(null);

    // Ref to store all Web Audio API resources and animation frame ID
    const audioResources = useRef<{
        stream: MediaStream | null;
        inputAudioContext: AudioContext | null;
        outputAudioContext: AudioContext | null;
        outputGainNode: GainNode | null;
        scriptProcessor: ScriptProcessorNode | null;
        sources: Set<AudioBufferSourceNode>;
        nextStartTime: number;
        animationFrameId: number | null; // For visualization animation loop
        inputAnalyser: AnalyserNode | null;
        outputAnalyser: AnalyserNode | null;
    }>({ 
        stream: null, 
        inputAudioContext: null, 
        outputAudioContext: null, 
        outputGainNode: null, 
        scriptProcessor: null, 
        sources: new Set(), 
        nextStartTime: 0,
        animationFrameId: null,
        inputAnalyser: null,
        outputAnalyser: null,
    });

    // Function to animate the waveform visualizations
    const animateVisualization = useCallback(() => {
        if (isActive) {
            if (audioResources.current.inputAnalyser && canvasRefInput.current) {
                drawWaveform(canvasRefInput.current, audioResources.current.inputAnalyser, '#00F0FF'); // Cyan for user input
            }
            if (audioResources.current.outputAnalyser && canvasRefOutput.current) {
                drawWaveform(canvasRefOutput.current, audioResources.current.outputAnalyser, '#FFFF00'); // Yellow for AI output
            }
        }
        audioResources.current.animationFrameId = requestAnimationFrame(animateVisualization);
    }, [isActive]);


    const stopConversation = useCallback(() => {
        setIsActive(false);
        // Clear any existing error when stopping.
        setError(null);
        if (sessionRef.current) {
            sessionRef.current.then(session => session.close());
            sessionRef.current = null;
        }

        // Stop all audio tracks from the media stream
        audioResources.current.stream?.getTracks().forEach(track => track.stop());
        
        // Disconnect and close Web Audio API nodes and contexts
        audioResources.current.scriptProcessor?.disconnect();
        audioResources.current.inputAnalyser?.disconnect();
        audioResources.current.outputAnalyser?.disconnect();
        audioResources.current.outputGainNode?.disconnect();
        audioResources.current.inputAudioContext?.close();
        audioResources.current.outputAudioContext?.close();

        // Cancel any pending animation frames
        if (audioResources.current.animationFrameId) {
            cancelAnimationFrame(audioResources.current.animationFrameId);
            audioResources.current.animationFrameId = null;
        }

        // Reset all audio resources
        audioResources.current = { 
            stream: null, 
            inputAudioContext: null, 
            outputAudioContext: null, 
            outputGainNode: null, 
            scriptProcessor: null, 
            sources: new Set(), 
            nextStartTime: 0,
            animationFrameId: null,
            inputAnalyser: null,
            outputAnalyser: null,
        };
    }, []);

    const startConversation = async () => {
        setIsConnecting(true);
        // Clear any previous errors when starting a new conversation.
        setError(null);
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioResources.current.stream = stream;
            
            // Setup input audio context for microphone
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioResources.current.inputAudioContext = inputAudioContext;
            
            // Setup output audio context for model's spoken responses
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioResources.current.outputAudioContext = outputAudioContext;

            // Create AnalyserNodes for visualization
            const inputAnalyser = inputAudioContext.createAnalyser();
            audioResources.current.inputAnalyser = inputAnalyser;
            
            const outputAnalyser = outputAudioContext.createAnalyser();
            audioResources.current.outputAnalyser = outputAnalyser;

            // Create a gain node for controlling output volume (and connecting to analyser)
            const outputGainNode = outputAudioContext.createGain();
            outputGainNode.connect(outputAnalyser); // Connect gain node to output analyser
            outputAnalyser.connect(outputAudioContext.destination); // Connect output analyser to destination
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

                        // Start the continuous visualization animation loop
                        audioResources.current.animationFrameId = requestAnimationFrame(animateVisualization);

                        // Stream audio from the microphone
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        // ScriptProcessorNode to process audio chunks and send to model
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        audioResources.current.scriptProcessor = scriptProcessor;
                        
                        // Connect audio graph for input: Source -> Input Analyser -> Script Processor -> Input Audio Context Destination
                        source.connect(inputAnalyser); // Microphone output to input analyser
                        inputAnalyser.connect(scriptProcessor); // Input analyser to script processor
                        scriptProcessor.connect(inputAudioContext.destination); // Script processor to destination (to keep graph active)

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0); // Float32Array
                            const pcmBlob = createBlob(inputData); // Convert to PCM Blob for API
                            sessionRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcriptions
                        if (message.serverContent?.outputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, model: prev.model + message.serverContent?.outputTranscription?.text }));
                        }
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, user: prev.user + message.serverContent?.inputTranscription?.text }));
                        }

                        // Process audio output
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64EncodedAudioString && audioResources.current.outputAudioContext && audioResources.current.outputGainNode) {
                            audioResources.current.nextStartTime = Math.max(
                                audioResources.current.nextStartTime,
                                audioResources.current.outputAudioContext.currentTime,
                            );
                            const audioBuffer = await decodeAudioData(
                                decode(base64EncodedAudioString),
                                audioResources.current.outputAudioContext,
                                24000,
                                1,
                            );
                            const source = audioResources.current.outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(audioResources.current.outputGainNode); // Connect to gain node which connects to analyser and destination
                            source.addEventListener('ended', () => {
                                audioResources.current.sources.delete(source);
                            });

                            source.start(audioResources.current.nextStartTime);
                            audioResources.current.nextStartTime = audioResources.current.nextStartTime + audioBuffer.duration;
                            audioResources.current.sources.add(source);
                        }

                        // Handle turn completion
                        if (message.serverContent?.turnComplete) {
                            const { user, model } = currentTurnRef.current;
                            if (user || model) {
                                setTranscription(prev => [...prev, { user, model }]);
                            }
                            setCurrentTurn({ user: '', model: '' });
                        }

                        // Handle interruption
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of audioResources.current.sources.values()) {
                                source.stop();
                                audioResources.current.sources.delete(source);
                            }
                            audioResources.current.nextStartTime = 0;
                        }
                    },
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        // Set error state when an error occurs.
                        setError('Live session encountered an error. Please try again.');
                        stopConversation();
                    },
                    onclose: (e) => {
                        console.log('Session closed:', e);
                        if (isActive) { // Only call stop if it was active, otherwise it's expected
                            stopConversation();
                        }
                    },
                },
            });

        } catch (error) {
            console.error("Failed to start live conversation:", error);
            setIsConnecting(false);
            // Set error state if starting the conversation fails.
            setError('Failed to connect to the live agent. Check microphone permissions.');
            stopConversation();
        }
    };

    const toggleConversation = () => {
        if (isActive || isConnecting) {
            stopConversation();
        } else {
            startConversation();
        }
    };

    return (
        <div className="feature-card relative w-full h-[70vh] max-w-xl flex flex-col p-4 rounded-lg">
            <div className="flex-grow overflow-y-auto pr-2 mb-4">
                <h3 className="text-xl font-bold text-cyan-200 holographic-glow mb-4 text-center">Live Agent Interlink</h3>
                <div className="space-y-4">
                    {transcription.map((turn, index) => (
                        <React.Fragment key={index}>
                            {turn.user && (
                                <div className="flex justify-end">
                                    <div className="user-message p-3 rounded-lg max-w-xs">{turn.user}</div>
                                </div>
                            )}
                            {turn.model && (
                                <div className="flex justify-start">
                                    <div className="model-message-confessor p-3 rounded-lg max-w-xs">{turn.model}</div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                    {currentTurn.user && (
                         <div className="flex justify-end">
                            <div className="user-message p-3 rounded-lg max-w-xs pulse-cyan">{currentTurn.user}</div>
                        </div>
                    )}
                    {(currentTurn.model || isConnecting) && (
                        <div className="flex justify-start">
                            <div className="model-message-confessor p-3 rounded-lg max-w-xs pulse-yellow">
                                {isConnecting ? 'Connecting...' : currentTurn.model}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-cyan-500/30 flex justify-center items-center space-x-4">
                <div className="flex flex-col items-center">
                    <canvas ref={canvasRefInput} width="200" height="50" className="bg-black/20 rounded-md border border-cyan-500/30"></canvas>
                    <span className="text-xs text-cyan-400">User Input</span>
                </div>
                
                <button
                    onClick={toggleConversation}
                    className={`holographic-button rounded-full w-20 h-20 flex items-center justify-center transition-colors duration-300 ${
                        isActive ? 'bg-red-500/30 border-red-500/50' : ''
                    }`}
                    disabled={isConnecting}
                >
                    {isConnecting ? (
                        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : isActive ? (
                        <MicOff size={40} className="text-red-400 animate-pulse" />
                    ) : (
                        <Mic size={40} />
                    )}
                </button>
                <div className="flex flex-col items-center">
                    <canvas ref={canvasRefOutput} width="200" height="50" className="bg-black/20 rounded-md border border-cyan-500/30"></canvas>
                    <span className="text-xs text-yellow-400">AI Output</span>
                </div>
            </div>
            {/* Display error message if any */}
            {error && <p className="text-red-400 text-center mt-2">{error}</p>}
        </div>
    );
};