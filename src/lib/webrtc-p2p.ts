import { supabase } from '@/integrations/supabase/client';

export interface PeerInfo {
  userId: string;
  username: string;
  peerId: string;
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  progress: number;
  status: 'pending' | 'accepted' | 'transferring' | 'complete' | 'error' | 'rejected';
  direction: 'send' | 'receive';
  peerId: string;
  peerName: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

export class P2PManager {
  private peerId: string;
  private userId: string;
  private username: string;
  private presenceChannel: ReturnType<typeof supabase.channel> | null = null;
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private signalingChannels: Map<string, ReturnType<typeof supabase.channel>> = new Map();

  // Callbacks
  onPeersChanged?: (peers: PeerInfo[]) => void;
  onTransferRequest?: (transfer: FileTransfer) => void;
  onTransferProgress?: (transferId: string, progress: number) => void;
  onTransferComplete?: (transferId: string) => void;
  onTransferError?: (transferId: string, error: string) => void;
  onFileReceived?: (transferId: string, file: Blob, fileName: string) => void;

  private peers: Map<string, PeerInfo> = new Map();
  private pendingFiles: Map<string, { file: File; transferId: string }> = new Map();
  private receivingBuffers: Map<string, { chunks: ArrayBuffer[]; fileName: string; fileSize: number; received: number }> = new Map();

  constructor(userId: string, username: string) {
    this.peerId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.userId = userId;
    this.username = username;
  }

  /** Start presence discovery for logged-in users */
  startDiscovery() {
    this.presenceChannel = supabase.channel('p2p-presence', {
      config: { presence: { key: this.peerId } },
    });

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel!.presenceState();
        this.peers.clear();
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences as any[]) {
            if (p.peerId !== this.peerId) {
              this.peers.set(p.peerId, { userId: p.userId, username: p.username, peerId: p.peerId });
            }
          }
        }
        this.onPeersChanged?.(Array.from(this.peers.values()));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel!.track({
            peerId: this.peerId,
            userId: this.userId,
            username: this.username,
          });
        }
      });
  }

  /** Generate a room code for manual sharing */
  generateRoomCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  /** Join a room by code (for manual peer connection) */
  async joinRoom(roomCode: string): Promise<void> {
    const channel = supabase.channel(`p2p-room-${roomCode}`, {
      config: { presence: { key: this.peerId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        for (const [, presences] of Object.entries(state)) {
          for (const p of presences as any[]) {
            if (p.peerId !== this.peerId && !this.peers.has(p.peerId)) {
              const peer: PeerInfo = { userId: p.userId, username: p.username, peerId: p.peerId };
              this.peers.set(p.peerId, peer);
              this.onPeersChanged?.(Array.from(this.peers.values()));
            }
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            peerId: this.peerId,
            userId: this.userId,
            username: this.username,
          });
        }
      });
  }

  /** Initiate a WebRTC connection and send a file */
  async sendFile(targetPeerId: string, file: File): Promise<string> {
    const transferId = `xfer-${Date.now()}`;
    const targetPeer = this.peers.get(targetPeerId);

    // Set up signaling channel
    const sigChannel = supabase.channel(`p2p-signal-${this.peerId}-${targetPeerId}-${transferId}`);
    this.signalingChannels.set(transferId, sigChannel);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.connections.set(transferId, pc);

    // Create data channel
    const dc = pc.createDataChannel('file-transfer', { ordered: true });
    this.dataChannels.set(transferId, dc);
    this.pendingFiles.set(transferId, { file, transferId });

    dc.onopen = () => {
      // Send file metadata first
      dc.send(JSON.stringify({
        type: 'file-meta',
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      }));
      // Then send chunks
      this.sendFileChunks(dc, file, transferId);
    };

    dc.onerror = (e) => {
      this.onTransferError?.(transferId, 'Data channel error');
    };

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sigChannel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: e.candidate.toJSON(), from: this.peerId, transferId },
        });
      }
    };

    // Listen for signaling messages
    sigChannel
      .on('broadcast', { event: 'answer' }, async (msg) => {
        if (msg.payload.transferId === transferId) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.answer));
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async (msg) => {
        if (msg.payload.from !== this.peerId && msg.payload.transferId === transferId) {
          await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
        }
      })
      .subscribe();

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Notify the target peer about the incoming transfer via a broadcast channel
    const notifyChannel = supabase.channel(`p2p-notify-${targetPeerId}`);
    notifyChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        notifyChannel.send({
          type: 'broadcast',
          event: 'transfer-request',
          payload: {
            transferId,
            from: this.peerId,
            fromName: this.username,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            offer: pc.localDescription!.toJSON(),
            sigChannelName: `p2p-signal-${this.peerId}-${targetPeerId}-${transferId}`,
          },
        });
        // Cleanup notify channel after sending
        setTimeout(() => supabase.removeChannel(notifyChannel), 2000);
      }
    });

    return transferId;
  }

  private async sendFileChunks(dc: RTCDataChannel, file: File, transferId: string) {
    const buffer = await file.arrayBuffer();
    const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
    let sentChunks = 0;

    for (let offset = 0; offset < buffer.byteLength; offset += CHUNK_SIZE) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);

      // Backpressure: wait if buffered amount is too high
      while (dc.bufferedAmount > 1024 * 1024) {
        await new Promise(r => setTimeout(r, 50));
      }

      dc.send(chunk);
      sentChunks++;
      const progress = Math.round((sentChunks / totalChunks) * 100);
      this.onTransferProgress?.(transferId, progress);
    }

    // Send end-of-file marker
    dc.send(JSON.stringify({ type: 'file-end', transferId }));
    this.onTransferComplete?.(transferId);
  }

  /** Listen for incoming transfer requests */
  listenForTransfers() {
    const notifyChannel = supabase.channel(`p2p-notify-${this.peerId}`);
    notifyChannel
      .on('broadcast', { event: 'transfer-request' }, async (msg) => {
        const { transferId, from, fromName, fileName, fileSize, fileType, offer, sigChannelName } = msg.payload;

        const transfer: FileTransfer = {
          id: transferId,
          fileName,
          fileSize,
          fileType,
          progress: 0,
          status: 'pending',
          direction: 'receive',
          peerId: from,
          peerName: fromName,
        };

        this.onTransferRequest?.(transfer);

        // Auto-accept for now (can add UI confirmation later)
        this.acceptTransfer(transferId, offer, sigChannelName, from);
      })
      .subscribe();
  }

  private async acceptTransfer(transferId: string, offer: RTCSessionDescriptionInit, sigChannelName: string, fromPeerId: string) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.connections.set(transferId, pc);

    const sigChannel = supabase.channel(sigChannelName);
    this.signalingChannels.set(transferId, sigChannel);

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      this.dataChannels.set(transferId, dc);
      let metaReceived = false;

      dc.onmessage = (e) => {
        if (typeof e.data === 'string') {
          const msg = JSON.parse(e.data);
          if (msg.type === 'file-meta') {
            metaReceived = true;
            this.receivingBuffers.set(transferId, {
              chunks: [],
              fileName: msg.fileName,
              fileSize: msg.fileSize,
              received: 0,
            });
          } else if (msg.type === 'file-end') {
            const buf = this.receivingBuffers.get(transferId);
            if (buf) {
              const blob = new Blob(buf.chunks);
              this.onFileReceived?.(transferId, blob, buf.fileName);
              this.onTransferComplete?.(transferId);
              this.receivingBuffers.delete(transferId);
            }
          }
        } else {
          // Binary chunk
          const buf = this.receivingBuffers.get(transferId);
          if (buf) {
            buf.chunks.push(e.data);
            buf.received += e.data.byteLength;
            const progress = Math.round((buf.received / buf.fileSize) * 100);
            this.onTransferProgress?.(transferId, progress);
          }
        }
      };
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sigChannel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: e.candidate.toJSON(), from: this.peerId, transferId },
        });
      }
    };

    sigChannel
      .on('broadcast', { event: 'ice-candidate' }, async (msg) => {
        if (msg.payload.from !== this.peerId && msg.payload.transferId === transferId) {
          await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
        }
      })
      .subscribe();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sigChannel.send({
      type: 'broadcast',
      event: 'answer',
      payload: { answer: pc.localDescription!.toJSON(), transferId },
    });
  }

  /** Cleanup */
  destroy() {
    if (this.presenceChannel) {
      supabase.removeChannel(this.presenceChannel);
    }
    this.connections.forEach(pc => pc.close());
    this.dataChannels.forEach(dc => dc.close());
    this.signalingChannels.forEach(ch => supabase.removeChannel(ch));
    this.peers.clear();
  }

  getPeerId() { return this.peerId; }
}
