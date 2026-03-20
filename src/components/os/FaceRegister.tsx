import { useState, useRef, useEffect } from 'react';
import { loadFaceModels, detectFace } from '@/lib/face-recognition';
import { supabase } from '@/integrations/supabase/client';
import { useOSStore } from '@/store/os-store';
import { toast } from 'sonner';

const FaceRegister = () => {
  const userId = useOSStore(s => s.userId);
  const username = useOSStore(s => s.username);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'capturing' | 'registered' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    // Check if user already has a face registered
    supabase.from('face_descriptors').select('id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data) setHasExisting(true); });
  }, [userId]);

  const startCamera = async () => {
    setStatus('loading');
    setMessage('Loading models...');
    try {
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
      setMessage('Position your face and click Capture.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !userId) return;
    setStatus('capturing');
    setMessage('Detecting face...');

    const descriptor = await detectFace(videoRef.current);
    if (!descriptor) {
      setStatus('ready');
      setMessage('No face detected. Try again.');
      return;
    }

    // Convert Float32Array to regular array for JSON storage
    const descriptorArray = Array.from(descriptor);

    if (hasExisting) {
      const { error } = await supabase
        .from('face_descriptors')
        .update({ descriptor: descriptorArray as any, label: username })
        .eq('user_id', userId);
      if (error) { setStatus('error'); setMessage(error.message); return; }
    } else {
      const { error } = await supabase
        .from('face_descriptors')
        .insert({ user_id: userId, descriptor: descriptorArray as any, label: username });
      if (error) { setStatus('error'); setMessage(error.message); return; }
    }

    setStatus('registered');
    setHasExisting(true);
    setMessage('Face registered successfully! You can now use face login.');
    toast.success('Face registered!');
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const handleRemove = async () => {
    if (!userId) return;
    await supabase.from('face_descriptors').delete().eq('user_id', userId);
    setHasExisting(false);
    toast.success('Face data removed');
  };

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">Face Recognition</div>
      <p className="text-xs text-muted-foreground">
        Register your face to use face login on the lock screen.
        {hasExisting && ' ✅ Face already registered.'}
      </p>

      {status === 'idle' && (
        <div className="flex gap-2">
          <button onClick={startCamera} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.97] transition-all">
            {hasExisting ? '🔄 Re-register Face' : '📷 Register Face'}
          </button>
          {hasExisting && (
            <button onClick={handleRemove} className="px-3 py-1.5 rounded bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 active:scale-[0.97] transition-all">
              Remove Face Data
            </button>
          )}
        </div>
      )}

      {(status === 'loading' || status === 'ready' || status === 'capturing') && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative rounded-lg overflow-hidden border border-border" style={{ width: 240, height: 180 }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              autoPlay muted playsInline
            />
            {status === 'capturing' && (
              <div className="absolute inset-0 border-4 border-primary/50 animate-pulse rounded-lg" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{message}</p>
          {status === 'ready' && (
            <button onClick={handleCapture} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-[0.97] transition-all">
              📷 Capture Face
            </button>
          )}
        </div>
      )}

      {status === 'registered' && (
        <p className="text-xs text-green-500">✅ {message}</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-destructive">❌ {message}</p>
      )}
    </div>
  );
};

export default FaceRegister;
