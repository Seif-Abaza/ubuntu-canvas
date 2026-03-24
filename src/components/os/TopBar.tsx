import { useOSStore } from '@/store/os-store';
import { useEffect, useState } from 'react';

const TopBar = () => {
  const [time, setTime] = useState(new Date());
  const focusedWindowId = useOSStore(s => s.focusedWindowId);
  const windows = useOSStore(s => s.windows);
  const username = useOSStore(s => s.username);
  const userAvatar = useOSStore(s => s.userAvatar);
  const openWindow = useOSStore(s => s.openWindow);
  const focusedWindow = windows.find(w => w.id === focusedWindowId);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed top-0 left-0 right-0 h-7 z-[1000] flex items-center justify-between px-3 glass-surface" style={{ background: 'hsla(0,0%,0%,0.8)' }}>
      {/* Left: Activities */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-foreground hover:text-muted-foreground cursor-pointer transition-colors">
          Activities
        </span>
        {focusedWindow && (
          <span className="text-xs text-muted-foreground">{focusedWindow.title}</span>
        )}
      </div>

      {/* Center: Clock */}
      <div className="absolute left-1/2 -translate-x-1/2 text-xs font-medium text-foreground">
        {dateStr} {timeStr}
      </div>

      {/* Right: Status + AI + User */}
      <div className="flex items-center gap-2 text-xs text-foreground">
        <button
          onClick={() => openWindow('ai', 'AI Assistant', '🤖')}
          className="hover:opacity-70 transition-opacity"
          title="AI Assistant"
        >
          🤖
        </button>
        <span>🔊</span>
        <span>📶</span>
        <span>🔋</span>
        <div className="flex items-center gap-1.5 ml-1 cursor-pointer hover:opacity-70 transition-opacity">
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-4 h-4 rounded-full" />
          ) : (
            <span className="text-[10px]">👤</span>
          )}
          <span className="text-[10px]">{username}</span>
          <span className="text-[10px]">▼</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
