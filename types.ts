
export interface RoomDefinition {
  id: string; 
  name: string; 
  enabled: boolean; 
  category?: string; 
}

export type SkinType = 'tekko' | 'mygekko' | 'sybtec' | 'custom';

export interface GekkoConfig {
  apiMode: 'local' | 'cloud';
  cloudProvider: 'gekko' | 'tekko';
  ip: string;
  gekkoId: string; 
  username: string;
  password: string; 
  useMock: boolean;
  rooms: RoomDefinition[];
  adminPassword?: string;
  secretKey: string; 
  corsProxy?: string; 
  sessionDurationMinutes: number; 
  minOffset: number; 
  maxOffset: number; 
  stepSize: number;  
  lastUpdated: number;
  // Neue Skin-Optionen
  skin: SkinType;
  customColor: string;
}

export interface GekkoStatus {
  sollTemp: number;
  istTemp: number;
  offset: number;
  reglerPercent: number;
  ventilatorState: number;
  hauptbetriebsart: string;
  betriebsart: string;
  feuchte: number;
  roomName: string;
  category: string; 
}
