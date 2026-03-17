import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useOSStore, AppWindow } from '@/store/os-store';

const windowTransition = { type: "spring" as const, stiffness: 300, damping: 30 };
const DOCK_X = 36;
const MIN_W = 300;
const MIN_H = 200;

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

interface WindowFrameProps {
  win: AppWindow;
  children: React.ReactNode;
}

const edgeCursors: Record<string, string> = {
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
};

const WindowFrame = ({ win, children }: WindowFrameProps) => {
  const { focusWindow, closeWindow, minimizeWindow, toggleMaximize, moveWindow, resizeWindow, focusedWindowId } = useOSStore();
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; winX: number; winY: number; winW: number; winH: number; edge: ResizeEdge } | null>(null);
  const isFocused = focusedWindowId === win.id;
  const [isMinimizing, setIsMinimizing] = useState(false);

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

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, edge: ResizeEdge) => {
    e.stopPropagation();
    e.preventDefault();
    focusWindow(win.id);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y, winW: win.width, winH: win.height, edge };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const r = resizeRef.current;
      const dx = ev.clientX - r.startX;
      const dy = ev.clientY - r.startY;
      let newX = r.winX, newY = r.winY, newW = r.winW, newH = r.winH;

      if (r.edge?.includes('e')) newW = Math.max(MIN_W, r.winW + dx);
      if (r.edge?.includes('s')) newH = Math.max(MIN_H, r.winH + dy);
      if (r.edge?.includes('w')) {
        const dw = Math.min(dx, r.winW - MIN_W);
        newX = r.winX + dw;
        newW = r.winW - dw;
      }
      if (r.edge?.includes('n')) {
        const dh = Math.min(dy, r.winH - MIN_H);
        newY = r.winY + dh;
        newH = r.winH - dh;
      }

      moveWindow(win.id, newX, newY);
      resizeWindow(win.id, newW, newH);
    };
    const onMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [win.id, win.x, win.y, win.width, win.height, focusWindow, moveWindow, resizeWindow]);

  const handleMinimize = useCallback(() => {
    setIsMinimizing(true);
    setTimeout(() => {
      minimizeWindow(win.id);
      setIsMinimizing(false);
    }, 300);
  }, [win.id, minimizeWindow]);

  if (win.minimized && !isMinimizing) return null;

  // Dock target for minimize animation
  const dockApps = useOSStore.getState().dockApps;
  const dockIndex = dockApps.findIndex(a => a.id === win.appId);
  const dockTargetY = 28 + 8 + dockIndex * 52 + 24;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={isMinimizing
        ? { scale: 0.15, opacity: 0, x: DOCK_X, y: dockTargetY }
        : { scale: 1, opacity: isFocused ? 1 : 0.85, x: win.x, y: win.y }
      }
      exit={{ scale: 0, opacity: 0, y: 500 }}
      transition={isMinimizing ? { type: "spring", stiffness: 400, damping: 35 } : windowTransition}
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
      {/* Resize handles */}
      {!win.maximized && (
        <>
          {/* Edges */}
          <div onMouseDown={e => handleResizeMouseDown(e, 'n')} className="absolute top-0 left-2 right-2 h-1 z-10" style={{ cursor: edgeCursors.n }} />
          <div onMouseDown={e => handleResizeMouseDown(e, 's')} className="absolute bottom-0 left-2 right-2 h-1 z-10" style={{ cursor: edgeCursors.s }} />
          <div onMouseDown={e => handleResizeMouseDown(e, 'w')} className="absolute top-2 bottom-2 left-0 w-1 z-10" style={{ cursor: edgeCursors.w }} />
          <div onMouseDown={e => handleResizeMouseDown(e, 'e')} className="absolute top-2 bottom-2 right-0 w-1 z-10" style={{ cursor: edgeCursors.e }} />
          {/* Corners */}
          <div onMouseDown={e => handleResizeMouseDown(e, 'nw')} className="absolute top-0 left-0 w-3 h-3 z-20" style={{ cursor: edgeCursors.nw }} />
          <div onMouseDown={e => handleResizeMouseDown(e, 'ne')} className="absolute top-0 right-0 w-3 h-3 z-20" style={{ cursor: edgeCursors.ne }} />
          <div onMouseDown={e => handleResizeMouseDown(e, 'sw')} className="absolute bottom-0 left-0 w-3 h-3 z-20" style={{ cursor: edgeCursors.sw }} />
          <div onMouseDown={e => handleResizeMouseDown(e, 'se')} className="absolute bottom-0 right-0 w-3 h-3 z-20" style={{ cursor: edgeCursors.se }} />
        </>
      )}

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
            onClick={handleMinimize}
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
