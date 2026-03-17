import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOSStore, AppWindow } from '@/store/os-store';

const windowTransition = { type: "spring" as const, stiffness: 300, damping: 30 };

interface WindowFrameProps {
  win: AppWindow;
  children: React.ReactNode;
}

const WindowFrame = ({ win, children }: WindowFrameProps) => {
  const { focusWindow, closeWindow, minimizeWindow, toggleMaximize, moveWindow, focusedWindowId } = useOSStore();
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const isFocused = focusedWindowId === win.id;

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    focusWindow(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      moveWindow(win.id, dragRef.current.winX + dx, dragRef.current.winY + dy);
    };
    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [win.id, win.x, win.y, focusWindow, moveWindow]);

  if (win.minimized) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: isFocused ? 1 : 0.85, x: win.x, y: win.y }}
      exit={{ scale: 0, opacity: 0, y: 500 }}
      transition={windowTransition}
      onMouseDown={() => focusWindow(win.id)}
      className="fixed rounded-window overflow-hidden window-shadow border"
      style={{
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        willChange: 'transform, opacity',
        background: 'hsl(0,0%,15%)',
        borderColor: 'hsla(0,0%,100%,0.08)',
        filter: isFocused ? 'none' : 'grayscale(5%)',
      }}
    >
      {/* Header bar */}
      <div
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={() => toggleMaximize(win.id)}
        className="h-10 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none"
        style={{ background: 'hsl(0,0%,12%)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{win.icon}</span>
          <span className="text-sm font-medium tracking-tight text-foreground">{win.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => minimizeWindow(win.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-muted-foreground hover:bg-secondary transition-colors"
          >
            ─
          </button>
          <button
            onClick={() => toggleMaximize(win.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-muted-foreground hover:bg-secondary transition-colors"
          >
            □
          </button>
          <button
            onClick={() => closeWindow(win.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto" style={{ height: win.height - 40 }}>
        {children}
      </div>
    </motion.div>
  );
};

export default WindowFrame;
