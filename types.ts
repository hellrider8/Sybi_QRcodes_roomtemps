
export interface RoomDefinition {
  id: string; 
  name: string; 
  enabled: boolean; 
  category?: string; 
}

export interface GekkoConfig {
  apiMode: 'local' | 'cloud';
  ip: string;
  gekkoId: string; 
  username: string;
  password: string; 
  useMock: boolean;
  rooms: RoomDefinition[];
  adminPassword?: string;
  secretKey: string; 
  corsProxy?: string; 
  sessionDurationMinutes: number; // Neu: Konfigurierbare Dauer
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
