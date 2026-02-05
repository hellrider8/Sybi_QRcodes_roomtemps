
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
    cloudProvider: 'gekko',
    ip: '',
    gekkoId: '',
    username: '',
    password: '',
    useMock: true,
    secretKey: 'sybtec-static-access-key-2024',
    rooms: [],
    sessionDurationMinutes: 15,
    minOffset: -3.0,
    maxOffset: 3.0,
    stepSize: 0.5,
    lastUpdated: 0,
    skin: 'tekko',
    customColor: '#00828c'
  };

  private currentRoomId: string = '';

  constructor() {}

  async loadConfig(): Promise<GekkoConfig> {
    try {
      const response = await fetch('/api/config?t=' + Date.now());
      if (response.ok) {
        const serverConfig = await response.json();
        this.config = { ...this.config, ...serverConfig };
      }
    } catch (e) {
      console.error("[GEKKO-SERVICE] Load Error", e);
    }
    return this.config;
  }

  updateInternalConfig(newConfig: GekkoConfig) {
    this.config = { ...newConfig };
  }

  async saveConfig() {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });
      if (!response.ok) throw new Error('Fehler beim Speichern');
      const result = await response.json();
      this.config.lastUpdated = result.lastUpdated;
    } catch (e: any) {
      console.error("[GEKKO-SERVICE] Save Error", e);
      throw e;
    }
  }

  getConfig() {
    return { ...this.config };
  }

  async setConfig(newConfig: Partial<GekkoConfig>) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  generateToken(roomId: string): string {
    const payload = JSON.stringify({ r: roomId, s: this.config.secretKey });
    const base64 = btoa(payload);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  decodeToken(token: string): { roomId: string } | null {
    try {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      const decodedStr = atob(base64);
      const data = JSON.parse(decodedStr);
      if (data.s && data.s !== this.config.secretKey) return null;
      return { roomId: data.r };
    } catch (e) { return null; }
  }

  setCurrentRoom(id: string) {
    this.currentRoomId = id;
  }

  private getUrl(path: string, customQuery: string = '') {
    let baseUrl = '';
    let authParams = '';
    
    if (this.config.apiMode === 'cloud') {
      const host = this.config.cloudProvider === 'tekko' ? 'eu1.tekko.cloud' : 'live.my-gekko.com';
      baseUrl = `https://${host}/api/v1/var`;
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
      headers['Authorization'] = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`);
    }
    return { mode: 'cors', cache: 'no-cache', headers };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (this.config.useMock) return { success: true, message: "Simulation aktiv" };
    const url = this.getUrl('/roomtemps/');
    try {
      const response = await fetch(url, this.getFetchOptions());
      if (response.ok) return { success: true, message: "Verbindung erfolgreich!" };
      return { success: false, message: `Fehler: ${response.status}` };
    } catch (e) { return { success: false, message: "Server nicht erreichbar" }; }
  }

  async discoverRooms(): Promise<DiscoveryResult> {
    if (this.config.useMock) {
      return {
        rooms: [
          { id: 'item0', name: 'Wohnzimmer (Demo)', enabled: true, category: 'DEMO' },
          { id: 'item1', name: 'Küche (Demo)', enabled: true, category: 'DEMO' }
        ],
        rawData: null, debugInfo: "Simulation"
      };
    }
    const url = this.getUrl('/roomtemps/');
    try {
      const response = await fetch(url, this.getFetchOptions());
      const rawData = await response.json();
      const items = rawData.roomtemps || rawData;
      const rooms: RoomDefinition[] = [];
      
      const processItem = (id: string, item: any) => {
        if (!item || typeof item !== 'object') return;
        const name = item.name || id;
        const stringId = String(id);
        if (name.toUpperCase().includes('GROUP') || stringId.toUpperCase().includes('GROUP')) return;
        rooms.push({ id: stringId, name, category: item.page || "RÄUME", enabled: true });
      };
      
      if (Array.isArray(items)) {
        items.forEach((it: any) => it?.id && processItem(it.id, it));
      } else {
        for (const k in items) if (!k.startsWith('_')) processItem(k, items[k]);
      }
      return { rooms, rawData, debugInfo: "Import erfolgreich" };
    } catch (e: any) {
      return { rooms: [], rawData: null, debugInfo: "Fehler", error: e.message };
    }
  }

  async fetchStatus(roomId: string = this.currentRoomId): Promise<GekkoStatus> {
    const room = this.config.rooms.find(r => r.id === roomId);
    if (this.config.useMock) {
      const mockState = Math.random();
      let bMode = 'KOMFORT';
      let soll = 21.0;
      let ist = 20.5 + Math.random();
      let regler = 20;

      if (mockState > 0.75) {
        bMode = 'AUS';
        soll = 5.0;
        regler = 0;
      } else if (mockState > 0.5) {
        bMode = 'HAND';
        soll = 30.0;
        regler = 100;
      } else if (mockState > 0.25) {
        bMode = 'ABSENK';
        soll = 17.0;
        regler = 5;
      }

      return {
        sollTemp: soll, istTemp: ist, offset: 0, reglerPercent: regler,
        ventilatorState: 0, betriebsart: bMode,
        feuchte: 30, roomName: room?.name || "Demo-Raum", category: "DEMO"
      };
    }

    const url = this.getUrl('/roomtemps/status');
    const response = await fetch(url, this.getFetchOptions());
    const allStatusData = await response.json();
    const itemData = allStatusData[roomId];
    if (!itemData) throw new Error(`Raum ${roomId} nicht im Datensatz`);
    const vals = (itemData.sumstate?.value || itemData.sumstate || "").split(';');
    
    // Mapping der Betriebsart basierend auf workingMode (index 3)
    // 1=off, 8=comfort, 16=reduced, 64=manual
    const workingModeCode = parseInt(vals[3]);
    let bMode = 'KOMFORT'; // Default
    if (workingModeCode === 1) bMode = 'AUS';
    else if (workingModeCode === 8) bMode = 'KOMFORT';
    else if (workingModeCode === 16) bMode = 'ABSENK';
    else if (workingModeCode === 64) bMode = 'HAND';

    return {
      istTemp: parseFloat(vals[0]) || 0,
      sollTemp: parseFloat(vals[1]) || 0,
      reglerPercent: Math.round(parseFloat(vals[2])) || 0,
      betriebsart: bMode,
      offset: parseFloat(vals[5]) || 0,
      feuchte: parseFloat(vals[8]) || 0,
      ventilatorState: 0, 
      roomName: itemData.name || room?.name || roomId,
      category: itemData.page || "RÄUME"
    };
  }

  async setAdjustment(newOffset: number, roomId: string = this.currentRoomId): Promise<boolean> {
    if (this.config.useMock) return true;
    const url = this.getUrl(`/roomtemps/${roomId}/scmd/set`, `value=K${newOffset.toFixed(2)}`);
    try {
      const response = await fetch(url, this.getFetchOptions());
      return response.ok;
    } catch (e) { return false; }
  }
}

export const gekkoService = new GekkoService();
