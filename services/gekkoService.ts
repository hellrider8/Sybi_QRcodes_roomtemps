
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
    ip: '',
    gekkoId: '',
    username: '',
    password: '',
    useMock: true,
    corsProxy: '',
    rooms: [] 
  };

  private currentRoomId: string = '';
  public lastRawStatus: string = ""; 

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
        console.error("Failed to parse config", e);
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
    
    /**
     * NEUE LOGIK: Wenn wir im "Integrated Mode" sind (server.js), 
     * nutzen wir unseren eigenen /api/proxy Endpunkt.
     */
    if (this.config.apiMode === 'local') {
      // Wenn wir lokal auf dem Server laufen, nutzen wir den internen Pfad
      return `/api/proxy?url=${encodeURIComponent(finalUrl)}`;
    }

    // Fallback für manuelle Proxies oder Cloud
    const proxy = this.config.corsProxy?.trim();
    if (proxy && proxy.startsWith('http')) {
      const cleanProxy = proxy.endsWith('/') ? proxy : proxy + '/';
      return `${cleanProxy}${finalUrl}`;
    }

    return finalUrl;
  }

  private getFetchOptions(): RequestInit {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };

    // Im integrierten Modus brauchen wir keine speziellen Header für den Proxy,
    // da der Node-Server die Authorization für uns an das myGEKKO weiterreicht.
    if (this.config.apiMode === 'local') {
      const authString = `${this.config.username}:${this.config.password}`;
      headers['Authorization'] = 'Basic ' + btoa(authString);
    }

    return {
      mode: 'cors',
      cache: 'no-cache',
      headers
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.config.useMock) return { success: true, message: "Simulation OK" };
    
    const url = this.getUrl('/roomtemps/');
    try {
      const response = await fetch(url, this.getFetchOptions());
      if (response.ok) return { success: true, message: "Verbindung erfolgreich!" };
      return { success: false, message: `Fehler: HTTP ${response.status}` };
    } catch (e: any) {
      return { success: false, message: "Nicht erreichbar (IP im Backend korrekt?)" };
    }
  }

  async discoverRooms(): Promise<DiscoveryResult> {
    if (this.config.useMock) {
      return {
        rooms: [
          { id: 'item0', name: 'Wohnzimmer (Sim)', enabled: true, category: 'EG' },
          { id: 'item1', name: 'Küche (Sim)', enabled: true, category: 'EG' }
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
        if (id.toLowerCase().startsWith('item')) {
          rooms.push({
            id: id,
            name: items[id].name || id,
            category: items[id].page || "RÄUME",
            enabled: true
          });
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
        feuchte: 50, roomName: room?.name || "Test", category: "SIM"
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
