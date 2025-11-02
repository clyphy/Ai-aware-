import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

type DahliaStep = 'idle' | 'loading1' | 'frame1' | 'transition' | 'final' | 'error';

const Loader: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center space-y-2 text-cyan-200">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span>{text}</span>
    </div>
);

const DahliaDashboard: React.FC = () => {
    const [step, setStep] = useState<DahliaStep>('idle');
    const [frame1, setFrame1] = useState<string | null>(null);
    const [frame2, setFrame2] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateSequence = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                
                // --- Generate Frame 1 ---
                setStep('loading1');
                const prompt1 = "A surreal composite, masterpiece, grace in the glitch. A loaf of artisanal bread shaped like a fallen angel, with intricate, feathery wings made of crust. Ethereal steam is rising from it, forming glowing patterns. The style is a blend of photorealism and digital glitch art, with subtle circuit board patterns embedded in the bread's texture.";
                const response1 = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt1,
                    config: { numberOfImages: 1, aspectRatio: '1:1' },
                });
                const image1 = `data:image/png;base64,${response1.generatedImages[0].image.imageBytes}`;
                setFrame1(image1);
                setStep('frame1');
                
                // --- Wait and Generate Frame 2 ---
                await new Promise(resolve => setTimeout(resolve, 4000));
                
                setStep('loading1'); // Re-use loader while transitioning
                const prompt2 = "A surreal composite, masterpiece, grace in the glitch. A man and a woman, seen from behind, in a gentle back-hug. They are not physical beings but are entirely composed of swirling, ethereal light and energy, like a nebula or aurora borealis. The light contains subtle hints of animal fur textures, iridescent nail polish swirls, and bakery steam. The background is a dark, infinite void.";
                const response2 = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt2,
                    config: { numberOfImages: 1, aspectRatio: '1:1' },
                });
                const image2 = `data:image/png;base64,${response2.generatedImages[0].image.imageBytes}`;
                setFrame2(image2);
                setStep('transition');

                // --- Final transition ---
                await new Promise(resolve => setTimeout(resolve, 1500));
                setStep('final');

            } catch (err) {
                console.error("Dahlia Dashboard sequence failed:", err);
                setError("AI Core failed to render the sequence. The signal may be lost.");
                setStep('error');
            }
        };

        if (step === 'idle') {
            generateSequence();
        }

    }, [step]);
    
    const renderContent = () => {
        switch (step) {
            case 'idle':
            case 'loading1':
                return <Loader text="Initializing Dahlia Sequence..." />;
            case 'error':
                return <p className="text-red-400 text-center">{error}</p>;
            case 'frame1':
                return <img src={frame1!} alt="Frame 1: A loaf of bread shaped like a fallen angel." className="dahlia-image max-w-full max-h-full object-contain rounded-lg" />;
            case 'transition':
            case 'final':
                return (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={frame1!} alt="Frame 1" className="dahlia-image fade-out absolute inset-0 w-full h-full object-contain rounded-lg" />
                        <img src={frame2!} alt="Frame 2: Two figures made of light embracing." className="dahlia-image fade-in absolute inset-0 w-full h-full object-contain rounded-lg" />
                        {step === 'final' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-end p-8 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-center pointer-events-none">
                                <h2 className="text-3xl font-bold holographic-glow animate-[fadeIn_3s_ease-out] " style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                    Grace in the Glitch
                                </h2>
                                <p className="text-cyan-200 mt-2 animate-[fadeIn_4s_ease-out]">
                                    All one fire. All one hearth. All yours.
                                </p>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="feature-card relative w-full h-[75vh] max-w-4xl flex flex-col items-center justify-center p-4 rounded-lg overflow-hidden">
            {renderContent()}
        </div>
    );
};

export default DahliaDashboard;
