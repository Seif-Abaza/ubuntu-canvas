import { useState, useEffect, useRef, useCallback } from 'react';
import { useOSStore } from '@/store/os-store';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface Peer {
  peerId: string;
  username: string;
  stream?: MediaStream;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const P2PGroupApp = () => {
  const userId = useOSStore(s => s.userId);
  const username = useOSStore(s => s.username);

  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerId = useRef(`gp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const roomChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerStreams = useRef<Map<string, MediaStream>>(new Map());

  const createRoom = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setRoomCode(code);
    joinRoom(code);
  };

  const joinRoom = useCallback(async (code: string) => {
    setRoomCode(code);
    setInRoom(true);

    // Get media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Join realtime channel for signaling + chat
      const channel = supabase.channel(`p2p-group-${code}`, {
        config: { presence: { key: peerId.current } },
      });
      roomChannel.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const currentPeers: Peer[] = [];
          for (const [, presences] of Object.entries(state)) {
            for (const p of presences as any[]) {
              if (p.peerId !== peerId.current) {
                currentPeers.push({ peerId: p.peerId, username: p.username, stream: peerStreams.current.get(p.peerId) });
              }
            }
          }
          setPeers(currentPeers);

          // Create offers to new peers
          for (const p of currentPeers) {
            if (!peerConnections.current.has(p.peerId)) {
              createPeerConnection(p.peerId, stream, channel, true);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          const pc = peerConnections.current.get(key);
          if (pc) { pc.close(); peerConnections.current.delete(key); }
          peerStreams.current.delete(key);
          setPeers(prev => prev.filter(p => p.peerId !== key));
        })
        .on('broadcast', { event: 'offer' }, async (msg) => {
          if (msg.payload.to === peerId.current) {
            await handleOffer(msg.payload.from, msg.payload.offer, stream, channel);
          }
        })
        .on('broadcast', { event: 'answer' }, async (msg) => {
          if (msg.payload.to === peerId.current) {
            const pc = peerConnections.current.get(msg.payload.from);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.answer));
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async (msg) => {
          if (msg.payload.to === peerId.current) {
            const pc = peerConnections.current.get(msg.payload.from);
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
          }
        })
        .on('broadcast', { event: 'chat' }, (msg) => {
          setMessages(prev => [...prev, msg.payload as ChatMessage]);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ peerId: peerId.current, userId, username });
          }
        });
    } catch (err: any) {
      console.error('Media error:', err);
      setInRoom(false);
    }
  }, [userId, username]);

  const createPeerConnection = (targetPeerId: string, localStream: MediaStream, channel: ReturnType<typeof supabase.channel>, initiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetPeerId, pc);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {
      const remoteStream = e.streams[0];
      peerStreams.current.set(targetPeerId, remoteStream);
      setPeers(prev => prev.map(p => p.peerId === targetPeerId ? { ...p, stream: remoteStream } : p));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({
          type: 'broadcast', event: 'ice-candidate',
          payload: { from: peerId.current, to: targetPeerId, candidate: e.candidate.toJSON() },
        });
      }
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        channel.send({
          type: 'broadcast', event: 'offer',
          payload: { from: peerId.current, to: targetPeerId, offer: offer },
        });
      });
    }

    return pc;
  };

  const handleOffer = async (fromPeerId: string, offer: RTCSessionDescriptionInit, localStream: MediaStream, channel: ReturnType<typeof supabase.channel>) => {
    const pc = createPeerConnection(fromPeerId, localStream, channel, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    channel.send({
      type: 'broadcast', event: 'answer',
      payload: { from: peerId.current, to: fromPeerId, answer: answer },
    });
  };

  const sendChat = () => {
    if (!chatInput.trim() || !roomChannel.current) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: username,
      text: chatInput.trim(),
      timestamp: Date.now(),
    };
    roomChannel.current.send({ type: 'broadcast', event: 'chat', payload: msg });
    setMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  const toggleAudio = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoEnabled(!videoEnabled);
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen sharing
      screenStream?.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setScreenSharing(false);
      
      // Re-add camera video track to all peer connections
      const cameraVideoTrack = localStream?.getVideoTracks()[0];
      if (cameraVideoTrack && localStream) {
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(cameraVideoTrack);
          }
        });
      }
    } else {
      // Start screen sharing
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ 
          video: { cursor: 'always' },
          audio: false 
        });
        
        setScreenStream(screen);
        setScreenSharing(true);
        
        const screenVideoTrack = screen.getVideoTracks()[0];
        
        // Replace video track in all peer connections with screen share
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenVideoTrack);
          }
        });
        
        // Listen for user stopping screen share via browser UI
        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err: any) {
        console.error('Screen share error:', err);
      }
    }
  };

  const leaveRoom = () => {
    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    peerStreams.current.clear();
    if (roomChannel.current) supabase.removeChannel(roomChannel.current);
    setInRoom(false);
    setLocalStream(null);
    setPeers([]);
    setMessages([]);
  };

  useEffect(() => {
    return () => { leaveRoom(); };
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!inRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <div className="text-3xl">🎥</div>
        <div className="text-sm text-foreground font-medium">P2P Group Chat</div>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Create or join a room for peer-to-peer video, audio, and text chat. No server required for media — everything goes directly between peers.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={createRoom} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-all">
            🎬 Create Room
          </button>

          <div className="text-xs text-muted-foreground text-center">or</div>

          <div className="flex gap-2">
            <input
              value={joinInput}
              onChange={e => setJoinInput(e.target.value.toUpperCase())}
              placeholder="Room code..."
              className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground text-xs font-mono tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={6}
              onKeyDown={e => e.key === 'Enter' && joinInput.trim() && joinRoom(joinInput.trim())}
            />
            <button
              onClick={() => joinInput.trim() && joinRoom(joinInput.trim())}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border text-xs" style={{ background: 'hsla(0,0%,0%,0.15)' }}>
        <div className="flex items-center gap-2">
          <span className="text-green-500">●</span>
          <span className="text-foreground font-medium">Room: </span>
          <code className="font-mono tracking-widest text-primary">{roomCode}</code>
          <span className="text-muted-foreground">({peers.length + 1} participant{peers.length !== 0 ? 's' : ''})</span>
        </div>
        <button onClick={leaveRoom} className="px-2 py-1 rounded bg-destructive/20 text-destructive text-[11px] hover:bg-destructive/30 active:scale-[0.97] transition-all">
          Leave
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Video grid */}
        <div className="flex-1 p-2 overflow-auto">
          <div className={`grid gap-2 h-full ${peers.length === 0 ? 'grid-cols-1' : peers.length <= 1 ? 'grid-cols-2' : peers.length <= 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-2'}`}>
            {/* Local video */}
            <div className="relative rounded-lg overflow-hidden bg-secondary/30 border border-border">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                autoPlay muted playsInline
              />
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-background/70 text-[10px] text-foreground">
                You ({username})
              </div>
            </div>

            {/* Remote videos */}
            {peers.map(peer => (
              <div key={peer.peerId} className="relative rounded-lg overflow-hidden bg-secondary/30 border border-border">
                <PeerVideo stream={peer.stream} />
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-background/70 text-[10px] text-foreground">
                  {peer.username}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="w-56 flex flex-col border-l border-border" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
          <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-border">
            💬 Chat
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1.5 text-xs">
            {messages.map(msg => (
              <div key={msg.id}>
                <span className="font-medium text-primary">{msg.sender}: </span>
                <span className="text-foreground">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-border">
            <div className="flex gap-1">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Type message..."
                className="flex-1 px-2 py-1.5 rounded bg-secondary/50 border border-border text-foreground text-[11px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={sendChat} className="px-2 py-1.5 rounded bg-primary text-primary-foreground text-[11px] hover:bg-primary/90 active:scale-[0.97] transition-all">
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-2 border-t border-border" style={{ background: 'hsla(0,0%,0%,0.15)' }}>
        <button onClick={toggleAudio} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${audioEnabled ? 'bg-secondary/50 text-foreground hover:bg-secondary' : 'bg-destructive/20 text-destructive'}`} title={audioEnabled ? 'Mute' : 'Unmute'}>
          {audioEnabled ? '🎤' : '🔇'}
        </button>
        <button onClick={toggleVideo} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${videoEnabled ? 'bg-secondary/50 text-foreground hover:bg-secondary' : 'bg-destructive/20 text-destructive'}`} title={videoEnabled ? 'Stop Video' : 'Start Video'}>
          {videoEnabled ? '📹' : '📷'}
        </button>
        <button 
          onClick={toggleScreenShare} 
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${screenSharing ? 'bg-primary/30 text-primary border border-primary' : 'bg-secondary/50 text-foreground hover:bg-secondary'}`} 
          title={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          🖥️
        </button>
        <button onClick={leaveRoom} className="w-9 h-9 rounded-full flex items-center justify-center text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.95] transition-all" title="Leave">
          📞
        </button>
      </div>
    </div>
  );
};

const PeerVideo = ({ stream }: { stream?: MediaStream }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return stream ? (
    <video ref={ref} className="w-full h-full object-cover" autoPlay playsInline />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
      Connecting...
    </div>
  );
};

export default P2PGroupApp;
