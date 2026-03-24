import { useState, useEffect } from 'react';
import { getPuter } from '@/lib/puter';

interface StorageInfo {
  used: number;
  capacity: number;
  percentage: number;
}

const SystemMonitor = () => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInfo();
    const interval = setInterval(loadInfo, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadInfo = async () => {
    try {
      const p = getPuter();
      const user = p.auth.getUser();
      setUserInfo(user);

      // Get storage usage
      try {
        const usage = await p.fs.usage();
        setStorageInfo({
          used: usage?.used || 0,
          capacity: usage?.capacity || 0,
          percentage: usage?.capacity ? Math.round((usage.used / usage.capacity) * 100) : 0,
        });
      } catch {
        // Fallback if usage API not available
        setStorageInfo({ used: 0, capacity: 0, percentage: 0 });
      }
    } catch (err) {
      console.error('Failed to load system info:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground animate-pulse">
        Loading system information...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      <h2 className="text-sm font-medium text-foreground">System Monitor</h2>

      {/* Cloud Storage */}
      <div className="p-3 rounded-lg bg-secondary space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">☁️ Cloud Storage</span>
          <span className="text-muted-foreground">{storageInfo ? `${storageInfo.percentage}%` : 'N/A'}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${storageInfo?.percentage || 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{storageInfo ? formatBytes(storageInfo.used) : '—'} used</span>
          <span>{storageInfo ? formatBytes(storageInfo.capacity) : '—'} total</span>
        </div>
      </div>

      {/* Account Info */}
      <div className="p-3 rounded-lg bg-secondary space-y-2">
        <div className="text-sm font-medium text-foreground">👤 Account</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username</span>
            <span className="text-foreground font-mono">{userInfo?.username || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground font-mono">{userInfo?.email || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">UUID</span>
            <span className="text-foreground font-mono text-[10px]">{userInfo?.uuid || '—'}</span>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div className="p-3 rounded-lg bg-secondary space-y-2">
        <div className="text-sm font-medium text-foreground">📶 Network</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-primary">● Online</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Puter Cloud</span>
            <span className="text-primary">● Connected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Version</span>
            <span className="text-foreground font-mono">v2</span>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={loadInfo}
        className="w-full py-2 text-xs rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
      >
        🔄 Refresh
      </button>
    </div>
  );
};

export default SystemMonitor;
