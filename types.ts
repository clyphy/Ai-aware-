export enum EventType {
  EVP = "EVP Capture",
  EMF = "EMF Spike",
  SIGHTING = "Mirror-Ghost Sighting",
}

export enum Intensity {
  LOW = "Fading Echo",
  MEDIUM = "Resonance",
  HIGH = "High-Resonance",
}

export interface ParanormalEvent {
  id: number;
  type: EventType;
  intensity: Intensity;
  x: number; // GPS longitude mapped to X
  y: number; // GPS latitude mapped to Y
  description: string;
  logId?: string; // Link to Winchester Logs
}

export interface WinchesterLog {
  id: string;
  demon: string;
  lie: string;
  scripture: string;
  scriptureRef: string;
}
