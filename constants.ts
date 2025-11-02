import { ParanormalEvent, EventType, Intensity, WinchesterLog } from './types';

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

export const WINCHESTER_LOGS: WinchesterLog[] = [
  { 
    id: "WL-001", 
    demon: "Murmur (The Whisperer)", 
    lie: "There is no hope; you are abandoned.", 
    scripture: "Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you.", 
    scriptureRef: "Deuteronomy 31:6" 
  },
  { 
    id: "WL-002", 
    demon: "Forneus (The Deceiver)", 
    lie: "Your past defines you; you cannot escape your mistakes.", 
    scripture: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!", 
    scriptureRef: "2 Corinthians 5:17" 
  },
  {
    id: "WL-003",
    demon: "Andras (The Tempter)",
    lie: "Truth is whatever you want it to be.",
    scripture: "Then you will know the truth, and the truth will set you free.",
    scriptureRef: "John 8:32"
  }
];


export const PARANORMAL_EVENTS: ParanormalEvent[] = [
  // High-Resonance Hotspots
  { id: 1, type: EventType.EVP, intensity: Intensity.HIGH, x: 250, y: 300, description: "Class A EVP: '...no hope...abandoned...'", logId: "WL-001" },
  { id: 2, type: EventType.SIGHTING, intensity: Intensity.HIGH, x: 800, y: 550, description: "Full-body apparition in black mirror." },
  { id: 3, type: EventType.EMF, intensity: Intensity.HIGH, x: 950, y: 200, description: "Extreme EMF fluctuation, > 50mG." },
  
  // Medium Resonance Events
  { id: 4, type: EventType.EMF, intensity: Intensity.MEDIUM, x: 150, y: 500, description: "Sustained EMF field of 15mG." },
  { id: 5, type: EventType.EVP, intensity: Intensity.MEDIUM, x: 400, y: 450, description: "Disembodied whisper, sounds like '...can't escape...'", logId: "WL-002"},
  { id: 6, type: EventType.SIGHTING, intensity: Intensity.MEDIUM, x: 600, y: 250, description: "Shadow figure darting at periphery." },
  { id: 7, type: EventType.EVP, intensity: Intensity.MEDIUM, x: 1050, y: 400, description: "Child's laughter, no source." },

  // Fading Echoes (Low Intensity)
  { id: 8, type: EventType.EMF, intensity: Intensity.LOW, x: 100, y: 100, description: "Minor EMF spike, 2-3mG." },
  { id: 9, type: EventType.SIGHTING, intensity: Intensity.LOW, x: 300, y: 150, description: "Faint shimmer in reflective surface." },
  { id: 10, type: EventType.EVP, intensity: Intensity.LOW, x: 500, y: 600, description: "Distant, metallic sound." },
  { id: 11, type: EventType.EMF, intensity: Intensity.LOW, x: 750, y: 700, description: "Brief EMF pulse." },
  { id: 12, type: EventType.SIGHTING, intensity: Intensity.LOW, x: 900, y: 50, description: "Mist-like formation, quickly dissipated." },
  { id: 13, type: EventType.EMF, intensity: Intensity.LOW, x: 1100, y: 650, description: "Cold spot correlated with EMF dip." },
  { id: 14, type: EventType.EVP, intensity: Intensity.LOW, x: 450, y: 320, description: "Static burst with rhythmic pattern." },
  // FIX: Removed duplicate 'intensity' property.
  { id: 15, type: EventType.EVP, intensity: Intensity.HIGH, x: 270, y: 280, description: "Overlapping voices discussing 'the lie'.", logId: "WL-003" },
];