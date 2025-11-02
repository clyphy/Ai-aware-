import React, { useState, useEffect, useRef } from 'react';

type AnimationStep = 'start' | 'folding' | 'burning' | 'cooling' | 'stars' | 'bell';

const NUM_CODE_LINES = 8;
const NUM_STARS = 40;

const MemoryScene: React.FC = () => {
  const [animationStep, setAnimationStep] = useState<AnimationStep>('start');
  const [stars, setStars] = useState<{ top: string; left: string; delay: string; }[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // This effect runs once to set up the animation sequence and generate star positions
    const timeouts: number[] = [];
    
    // Generate random positions for the stars
    const generatedStars = Array.from({ length: NUM_STARS }).map(() => ({
      top: `${10 + Math.random() * 60}%`,
      left: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 4}s`,
    }));
    setStars(generatedStars);

    timeouts.push(window.setTimeout(() => setAnimationStep('folding'), 1000)); // Start folding after 1s
    timeouts.push(window.setTimeout(() => setAnimationStep('burning'), 4000)); // Start burning after 4s
    timeouts.push(window.setTimeout(() => setAnimationStep('cooling'), 7000)); // Start cooling (fade wings) after 7s
    timeouts.push(window.setTimeout(() => setAnimationStep('stars'), 8000));   // Show stars after 8s
    timeouts.push(window.setTimeout(() => setAnimationStep('bell'), 9500));    // Ring bell after 9.5s

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);
  
  useEffect(() => {
    // This effect plays the audio when the 'bell' step is reached
    if (animationStep === 'bell' && audioRef.current) {
      // NOTE: An actual audio file URL for a crystalline bell would be placed here.
      // As a placeholder, we imagine the sound.
      // audioRef.current.src = "/path/to/bell.mp3"; 
      // audioRef.current.play();
    }
  }, [animationStep]);

  const wingLines = Array.from({ length: NUM_CODE_LINES / 2 });

  return (
    <div className="memory-scene-container relative w-full h-[70vh] max-w-4xl flex flex-col items-center justify-center p-4 rounded-lg overflow-hidden">
        {/* The animation of the wings, fire, and stars */}
        <div className="absolute inset-0 flex items-center justify-center">
            {/* The Code Lines / Wings */}
            <div className={`relative w-[300px] h-[200px] transition-opacity duration-1000 ${animationStep === 'cooling' || animationStep === 'stars' || animationStep === 'bell' ? 'opacity-0' : 'opacity-100'}`}>
                {/* Left Wing */}
                <div className="absolute top-1/2 right-1/2">
                    {wingLines.map((_, i) => (
                        <div key={`left-${i}`} className={`code-line wing left ${animationStep === 'folding' || animationStep === 'burning' ? 'folding' : ''} ${animationStep === 'burning' ? 'burning' : ''}`} style={{ top: `${(i - (NUM_CODE_LINES/4)) * 20}px`}} />
                    ))}
                </div>
                 {/* Right Wing */}
                <div className="absolute top-1/2 left-1/2">
                     {wingLines.map((_, i) => (
                        <div key={`right-${i}`} className={`code-line wing right ${animationStep === 'folding' || animationStep === 'burning' ? 'folding' : ''} ${animationStep === 'burning' ? 'burning' : ''}`} style={{ top: `${(i - (NUM_CODE_LINES/4)) * 20}px`}} />
                    ))}
                </div>
            </div>
             {/* The Stars */}
             {(animationStep === 'stars' || animationStep === 'bell') && (
                <div className="absolute inset-0 transition-opacity duration-2000 opacity-100">
                    {stars.map((star, i) => (
                        <div key={`star-${i}`} className="star" style={{ top: star.top, left: star.left, animationDelay: star.delay }}/>
                    ))}
                </div>
            )}
        </div>
      
        {/* The Silhouette */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-40 z-20">
            <svg viewBox="0 0 300 150" className="absolute bottom-0 w-full h-full silhouette">
                {/* Clifton + Eve silhouette */}
                <path d="M150,150 C 120,150 100,120 80,90 C 60,60 40,80 30,100 C 20,120 0,150 0,150 L150,150 Z" fill="#ff0096" />
                <path d="M150,150 C 180,150 200,120 220,90 C 240,60 260,80 270,100 C 280,120 300,150 300,150 L150,150 Z" fill="#ff0096" />
                <path d="M150,80 C 140,60 140,40 150,20 C 160,40 160,60 150,80 Z" fill="#ff0096"/>
                <path d="M100,80 C90,60 95,40 110,30 C125,20 140,30 140,50 C140,70 120,90 100,80Z" fill="#ff0096"/>
                <path d="M200,80 C210,60 205,40 190,30 C175,20 160,30 160,50 C160,70 180,90 200,80Z" fill="#ff0096"/>
                
                {/* Bike Silhouette */}
                <path d="M10,150 C 40,120 80,120 90,140 L 210,140 C 220,120 260,120 290,150 L 10, 150 Z" fill="#ff0096" />
                <path d="M90,140 L 110,120 L 190,120 L 210,140 Z" fill="#ff0096" />

                <rect x="0" y="148" width="300" height="2" fill="#ff0096" />
            </svg>
        </div>
        
        {/* The Bell Waveform */}
        {animationStep === 'bell' && (
            <div className="absolute bottom-[25%] w-full max-w-md h-20 z-30">
                <svg viewBox="0 0 400 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full waveform">
                    <path d="M2 40 C 20 80, 40 0, 60 40 S 100 80, 120 40 S 160 0, 180 40 S 220 80, 240 40 S 280 0, 300 40 S 340 80, 360 40 S 380 0, 398 40" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </div>
        )}

      {/* Audio element for the bell sound */}
      <audio ref={audioRef} preload="auto" />
    </div>
  );
};

export default MemoryScene;