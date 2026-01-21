
export interface RoomDefinition {
  id: string; 
  name: string; 
  enabled: boolean; 
  category?: string; 
}

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
  // The timestamp (in milliseconds) of when the configuration was last updated on the server.
  lastUpdated: number;
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
