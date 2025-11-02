
import React, { useState } from 'react';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import GhostMap from './components/GhostMap';
import FeatureTabs from './components/FeatureTabs';
import Chat from './components/Chat';
import ImageTools from './components/ImageTools';
import VideoGenerator from './components/VideoGenerator';
// LiveConversation is now correctly named-exported
import { LiveConversation } from './components/LiveConversation';
import CodexModal, { CodexData } from './components/CodexModal';
import MemoryScene from './components/MemoryScene';
import DahliaDashboard from './components/DahliaDashboard';
import GhostMineDeploy from './components/GhostMineDeploy';
import Oracle from './components/Oracle';
import AudioSanctum from './components/AudioSanctum';
import StewardshipReport from './components/StewardshipReport';
import { MAP_WIDTH, MAP_HEIGHT, PARANORMAL_EVENTS, WINCHESTER_LOGS } from './constants';
import { ParanormalEvent } from './types';

export type Tab = 'map' | 'chat' | 'image' | 'video' | 'live' | 'memory' | 'dahlia' | 'ghost-mine' | 'oracle' | 'sanctum' | 'stewardship';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('map');

  // State for Codex Modal
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [isCodexLoading, setIsCodexLoading] = useState(false);
  const [codexData, setCodexData] = useState<CodexData | null>(null);
  const [codexError, setCodexError] = useState<string | null>(null);

  const handleQueryCodex = async (event: ParanormalEvent) => {
    if (!event.logId) return;
    const log = WINCHESTER_LOGS.find(l => l.id === event.logId);
    if (!log) return;

    setIsCodexOpen(true);
    setIsCodexLoading(true);
    setCodexData(null);
    setCodexError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

      // 1. Get Lie/Scripture Text from Gemini Pro
      const prompt = `An EVP (Electronic Voice Phenomenon) was captured. The recording is described as: "${event.description}". This event is linked to an entry in the Winchester logs for the demon "${log.demon}". The log states the demon's typical lie is "${log.lie}" and is exposed by ${log.scriptureRef}: "${log.scripture}". Based on this, formulate the demon's specific whispered lie and reiterate the scripture. The lie should be a direct, first-person statement. Return a single, minified JSON object with keys "lie" and "scripture".`;
      
      const textResponse = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lie: { type: Type.STRING },
              scripture: { type: Type.STRING },
            },
            required: ["lie", "scripture"],
          },
        },
      });
      
      const { lie, scripture } = JSON.parse(textResponse.text);

      // 2. Get Audio from Gemini TTS
      const generateAudio = async (text: string, voiceName: 'Kore' | 'Fenrir') => {
        const audioResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            },
        });
        return audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
      };

      const [lieAudio, scriptureAudio, challengeAudio] = await Promise.all([
          generateAudio(lie, 'Kore'),
          generateAudio(scripture, 'Kore'),
          generateAudio("Name yourself or fade.", 'Fenrir')
      ]);

      setCodexData({
          lie: { text: lie, audio: lieAudio },
          scripture: { text: scripture, audio: scriptureAudio },
          challenge: { text: "Name yourself or fade.", audio: challengeAudio }
      });

    } catch (err) {
      console.error("Failed to query Codex:", err);
      setCodexError("AI Core Interface Error. Could not retrieve data from archives.");
    } finally {
      setIsCodexLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'map':
        return (
           <div 
              className="map-container relative w-full border-2 border-cyan-500/50 bg-black/30 backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,255,0.3)]"
              style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
            >
              <GhostMap 
                width={MAP_WIDTH} 
                height={MAP_HEIGHT} 
                events={PARANORMAL_EVENTS}
                onQueryCodex={handleQueryCodex}
              />
            </div>
        );
      case 'chat':
        return <Chat />;
      case 'image':
        return <ImageTools />;
      case 'video':
        return <VideoGenerator />;
      case 'live':
        return <LiveConversation />;
      case 'memory':
        return <MemoryScene />;
      case 'dahlia':
        return <DahliaDashboard />;
      case 'ghost-mine':
        return <GhostMineDeploy />;
      case 'oracle':
        return <Oracle />;
      case 'sanctum':
        return <AudioSanctum />;
      case 'stewardship':
        return <StewardshipReport />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-8 overflow-hidden">
      <header className="w-full text-center mb-4">
        <h1 className="text-3xl md:text-5xl font-bold holographic-glow" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          PROJECT CLIFTON: GHOST MAP & AI CORE
        </h1>
        <p className="text-cyan-300 text-sm md:text-base mt-2">
          Real-time Paranormal Overlay & Gemini Toolkit
        </p>
      </header>
      
      <FeatureTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-grow w-full max-w-7xl flex items-center justify-center mt-4">
        {renderContent()}
      </main>

      <footer className="w-full text-center mt-4 text-xs text-cyan-400/50">
        <p>STATUS: SYSTEM ONLINE | AI CORE: {activeTab.toUpperCase()} | LISTENING...</p>
      </footer>

      <CodexModal 
        isOpen={isCodexOpen}
        isLoading={isCodexLoading}
        data={codexData}
        error={codexError}
        onClose={() => setIsCodexOpen(false)}
      />
    </div>
  );
};

export default App;
