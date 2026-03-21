import { useState, useEffect, useRef, useCallback } from 'react';
import { useOSStore } from '@/store/os-store';
import { P2PManager, PeerInfo, FileTransfer } from '@/lib/webrtc-p2p';
import { toast } from 'sonner';

interface P2PShareAppProps {
  shareFile?: { name: string; content: string };
}

const P2PShareApp = ({ shareFile }: P2PShareAppProps) => {
  const userId = useOSStore(s => s.userId);
  const username = useOSStore(s => s.username);
  const [manager, setManager] = useState<P2PManager | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'room'>('discover');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOverPeerId, setDragOverPeerId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !username) return;
    const mgr = new P2PManager(userId, username);

    mgr.onPeersChanged = (p) => setPeers([...p]);

    mgr.onTransferRequest = (t) => {
      setTransfers(prev => [...prev, t]);
      toast.info(`Incoming file: ${t.fileName} from ${t.peerName}`);
    };

    mgr.onTransferProgress = (id, progress) => {
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, progress, status: 'transferring' } : t));
    };

    mgr.onTransferComplete = (id) => {
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, progress: 100, status: 'complete' } : t));
    };

    mgr.onTransferError = (id, error) => {
      setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'error' } : t));
      toast.error(`Transfer failed: ${error}`);
    };

    mgr.onFileReceived = (id, blob, fileName) => {
      // Auto-download the received file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Received: ${fileName}`);
    };

    mgr.startDiscovery();
    mgr.listenForTransfers();
    setManager(mgr);

    return () => mgr.destroy();
  }, [userId, username]);

  const handleCreateRoom = () => {
    if (!manager) return;
    const code = manager.generateRoomCode();
    setRoomCode(code);
    manager.joinRoom(code);
    toast.success(`Room created: ${code}`);
  };

  const handleJoinRoom = () => {
    if (!manager || !joinCode.trim()) return;
    manager.joinRoom(joinCode.trim().toUpperCase());
    setRoomCode(joinCode.trim().toUpperCase());
    toast.success(`Joined room: ${joinCode.trim().toUpperCase()}`);
  };

  const handleSendFile = useCallback(async (peerId: string, file?: File) => {
    if (!manager) return;

    // If file is provided from drag-and-drop
    if (file) {
      const transferId = await manager.sendFile(peerId, file);
      setTransfers(prev => [...prev, {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        progress: 0,
        status: 'transferring',
        direction: 'send',
        peerId,
        peerName: peers.find(p => p.peerId === peerId)?.username || 'Peer',
      }]);
      return;
    }

    // If shareFile is provided from context menu, create a File from content
    if (shareFile) {
      const blob = new Blob([shareFile.content || ''], { type: 'text/plain' });
      const file = new File([blob], shareFile.name, { type: 'text/plain' });
      const transferId = await manager.sendFile(peerId, file);
      setTransfers(prev => [...prev, {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        progress: 0,
        status: 'transferring',
        direction: 'send',
        peerId,
        peerName: peers.find(p => p.peerId === peerId)?.username || 'Peer',
      }]);
      return;
    }

    // Otherwise open file picker
    fileInputRef.current?.click();
    fileInputRef.current!.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const transferId = await manager.sendFile(peerId, file);
      setTransfers(prev => [...prev, {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        progress: 0,
        status: 'transferring',
        direction: 'send',
        peerId,
        peerName: peers.find(p => p.peerId === peerId)?.username || 'Peer',
      }]);
    };
  }, [manager, shareFile, peers]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full text-foreground text-sm">
      <input ref={fileInputRef} type="file" className="hidden" />

      {/* Tabs */}
      <div className="flex border-b border-border" style={{ background: 'hsla(0,0%,0%,0.15)' }}>
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'discover' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          🔍 Discover Peers
        </button>
        <button
          onClick={() => setActiveTab('room')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${activeTab === 'room' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          🔑 Room Code
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {activeTab === 'room' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-border" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
              <div className="text-xs text-muted-foreground mb-2">Create a Room</div>
              <button onClick={handleCreateRoom} className="w-full px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.98] transition-all">
                Generate Room Code
              </button>
              {roomCode && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Code:</span>
                  <code className="px-2 py-1 rounded bg-secondary text-foreground font-mono text-sm tracking-widest select-all">{roomCode}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(roomCode); toast.success('Copied!'); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg border border-border" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
              <div className="text-xs text-muted-foreground mb-2">Join a Room</div>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter code..."
                  className="flex-1 px-3 py-2 rounded bg-secondary/50 border border-border text-foreground text-xs font-mono tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  maxLength={6}
                />
                <button onClick={handleJoinRoom} className="px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.98] transition-all">
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Peers */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Online Peers ({peers.length})
          </div>
          {peers.length === 0 ? (
            <div className="text-xs text-muted-foreground/60 py-4 text-center">
              {activeTab === 'discover'
                ? 'No peers found. Other logged-in users will appear here automatically.'
                : 'Waiting for peers to join the room...'}
            </div>
          ) : (
            <div className="space-y-1">
              {peers.map(peer => (
                <div
                  key={peer.peerId}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    dragOverPeerId === peer.peerId ? 'bg-primary/30 border border-primary' : 'hover:bg-secondary/30'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverPeerId(peer.peerId);
                  }}
                  onDragLeave={() => setDragOverPeerId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverPeerId(null);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleSendFile(peer.peerId, files[0]);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {peer.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs">{peer.username}</span>
                  </div>
                  <button
                    onClick={() => handleSendFile(peer.peerId)}
                    className="px-3 py-1 rounded bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 active:scale-[0.97] transition-all"
                  >
                    📤 Send File
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transfers */}
        {transfers.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Transfers</div>
            <div className="space-y-2">
              {transfers.map(t => (
                <div key={t.id} className="p-2 rounded-lg border border-border text-xs" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="truncate max-w-[60%]">{t.direction === 'send' ? '📤' : '📥'} {t.fileName}</span>
                    <span className="text-muted-foreground">{formatSize(t.fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${t.status === 'complete' ? 'bg-green-500' : t.status === 'error' ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {t.status === 'complete' ? '✓' : t.status === 'error' ? '✗' : `${t.progress}%`}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {t.direction === 'send' ? `→ ${t.peerName}` : `← ${t.peerName}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
        <span>Peer ID: {manager?.getPeerId().slice(-6) || '...'}</span>
        <span>{peers.length} peer{peers.length !== 1 ? 's' : ''} online</span>
      </div>
    </div>
  );
};

export default P2PShareApp;
