import { useState, useRef, useEffect, useCallback } from 'react';
import { loadFaceModels, detectFace, compareFaces, FACE_MATCH_THRESHOLD } from '@/lib/face-recognition';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FaceLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const FaceLogin = ({ onSuccess, onCancel }: FaceLoginProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'scanning' | 'matched' | 'failed'>('loading');
  const [message, setMessage] = useState('Loading face recognition models...');
  const scanningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadFaceModels();
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('ready');
        setMessage('Position your face in the frame and click Scan');
      } catch (err: any) {
        if (!cancelled) {
          setStatus('failed');
          setMessage(err.message?.includes('NotAllowed') ? 'Camera access denied. Please allow camera access.' : `Error: ${err.message}`);
        }
      }
    };

    init();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const handleScan = useCallback(async () => {
    if (!videoRef.current || scanningRef.current) return;
    scanningRef.current = true;
    setStatus('scanning');
    setMessage('Scanning face...');

    try {
      const descriptor = await detectFace(videoRef.current);
      if (!descriptor) {
        setStatus('ready');
        setMessage('No face detected. Please try again.');
        scanningRef.current = false;
        return;
      }

      // Fetch all stored face descriptors
      const { data: faceRecords, error } = await supabase
        .from('face_descriptors')
        .select('user_id, descriptor, label');

      if (error || !faceRecords?.length) {
        setStatus('failed');
        setMessage('No registered faces found. Register your face first in Settings.');
        scanningRef.current = false;
        return;
      }

      // Compare against all stored descriptors
      let bestMatch: { userId: string; distance: number; label: string } | null = null;
      for (const record of faceRecords) {
        const stored = new Float32Array(Object.values(record.descriptor as Record<string, number>));
        const distance = compareFaces(descriptor, stored);
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { userId: record.user_id, distance, label: record.label };
        }
      }

      if (bestMatch && bestMatch.distance < FACE_MATCH_THRESHOLD) {
        setStatus('matched');
        setMessage(`Face matched: ${bestMatch.label}`);

        // We can't sign in with face alone — we need to use a workaround
        // Call an edge function that signs in the matched user
        const { data, error: fnError } = await supabase.functions.invoke('face-login', {
          body: { userId: bestMatch.userId },
        });

        if (fnError || !data?.access_token) {
          setStatus('failed');
          setMessage('Face matched but login failed. Try password login.');
          scanningRef.current = false;
          return;
        }

        // Set the session
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        toast.success(`Welcome back, ${bestMatch.label}!`);
        streamRef.current?.getTracks().forEach(t => t.stop());
        onSuccess();
      } else {
        setStatus('ready');
        setMessage(`No match found (distance: ${bestMatch?.distance.toFixed(3) || 'N/A'}). Try again or use password.`);
      }
    } catch (err: any) {
      setStatus('ready');
      setMessage(`Scan error: ${err.message}`);
    }
    scanningRef.current = false;
  }, [onSuccess]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-xl overflow-hidden border-2 border-border" style={{ width: 280, height: 210 }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }}
          autoPlay
          muted
          playsInline
        />
        {status === 'scanning' && (
          <div className="absolute inset-0 border-4 border-primary/50 rounded-xl animate-pulse" />
        )}
        {status === 'matched' && (
          <div className="absolute inset-0 border-4 border-green-500 rounded-xl" />
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-[280px]">{message}</p>

      <div className="flex gap-2">
        {(status === 'ready' || status === 'scanning') && (
          <button
            onClick={handleScan}
            disabled={status === 'scanning'}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {status === 'scanning' ? '🔄 Scanning...' : '📷 Scan Face'}
          </button>
        )}
        <button
          onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onCancel(); }}
          className="px-4 py-2 rounded-lg bg-secondary text-foreground text-sm hover:bg-secondary/80 active:scale-[0.97] transition-all"
        >
          Use Password
        </button>
      </div>
    </div>
  );
};

export default FaceLogin;
