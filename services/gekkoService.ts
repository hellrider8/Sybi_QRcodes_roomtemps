
import { GekkoStatus, GekkoConfig, RoomDefinition } from '../types.ts';

export interface DiscoveryResult {
  rooms: RoomDefinition[];
  rawData: any;
  debugInfo: string;
  error?: string;
}

class GekkoService {
  private config: GekkoConfig = {
    apiMode: 'local',
    ip: '',
    gekkoId: '',
    username: '',
    password: '',
    useMock: true,
    secretKey: 'sybtec-static-access-key-2024',
    corsProxy: '',
    rooms: [] 
  };

  private currentRoomId: string = '';
  public lastRawStatus: string = ""; 

  constructor() {}

  async logToServer(level: 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) {
    console.log(`[${level}] ${message}`, data || '');
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, data })
      });
    } catch (e) {}
  }

  // Lädt die Config vom Server (config.json)
  async loadConfig(): Promise<GekkoConfig> {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        this.config = await response.json();
      }
    } catch (e) {
      console.error("Fehler beim Laden der Server-Config", e);
    }
    return this.config;
  }

  // Speichert die Config auf dem Server
  async saveConfig() {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });
    } catch (e) {
      console.error("Fehler beim Speichern auf Server", e);
    }
  }

  getConfig() {
    return { ...this.config };
  }

  async setConfig(newConfig: Partial<GekkoConfig>) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  // Token ist jetzt schlanker, da die API-Daten vom Server kommen
  generateToken(roomId: string): string {
    const payload = JSON.stringify({
      r: roomId,
      s: this.config.secretKey
    });
    const base64 = btoa(payload);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  decodeToken(token: string): { roomId: string } | null {
    try {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      
      const decodedStr = atob(base64);
      const data = JSON.parse(decodedStr);
      
      // Sicherheits-Check
      if (data.s && data.s !== this.config.secretKey) {
        this.logToServer('ERROR', 'Token-Schlüssel passt nicht zur Server-Config', { tokenKey: data.s });
        return null;
      }

      return { roomId: data.r };
    } catch (e: any) {
      this.logToServer('ERROR', 'Token Dekodierung fehlgeschlagen', { error: e.message });
    }
    return null;
  }

  setCurrentRoom(id: string) {
    this.currentRoomId = id;
  }

  private getUrl(path: string, customQuery: string = '') {
    let baseUrl = '';
    let authParams = '';
    
    if (this.config.apiMode === 'cloud') {
      baseUrl = `https://live.my-gekko.com/api/v1/var`;
      authParams = `username=${encodeURIComponent(this.config.username)}&key=${encodeURIComponent(this.config.password)}&gekkoid=${encodeURIComponent(this.config.gekkoId)}`;
    } else {
      baseUrl = `http://${this.config.ip}/api/v1/var`;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let finalUrl = `${baseUrl}${cleanPath}`;
    
    const queryParts: string[] = [];
    if (customQuery) queryParts.push(customQuery);
    if (this.config.apiMode === 'cloud') queryParts.push(authParams);

    if (queryParts.length > 0) {
      const connector = finalUrl.includes('?') ? '&' : '?';
      finalUrl += `${connector}${queryParts.join('&')}`;
    }
    
    return `/api/proxy?url=${encodeURIComponent(finalUrl)}`;
  }

  private getFetchOptions(): RequestInit {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (this.config.apiMode === 'local') {
      const authString = `${this.config.username}:${this.config.password}`;
      headers['Authorization'] = 'Basic ' + btoa(authString);
    }
    return { mode: 'cors', cache: 'no-cache', headers };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.config.useMock) return { success: true, message: "Simulation OK" };
    const url = this.getUrl('/roomtemps/');
    try {
      const response = await fetch(url, this.getFetchOptions());
      if (response.ok) return { success: true, message: "Verbindung erfolgreich!" };
      return { success: false, message: `Fehler: HTTP ${response.status}` };
    } catch (e: any) {
      return { success: false, message: "Server nicht erreichbar." };
    }
  }

  async discoverRooms(): Promise<DiscoveryResult> {
    if (this.config.useMock) {
      return {
        rooms: [
          { id: 'item0', name: 'Wohnzimmer', enabled: true, category: 'DEMO' },
          { id: 'item1', name: 'Küche', enabled: true, category: 'DEMO' }
        ],
        rawData: null,
        debugInfo: "Simulation"
      };
    }
    const url = this.getUrl('/roomtemps/');
    try {
      const response = await fetch(url, this.getFetchOptions());
      const rawData = await response.json();
      const items = rawData.roomtemps || rawData;
      const rooms: RoomDefinition[] = [];
      for (const id in items) {
        if (typeof items[id] === 'object' && items[id] !== null) {
          rooms.push({ id, name: items[id].name || id, category: items[id].page || "RÄUME", enabled: true });
        }
      }
      return { rooms, rawData, debugInfo: "Import erfolgreich" };
    } catch (e: any) {
      return { rooms: [], rawData: null, debugInfo: "Import fehlgeschlagen", error: e.message };
    }
  }

  async fetchStatus(roomId: string = this.currentRoomId): Promise<GekkoStatus> {
    const room = this.config.rooms.find(r => r.id === roomId);
    if (this.config.useMock) {
      return {
        sollTemp: 21.0, istTemp: 20.5 + Math.random(), offset: 0, reglerPercent: 20,
        ventilatorState: 0, hauptbetriebsart: 'AUTOMATIK', betriebsart: 'KOMFORT',
        feuchte: 50, roomName: room?.name || "Demo-Raum", category: "DEMO"
      };
    }
    const url = this.getUrl(`/roomtemps/${roomId}/status`);
    const response = await fetch(url, this.getFetchOptions());
    const data = await response.json();
    const itemData = data[roomId] || data;
    const vals = (itemData.sumstate?.value || itemData.sumstate || "").split(';');
    this.lastRawStatus = itemData.sumstate?.value || itemData.sumstate || "";
    return {
      istTemp: parseFloat(vals[0]) || 0,
      sollTemp: parseFloat(vals[1]) || 0,
      reglerPercent: Math.round(parseFloat(vals[2])) || 0,
      betriebsart: this.mapWorkingMode(vals[3]),
      offset: parseFloat(vals[5]) || 0,
      feuchte: parseFloat(vals[8]) || 0,
      ventilatorState: 0, 
      hauptbetriebsart: 'AUTOMATIK', 
      roomName: itemData.name || room?.name || roomId,
      category: itemData.page || "RÄUME"
    };
  }

  private mapWorkingMode(mode: string): string {
    const m = parseInt(mode);
    if (m === 8) return 'KOMFORT';
    if (m === 16) return 'Absenk.';
    if (m === 64) return 'MANUELL';
    return 'AUTOMATIK';
  }

  async setAdjustment(newOffset: number, roomId: string = this.currentRoomId): Promise<boolean> {
    if (this.config.useMock) return true;
    const url = this.getUrl(`/roomtemps/${roomId}/scmd/set`, `value=K${newOffset.toFixed(2)}`);
    try {
      const response = await fetch(url, this.getFetchOptions());
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}

export const gekkoService = new GekkoService();
