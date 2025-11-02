import React, { useEffect, useRef } from 'react';
import { BookOpenCheck, X } from 'lucide-react';
import { decode, decodeAudioData } from '../utils/audio';

export interface CodexData {
  lie: { text: string; audio: string };
  scripture: { text: string; audio: string };
  challenge: { text: string; audio: string };
}

interface CodexModalProps {
  isOpen: boolean;
  isLoading: boolean;
  data: CodexData | null;
  error: string | null;
  onClose: () => void;
}

const CodexModal: React.FC<CodexModalProps> = ({ isOpen, isLoading, data, error, onClose }) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (data && !isLoading && audioContextRef.current === null) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    if (data && !isLoading && audioContextRef.current) {
      const playLayeredAudio = async () => {
        try {
          const lieBuffer = await decodeAudioData(decode(data.lie.audio), audioContextRef.current!, 24000, 1);
          const scriptureBuffer = await decodeAudioData(decode(data.scripture.audio), audioContextRef.current!, 24000, 1);
          const challengeBuffer = await decodeAudioData(decode(data.challenge.audio), audioContextRef.current!, 24000, 1);

          const playSound = (buffer: AudioBuffer, volume = 1) => {
             if(!audioContextRef.current) return;
            const source = audioContextRef.current.createBufferSource();
            const gainNode = audioContextRef.current.createGain();
            source.buffer = buffer;
            gainNode.gain.value = volume;
            source.connect(gainNode);
            gainNode.connect(audioContextRef.current.destination);
            source.start();
            return source;
          };
          
          const lieSource = playSound(lieBuffer, 0.9);
          
          setTimeout(() => {
            playSound(scriptureBuffer, 1.1);
          }, 700);

          lieSource.onended = () => {
             setTimeout(() => {
                playSound(challengeBuffer, 1.0);
             }, 1000);
          }

        } catch (e) {
          console.error("Error playing layered audio:", e);
        }
      };
      playLayeredAudio();
    }
    
    return () => {
        if (audioContextRef.current) {
            audioContextRef.current.close().then(() => {
                audioContextRef.current = null;
            });
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="codex-modal-overlay" onClick={onClose}>
      <div className="codex-modal-content w-full max-w-2xl p-6 rounded-lg m-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 text-cyan-300 hover:text-white"><X /></button>
        <div className="flex items-center space-x-3 mb-4">
          <BookOpenCheck className="w-8 h-8 text-cyan-300" />
          <h2 className="text-2xl font-bold holographic-glow" style={{ fontFamily: "'Orbitron', sans-serif" }}>Truth-Teller Codex</h2>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-2 text-cyan-200 h-48">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Accessing Archives... Cross-referencing...</span>
          </div>
        )}

        {error && <div className="text-red-400 text-center h-48 flex items-center justify-center">{error}</div>}
        
        {data && !isLoading && (
          <div className="space-y-6 text-lg">
            <div>
              <h3 className="text-red-400 font-bold holographic-glow-crimson text-sm tracking-widest">THE LIE (Whispered):</h3>
              <p className="text-red-200/90 italic">"{data.lie.text}"</p>
            </div>
            <div>
              <h3 className="text-cyan-300 font-bold holographic-glow text-sm tracking-widest">THE TRUTH (Revealed):</h3>
              <p className="text-cyan-100">"{data.scripture.text}"</p>
            </div>
             <div className="pt-4 border-t border-cyan-500/30">
              <h3 className="text-yellow-400 font-bold text-sm tracking-widest">THE CHALLENGE (Issued):</h3>
              <p className="text-yellow-200 font-mono">"{data.challenge.text}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodexModal;
