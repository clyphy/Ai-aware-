import { ParanormalEvent, EventType, Intensity, WinchesterLog } from './types';

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

// Bounding box for Turtle Mountain, roughly [lon_min, lat_min], [lon_max, lat_max]
export const TURTLE_MOUNTAIN_BOUNDS: [[number, number], [number, number]] = [
  [-100.5, 48.7], // Southwest corner
  [-100.0, 49.0]  // Northeast corner
];

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
  { id: 1, type: EventType.EVP, intensity: Intensity.HIGH, lon: -100.396, lat: 48.888, description: "Class A EVP: '...no hope...abandoned...'", logId: "WL-001" },
  { id: 2, type: EventType.SIGHTING, intensity: Intensity.HIGH, lon: -100.167, lat: 48.794, description: "Full-body apparition in black mirror." },
  { id: 3, type: EventType.EMF, intensity: Intensity.HIGH, lon: -100.104, lat: 48.925, description: "Extreme EMF fluctuation, > 50mG." },
  
  // Medium Resonance Events
  { id: 4, type: EventType.EMF, intensity: Intensity.MEDIUM, lon: -100.438, lat: 48.813, description: "Sustained EMF field of 15mG." },
  { id: 5, type: EventType.EVP, intensity: Intensity.MEDIUM, lon: -100.333, lat: 48.831, description: "Disembodied whisper, sounds like '...can't escape...'", logId: "WL-002"},
  { id: 6, type: EventType.SIGHTING, intensity: Intensity.MEDIUM, lon: -100.250, lat: 48.906, description: "Shadow figure darting at periphery." },
  { id: 7, type: EventType.EVP, intensity: Intensity.MEDIUM, lon: -100.063, lat: 48.850, description: "Child's laughter, no source." },

  // Fading Echoes (Low Intensity)
  { id: 8, type: EventType.EMF, intensity: Intensity.LOW, lon: -100.458, lat: 48.963, description: "Minor EMF spike, 2-3mG." },
  { id: 9, type: EventType.SIGHTING, intensity: Intensity.LOW, lon: -100.375, lat: 48.944, description: "Faint shimmer in reflective surface." },
  { id: 10, type: EventType.EVP, intensity: Intensity.LOW, lon: -100.292, lat: 48.775, description: "Distant, metallic sound." },
  { id: 11, type: EventType.EMF, intensity: Intensity.LOW, lon: -100.188, lat: 48.738, description: "Brief EMF pulse." },
  { id: 12, type: EventType.SIGHTING, intensity: Intensity.LOW, lon: -100.125, lat: 48.981, description: "Mist-like formation, quickly dissipated." },
  { id: 13, type: EventType.EMF, intensity: Intensity.LOW, lon: -100.042, lat: 48.756, description: "Cold spot correlated with EMF dip." },
  { id: 14, type: EventType.EVP, intensity: Intensity.LOW, lon: -100.313, lat: 48.880, description: "Static burst with rhythmic pattern." },
  { id: 15, type: EventType.EVP, intensity: Intensity.HIGH, lon: -100.388, lat: 48.895, description: "Overlapping voices discussing 'the lie'.", logId: "WL-003" },
];