
import { GekkoStatus, GekkoConfig, RoomDefinition } from '../types';

const STORAGE_KEY = 'gekko_full_config';

export interface DiscoveryResult {
  rooms: RoomDefinition[];
  rawData: any;
  debugInfo: string;
  error?: string;
}

class GekkoService {
  private config: GekkoConfig = {
    apiMode: 'local',
    ip: '192.168.1.100',
    gekkoId: '',
    username: '',
    password: '',
    useMock: true,
    corsProxy: '',
    rooms: [] 
  };

  private currentRoomId: string = '';
  public lastRawStatus: string = ""; 
  private last429Time: number = 0;
  private readonly COOLDOWN_MS = 30000;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.config = { ...this.config, ...parsed };
      } catch (e) {
        console.error("Failed to parse stored config", e);
      }
    }
  }

  saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
  }

  getConfig() {
    return { ...this.config };
  }

  setConfig(newConfig: Partial<GekkoConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.saveToStorage();
  }

  setCurrentRoom(id: string) {
    this.currentRoomId = id;
  }

  public isRateLimited(): boolean {
    if (this.last429Time === 0) return false;
    return Date.now() - this.last429Time < this.COOLDOWN_MS;
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
    
    if (this.config.corsProxy && this.config.corsProxy.trim() !== '') {
      const proxy = this.config.corsProxy.trim();
      const separator = proxy.endsWith('/') ? '' : '/';
      return `${proxy}${separator}${finalUrl}`;
    }

    return finalUrl;
  }

  private getFetchOptions(): RequestInit {
    const options: RequestInit = {
      mode: 'cors',
      cache: 'no-cache',
    };

    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
      // @ts-ignore
      options.signal = AbortSignal.timeout(10000);
    }

    if (this.config.apiMode === 'local') {
      const authString = `${this.config.username}:${this.config.password}`;
      options.headers = {
        'Authorization': 'Basic ' + btoa(authString),
        'Accept': 'application/json'
      };
    }

    return options;
  }

  async testConnection(): Promise<{ success: boolean; message: string; debugUrl?: string }> {
    if (this.config.useMock) return { success: true, message: "Simulation aktiv" };
    if (this.isRateLimited()) return { success: false, message: "429: Zu viele Anfragen (Cooldown)" };

    const url = this.getUrl('/roomtemps/');
    try {
      const response = await fetch(url, this.getFetchOptions());
      if (response.ok) return { success: true, message: "Verbindung OK", debugUrl: url };
      if (response.status === 429) {
        this.last429Time = Date.now();
        return { success: false, message: "429: Zu viele Anfragen", debugUrl: url };
      }
      return { success: false, message: `Status ${response.status}`, debugUrl: url };
    } catch (e: any) {
      return { success: false, message: e.message || "Netzwerkfehler", debugUrl: url };
    }
  }

  async discoverRooms(): Promise<DiscoveryResult> {
    if (this.config.useMock) {
      return {
        rooms: [
          { id: 'item0', name: 'Küche (Mock)', enabled: true, category: 'EG' },
          { id: 'item1', name: 'Bad (Mock)', enabled: true, category: 'OG' }
        ],
        rawData: { info: "Simulation Data" },
        debugInfo: "Simulation aktiv"
      };
    }

    if (this.isRateLimited()) return { rooms: [], rawData: null, debugInfo: "Rate Limit aktiv (429)", error: "429 (Cooldown)" };

    const url = this.getUrl('/roomtemps/');
    let rawData: any = null;
    let debugInfo = "";

    try {
      const response = await fetch(url, this.getFetchOptions());
      if (response.status === 429) {
        this.last429Time = Date.now();
        return { rooms: [], rawData: null, debugInfo, error: "429" };
      }
      if (!response.ok) return { rooms: [], rawData: null, debugInfo, error: `Fehler ${response.status}` };
      rawData = await response.json();
    } catch (e: any) {
      return { rooms: [], rawData: null, debugInfo, error: e.message };
    }
    
    const items = rawData.roomtemps ? rawData.roomtemps : rawData;
    const discoveredRooms: RoomDefinition[] = [];

    for (const id in items) {
      if (id.toLowerCase().startsWith('item')) {
        const itemData = items[id];
        discoveredRooms.push({
          id: id,
          name: itemData.name || `Raum ${id}`,
          category: itemData.page || "RÄUME",
          enabled: true
        });
      }
    }
    return { rooms: discoveredRooms, rawData, debugInfo };
  }

  private mapWorkingMode(mode: string): string {
    const m = parseInt(mode);
    switch(m) {
      case 1: return 'AUS';
      case 8: return 'KOMFORT';
      case 16: return 'Absenk.'; 
      case 64: return 'MANUELL';
      case 256: return 'STANDBY';
      default: return 'AUTOMATIK';
    }
  }

  async fetchStatus(roomId: string = this.currentRoomId): Promise<GekkoStatus> {
    const room = this.config.rooms.find(r => r.id === roomId);
    
    if (this.config.useMock) {
      return {
        sollTemp: 22.0, istTemp: 21.5, offset: 0.0, reglerPercent: 30,
        ventilatorState: 1, hauptbetriebsart: 'AUTOMATIK', betriebsart: 'KOMFORT',
        feuchte: 40, roomName: room?.name || "Mock Raum", category: room?.category || "EG"
      };
    }

    if (!roomId) throw new Error("Keine Raum-ID");
    const url = this.getUrl(`/roomtemps/${roomId}/status`);
    const response = await fetch(url, this.getFetchOptions());
    
    if (response.status === 429) {
      this.last429Time = Date.now();
      throw new Error("429");
    }

    const data = await response.json();
    const itemData = data[roomId] || data;
    const sumstateStr = itemData.sumstate?.value || itemData.sumstate || "";
    this.lastRawStatus = sumstateStr;
    
    if (!sumstateStr) {
      return {
        istTemp: 0, sollTemp: 0, reglerPercent: 0, betriebsart: 'OFFLINE',
        offset: 0, feuchte: 0, ventilatorState: 0, hauptbetriebsart: 'AUTOMATIK',
        roomName: itemData.name || room?.name || roomId, category: itemData.page || room?.category || "RÄUME"
      };
    }

    const vals = sumstateStr.split(';');
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
      category: itemData.page || room?.category || "RÄUME"
    };
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
