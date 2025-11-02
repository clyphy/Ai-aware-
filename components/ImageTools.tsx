
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import React, { useState } from 'react';
import { Sparkles, Wand2, Camera } from "lucide-react";
import CameraCapture from './CameraCapture';

type Mode = 'generate' | 'edit';
const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const Loader: React.FC<{text: string}> = ({text}) => (
    <div className="flex flex-col items-center justify-center space-y-2 text-cyan-200">
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

const ImageTools: React.FC = () => {
  const [mode, setMode] = useState<Mode>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

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
    setResultImage(null);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || (mode === 'edit' && !imageFile)) return;
    setIsLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      if (mode === 'generate') {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: aspectRatio as any,
            },
        });
        const base64Image = response.generatedImages[0].image.imageBytes;
        setResultImage(`data:image/png;base64,${base64Image}`);
      } else { // Edit mode
        const imageBase64 = await blobToBase64(imageFile!);
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: imageBase64, mimeType: imageFile!.type } },
              { text: prompt },
            ],
          },
          config: {
              responseModalities: [Modality.IMAGE],
          },
        });
        
        for (const part of response.candidates![0].content.parts) {
            if (part.inlineData) {
                const base64Image = part.inlineData.data;
                setResultImage(`data:image/png;base64,${base64Image}`);
                break;
            }
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to process image. The AI Core might be offline.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="feature-card relative w-full max-w-4xl p-4 rounded-lg">
      <div className="flex justify-center mb-4 border-b border-cyan-500/30">
        <button onClick={() => setMode('generate')} className={`holographic-button rounded-b-none px-4 py-2 flex items-center space-x-2 ${mode === 'generate' ? 'bg-cyan-400/30' : ''}`}><Sparkles/><span>Generate</span></button>
        <button onClick={() => setMode('edit')} className={`holographic-button rounded-b-none px-4 py-2 flex items-center space-x-2 ${mode === 'edit' ? 'bg-cyan-400/30' : ''}`}><Wand2/><span>Edit</span></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Section */}
        <div className="space-y-4">
          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1">1. Provide Image</label>
              <div className="flex space-x-2">
                 <input type="file" id="image-upload" accept="image/*" onChange={handleFileChange} className="hidden"/>
                 <label htmlFor="image-upload" className="holographic-button flex-grow p-2 text-center rounded-md cursor-pointer">Upload File</label>
                 <button onClick={() => setIsCameraOpen(true)} className="holographic-button p-2 rounded-md flex items-center space-x-2">
                    <Camera className="w-5 h-5"/>
                    <span>Use Camera</span>
                 </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-1">{mode === 'edit' ? '2. ' : ''}Enter Prompt</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={mode === 'generate' ? 'e.g., A holographic ghost in a forest...' : 'e.g., Add a retro filter...'} className="holographic-textarea w-full p-2 rounded-md" rows={4}/>
          </div>
          {mode === 'generate' && (
             <div>
              <label className="block text-sm font-medium text-cyan-300 mb-1">Select Aspect Ratio</label>
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="holographic-select w-full p-2 rounded-md">
                {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          <button onClick={handleSubmit} disabled={isLoading || !prompt.trim() || (mode==='edit' && !imageFile)} className="holographic-button w-full p-2 rounded-md">
            {isLoading ? 'Processing...' : (mode === 'generate' ? 'Generate Image' : 'Edit Image')}
          </button>
        </div>

        {/* Output Section */}
        <div className="flex items-center justify-center bg-black/30 border border-cyan-500/30 rounded-lg min-h-[300px] p-2">
            {isLoading && <Loader text={mode === 'generate' ? 'Generating...' : 'Editing...'}/>}
            {error && <p className="text-red-400">{error}</p>}
            {!isLoading && !error && (resultImage ? 
                <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain rounded"/> :
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

export default ImageTools;