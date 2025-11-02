
import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect } from "react";
import { AlertTriangle, Film, Camera } from "lucide-react";
import CameraCapture from './CameraCapture';

const Loader: React.FC<{text: string}> = ({text}) => (
    <div className="flex flex-col items-center justify-center space-y-2 text-cyan-200 text-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span>{text}</span>
    </div>
);

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const LOADING_MESSAGES = [
    "Initializing temporal flux capacitor...",
    "Harmonizing visual frequencies...",
    "Rendering ethereal projection...",
    "Waiting for the signal to coalesce...",
    "This may take a few minutes. The veil is thin here."
];

const VideoGenerator: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const [resultVideo, setResultVideo] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            if (await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkKey();
    }, []);

    useEffect(() => {
        if (isLoading) {
            // FIX: The return type of setInterval in browser environments is `number`, not `NodeJS.Timeout`.
            // This refactor also prevents a potential bug with calling clearInterval on an uninitialized variable.
            const interval: number = setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = LOADING_MESSAGES.indexOf(prev);
                    return LOADING_MESSAGES[(currentIndex + 1) % LOADING_MESSAGES.length];
                });
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isLoading]);
    
    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        // Assume success after dialog opens to avoid race conditions.
        setApiKeySelected(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };
    
    const handleFile = (file: File) => {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        setResultVideo(null);
    };

    const handleSubmit = async () => {
        if (!imageFile) return;
        setIsLoading(true);
        setError(null);
        setResultVideo(null);
        setLoadingMessage(LOADING_MESSAGES[0]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const imageBase64 = await blobToBase64(imageFile);
            
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt || 'Animate this image.',
                image: {
                    imageBytes: imageBase64,
                    mimeType: imageFile.type,
                },
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: aspectRatio as any,
                }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                const videoBlob = await videoResponse.blob();
                setResultVideo(URL.createObjectURL(videoBlob));
            } else {
                throw new Error("Video generation completed, but no download link was found.");
            }
        } catch (err: any) {
            console.error(err);
            let errorMessage = 'Failed to generate video.';
            if (err.message?.includes("Requested entity was not found")) {
                errorMessage = "API Key not found or invalid. Please re-select your key.";
                setApiKeySelected(false);
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!apiKeySelected) {
        return (
            <div className="feature-card relative w-full max-w-2xl p-6 rounded-lg text-center">
                <AlertTriangle className="mx-auto w-12 h-12 text-yellow-400 mb-4" />
                <h3 className="text-xl font-bold text-yellow-300 mb-2">API Key Required</h3>
                <p className="mb-4 text-cyan-200">Video generation requires a user-selected API key. Please enable billing for your project.</p>
                <button onClick={handleSelectKey} className="holographic-button px-4 py-2 rounded-md">Select API Key</button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="block mt-3 text-sm text-cyan-400 hover:underline">
                    Learn about billing
                </a>
            </div>
        );
    }

    return (
        <>
        <div className="feature-card relative w-full max-w-4xl p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-1">1. Upload Starting Image</label>
                        <div className="flex space-x-2">
                            <input type="file" id="video-image-upload" accept="image/*" onChange={handleFileChange} className="hidden"/>
                            <label htmlFor="video-image-upload" className="holographic-button flex-grow p-2 text-center rounded-md cursor-pointer">Upload File</label>
                            <button onClick={() => setIsCameraOpen(true)} className="holographic-button p-2 rounded-md flex items-center space-x-2">
                                <Camera className="w-5 h-5"/>
                                <span>Use Camera</span>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-1">2. (Optional) Enter Prompt</label>
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., Make the clouds move, add rain..." className="holographic-textarea w-full p-2 rounded-md" rows={3}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cyan-300 mb-1">3. Select Aspect Ratio</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="holographic-select w-full p-2 rounded-md">
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                        </select>
                    </div>
                    <button onClick={handleSubmit} disabled={isLoading || !imageFile} className="holographic-button w-full p-2 rounded-md flex items-center justify-center space-x-2">
                        <Film className="w-5 h-5"/>
                        <span>{isLoading ? 'Generating...' : 'Generate Video'}</span>
                    </button>
                </div>

                <div className="flex items-center justify-center bg-black/30 border border-cyan-500/30 rounded-lg min-h-[300px] p-2">
                    {isLoading && <Loader text={loadingMessage}/>}
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    {!isLoading && !error && (resultVideo ? 
                        <video src={resultVideo} controls autoPlay loop className="max-w-full max-h-full object-contain rounded"/> :
                        (imagePreview ? 
                            <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain rounded"/> :
                            <p className="text-cyan-400/50">Output will appear here</p>)
                    )}
                </div>
            </div>
        </div>
        {isCameraOpen && (
            <CameraCapture 
                onCapture={(file) => {
                    handleFile(file);
                    setIsCameraOpen(false);
                }}
                onClose={() => setIsCameraOpen(false)}
            />
        )}
        </>
    );
};

export default VideoGenerator;
