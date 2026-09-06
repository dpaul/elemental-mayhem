// Elemental Mayhem - WebRTC P2P Network Manager using PeerJS
import { Peer, DataConnection } from 'peerjs';
import { NetworkMessage } from './NetworkMessages';

export type NetworkRole = 'Host' | 'Guest' | 'None';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'error';

export class NetworkManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private role: NetworkRole = 'None';
  private roomCode: string = '';
  private status: ConnectionStatus = 'disconnected';

  private messageHandlers: ((msg: NetworkMessage) => void)[] = [];
  private statusChangeHandlers: ((status: ConnectionStatus, message?: string) => void)[] = [];
  private playerConnectedHandlers: (() => void)[] = [];
  private playerDisconnectedHandlers: (() => void)[] = [];

  public getRole(): NetworkRole {
    return this.role;
  }

  public isHost(): boolean {
    return this.role === 'Host';
  }

  public isGuest(): boolean {
    return this.role === 'Guest';
  }

  public isConnected(): boolean {
    return this.status === 'connected' && !!this.connection && this.connection.open;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(newStatus: ConnectionStatus, msg?: string): void {
    this.status = newStatus;
    this.statusChangeHandlers.forEach((h) => h(newStatus, msg));
  }

  public onMessage(handler: (msg: NetworkMessage) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  public onStatusChange(handler: (status: ConnectionStatus, message?: string) => void): () => void {
    this.statusChangeHandlers.push(handler);
    return () => {
      this.statusChangeHandlers = this.statusChangeHandlers.filter((h) => h !== handler);
    };
  }

  public onPlayerConnected(handler: () => void): () => void {
    this.playerConnectedHandlers.push(handler);
    return () => {
      this.playerConnectedHandlers = this.playerConnectedHandlers.filter((h) => h !== handler);
    };
  }

  public onPlayerDisconnected(handler: () => void): () => void {
    this.playerDisconnectedHandlers.push(handler);
    return () => {
      this.playerDisconnectedHandlers = this.playerDisconnectedHandlers.filter((h) => h !== handler);
    };
  }

  private formatPeerId(code: string): string {
    return `em-coop-v1-${code.trim().toUpperCase()}`;
  }

  public static generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `EM-${result}`;
  }

  public hostRoom(customCode?: string): Promise<string> {
    this.disconnect();
    this.role = 'Host';
    this.roomCode = customCode || NetworkManager.generateRoomCode();
    const peerId = this.formatPeerId(this.roomCode);

    this.setStatus('connecting', `Opening room ${this.roomCode}...`);

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        this.peer.on('open', () => {
          this.setStatus('waiting', `Room ready! Share code: ${this.roomCode}`);
          resolve(this.roomCode);
        });

        this.peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          const errMsg = err?.message || String(err);
          this.setStatus('error', `Host error: ${errMsg}`);
          reject(err);
        });
      } catch (e: any) {
        this.setStatus('error', e.message);
        reject(e);
      }
    });
  }

  public joinRoom(inputCode: string): Promise<void> {
    this.disconnect();
    this.role = 'Guest';
    this.roomCode = inputCode.trim().toUpperCase();
    const hostPeerId = this.formatPeerId(this.roomCode);

    this.setStatus('connecting', `Connecting to host (${this.roomCode})...`);

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        this.peer.on('open', () => {
          const conn = this.peer!.connect(hostPeerId, {
            reliable: true,
          });

          this.setupConnection(conn);

          conn.on('open', () => {
            resolve();
          });
        });

        this.peer.on('error', (err: any) => {
          const errMsg = err?.message || String(err);
          this.setStatus('error', `Connection error: ${errMsg}`);
          reject(err);
        });
      } catch (e: any) {
        this.setStatus('error', e.message);
        reject(e);
      }
    });
  }

  private setupConnection(conn: DataConnection): void {
    if (this.connection) {
      this.connection.close();
    }
    this.connection = conn;

    conn.on('open', () => {
      this.setStatus('connected', 'Allies connected! Ready for battle.');
      this.playerConnectedHandlers.forEach((h) => h());
    });

    conn.on('data', (data: unknown) => {
      if (data && typeof data === 'object' && 'type' in data) {
        const msg = data as NetworkMessage;
        this.messageHandlers.forEach((h) => h(msg));
      }
    });

    conn.on('close', () => {
      this.setStatus(this.role === 'Host' ? 'waiting' : 'disconnected', 'Ally disconnected.');
      this.playerDisconnectedHandlers.forEach((h) => h());
    });

    conn.on('error', (err: any) => {
      console.warn('[NetworkManager] Connection error:', err);
      this.setStatus('error', `Link failure: ${err?.message || err}`);
    });
  }

  public send(message: NetworkMessage): boolean {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(message);
        return true;
      } catch (err) {
        console.error('[NetworkManager] Send error:', err);
        return false;
      }
    }
    return false;
  }

  public disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.role = 'None';
    this.roomCode = '';
    this.setStatus('disconnected', 'Disconnected.');
  }
}
