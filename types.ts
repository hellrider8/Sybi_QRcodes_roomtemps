
export interface RoomDefinition {
  id: string; // Eindeutige ID (z.B. u_0_0_1)
  name: string; // Anzeigename (z.B. Wohnzimmer)
  enabled: boolean; // In der App sichtbar/nutzbar?
  category?: string; // Entspricht dem "page" Feld (z.B. EG, OG)
}

export interface GekkoConfig {
  apiMode: 'local' | 'cloud';
  ip: string;
  gekkoId: string; // Erforderlich für Cloud-Verbindung
  username: string;
  password: string; // Im Cloud-Modus ist dies der API-Key
  useMock: boolean;
  rooms: RoomDefinition[];
  adminPassword?: string;
  corsProxy?: string; // Optional: Proxy URL for CORS bypass
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
  category: string; // Entspricht dem "page" Feld in myGEKKO
}
