import { create } from 'zustand';

export interface AppWindow {
  id: string;
  appId: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

export interface DockApp {
  id: string;
  name: string;
  icon: string;
}

interface OSState {
  isLoggedIn: boolean;
  username: string;
  wallpaper: string;
  accentColor: string;
  windows: AppWindow[];
  focusedWindowId: string | null;
  nextZIndex: number;
  contextMenu: { x: number; y: number; visible: boolean; items: ContextMenuItem[] };
  dockApps: DockApp[];

  login: (username: string) => void;
  logout: () => void;
  setWallpaper: (wp: string) => void;
  setAccentColor: (color: string) => void;

  openWindow: (appId: string, title: string, icon: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;

  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;
}

export interface ContextMenuItem {
  label: string;
  action?: () => void;
  separator?: boolean;
}

const defaultDockApps: DockApp[] = [
  { id: 'files', name: 'Files', icon: '📁' },
  { id: 'terminal', name: 'Terminal', icon: '🖥️' },
  { id: 'settings', name: 'Settings', icon: '⚙️' },
  { id: 'ipfs', name: 'IPFS Explorer', icon: '🌐' },
  { id: 'fabric', name: 'Fabric Network', icon: '🔗' },
];

export const useOSStore = create<OSState>((set, get) => ({
  isLoggedIn: false,
  username: '',
  wallpaper: 'default',
  accentColor: 'orange',
  windows: [],
  focusedWindowId: null,
  nextZIndex: 10,
  contextMenu: { x: 0, y: 0, visible: false, items: [] },
  dockApps: defaultDockApps,

  login: (username) => set({ isLoggedIn: true, username }),
  logout: () => set({ isLoggedIn: false, username: '', windows: [], focusedWindowId: null, nextZIndex: 10 }),
  setWallpaper: (wp) => set({ wallpaper: wp }),
  setAccentColor: (color) => set({ accentColor: color }),

  openWindow: (appId, title, icon) => {
    const { windows, nextZIndex } = get();
    const existing = windows.find(w => w.appId === appId);
    if (existing) {
      get().focusWindow(existing.id);
      if (existing.minimized) {
        set({ windows: windows.map(w => w.id === existing.id ? { ...w, minimized: false } : w) });
      }
      return;
    }
    const offset = (windows.length % 8) * 30;
    const newWindow: AppWindow = {
      id: `${appId}-${Date.now()}`,
      appId,
      title,
      icon,
      x: 120 + offset,
      y: 40 + offset,
      width: appId === 'settings' ? 900 : 700,
      height: appId === 'settings' ? 580 : 500,
      minimized: false,
      maximized: false,
      zIndex: nextZIndex,
    };
    set({ windows: [...windows, newWindow], focusedWindowId: newWindow.id, nextZIndex: nextZIndex + 1 });
  },

  closeWindow: (id) => {
    const { windows } = get();
    const remaining = windows.filter(w => w.id !== id);
    set({ windows: remaining, focusedWindowId: remaining.length > 0 ? remaining[remaining.length - 1].id : null });
  },

  focusWindow: (id) => {
    const { windows, nextZIndex } = get();
    set({
      windows: windows.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w),
      focusedWindowId: id,
      nextZIndex: nextZIndex + 1,
    });
  },

  minimizeWindow: (id) => {
    const { windows } = get();
    set({ windows: windows.map(w => w.id === id ? { ...w, minimized: true } : w), focusedWindowId: null });
  },

  toggleMaximize: (id) => {
    const { windows } = get();
    set({
      windows: windows.map(w => {
        if (w.id !== id) return w;
        if (w.maximized) return { ...w, maximized: false, x: 120, y: 40, width: 700, height: 500 };
        return { ...w, maximized: true, x: 72, y: 28, width: window.innerWidth - 72, height: window.innerHeight - 28 };
      }),
    });
  },

  moveWindow: (id, x, y) => {
    const { windows } = get();
    set({ windows: windows.map(w => w.id === id ? { ...w, x, y } : w) });
  },

  resizeWindow: (id, w, h) => {
    const { windows } = get();
    set({ windows: windows.map(win => win.id === id ? { ...win, width: w, height: h } : win) });
  },

  showContextMenu: (x, y, items) => set({ contextMenu: { x, y, visible: true, items } }),
  hideContextMenu: () => set({ contextMenu: { ...get().contextMenu, visible: false } }),
}));
