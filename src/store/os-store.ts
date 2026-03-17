import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

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
  userId: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  wallpaper: string;
  accentColor: string;
  windows: AppWindow[];
  focusedWindowId: string | null;
  nextZIndex: number;
  contextMenu: { x: number; y: number; visible: boolean; items: ContextMenuItem[] };
  dockApps: DockApp[];

  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
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

async function checkAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  return !!data;
}

async function getProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export const useOSStore = create<OSState>((set, get) => ({
  isLoggedIn: false,
  username: '',
  userId: null,
  isAdmin: false,
  isLoading: true,
  wallpaper: 'default',
  accentColor: 'orange',
  windows: [],
  focusedWindowId: null,
  nextZIndex: 10,
  contextMenu: { x: 0, y: 0, visible: false, items: [] },
  dockApps: defaultDockApps,

  initAuth: async () => {
    // Set up listener first
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        const admin = await checkAdmin(session.user.id);
        set({
          isLoggedIn: true,
          username: profile?.username || session.user.email || '',
          userId: session.user.id,
          isAdmin: admin,
          isLoading: false,
        });
      } else {
        set({
          isLoggedIn: false,
          username: '',
          userId: null,
          isAdmin: false,
          windows: [],
          focusedWindowId: null,
          nextZIndex: 10,
          isLoading: false,
        });
      }
    });

    // Then check existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await getProfile(session.user.id);
      const admin = await checkAdmin(session.user.id);
      set({
        isLoggedIn: true,
        username: profile?.username || session.user.email || '',
        userId: session.user.id,
        isAdmin: admin,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ isLoggedIn: false, username: '', userId: null, isAdmin: false, windows: [], focusedWindowId: null, nextZIndex: 10 });
  },

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
