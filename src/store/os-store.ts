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
  appData?: Record<string, any>;
}

export interface DockApp {
  id: string;
  name: string;
  icon: string;
}

export interface DesktopItem {
  id: string;
  name: string;
  type: 'folder' | 'note';
  content?: string; // for notes
  children?: DesktopItem[]; // for folders
  x: number;
  y: number;
  deletedAt?: number; // timestamp when moved to trash, undefined if not deleted
}

export interface TrashItem extends DesktopItem {
  deletedAt: number;
}

export interface ContextMenuItem {
  label: string;
  action?: () => void;
  separator?: boolean;
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
  dockAutoHide: boolean;
  desktopItems: DesktopItem[];
  trashItems: TrashItem[];

  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  setWallpaper: (wp: string) => void;
  setAccentColor: (color: string) => void;
  setDockAutoHide: (v: boolean) => void;

  openWindow: (appId: string, title: string, icon: string, appData?: Record<string, any>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;

  loadDesktopItems: () => Promise<void>;
  addDesktopItem: (item: DesktopItem) => Promise<void>;
  removeDesktopItem: (id: string) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  renameDesktopItem: (id: string, name: string) => Promise<void>;
  updateDesktopItemContent: (id: string, content: string) => Promise<void>;
  moveDesktopItem: (id: string, x: number, y: number) => Promise<void>;

  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;
}

const defaultDockApps: DockApp[] = [
  { id: 'files', name: 'Files', icon: '📁' },
  { id: 'terminal', name: 'Terminal', icon: '🖥️' },
  { id: 'settings', name: 'Settings', icon: '⚙️' },
  { id: 'ipfs', name: 'IPFS Explorer', icon: '🌐' },
  { id: 'fabric', name: 'Fabric Network', icon: '🔗' },
  { id: 'texteditor', name: 'Text Editor', icon: '📝' },
  { id: 'p2p', name: 'P2P Share', icon: '📡' },
  { id: 'p2pgroup', name: 'P2P Group', icon: '🎥' },
  { id: 'trash', name: 'Trash', icon: '🗑️' },
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
  dockAutoHide: false,
  desktopItems: [],
  trashItems: [],

  initAuth: async () => {
    try {
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
          // Load desktop items after auth state is set
          get().loadDesktopItems();
        } else {
          set({
            isLoggedIn: false, username: '', userId: null, isAdmin: false,
            windows: [], focusedWindowId: null, nextZIndex: 10, isLoading: false,
          });
        }
      });

      // Race getSession against a timeout to prevent infinite loading
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (result && 'data' in result && result.data.session?.user) {
        const session = result.data.session;
        const profile = await getProfile(session.user.id);
        const admin = await checkAdmin(session.user.id);
        set({
          isLoggedIn: true,
          username: profile?.username || session.user.email || '',
          userId: session.user.id,
          isAdmin: admin,
          isLoading: false,
        });
        get().loadDesktopItems();
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('initAuth error:', err);
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
  setDockAutoHide: (v) => set({ dockAutoHide: v }),

  openWindow: (appId, title, icon, appData) => {
    const { windows, nextZIndex } = get();
    // For texteditor with different appData, allow multiple
    if (appId !== 'texteditor') {
      const existing = windows.find(w => w.appId === appId);
      if (existing) {
        get().focusWindow(existing.id);
        if (existing.minimized) {
          set({ windows: windows.map(w => w.id === existing.id ? { ...w, minimized: false } : w) });
        }
        return;
      }
    }
    const offset = (windows.length % 8) * 30;
    const newWindow: AppWindow = {
      id: `${appId}-${Date.now()}`,
      appId, title, icon,
      x: 120 + offset, y: 40 + offset,
      width: appId === 'settings' ? 900 : appId === 'texteditor' ? 600 : 700,
      height: appId === 'settings' ? 580 : appId === 'texteditor' ? 450 : 500,
      minimized: false, maximized: false,
      zIndex: nextZIndex,
      appData,
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
      focusedWindowId: id, nextZIndex: nextZIndex + 1,
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

  loadDesktopItems: async () => {
    const userId = get().userId;
    if (!userId) return;
    const { data } = await supabase
      .from('desktop_items')
      .select('*')
      .eq('user_id', userId);
    if (data) {
      set({
        desktopItems: data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type as 'folder' | 'note',
          content: d.content || '',
          x: d.x,
          y: d.y,
        })),
      });
    }
    // Load trash items from localStorage
    const trashKey = `trash_${userId}`;
    const trashItems = JSON.parse(localStorage.getItem(trashKey) || '[]');
    set({ trashItems });
  },

  addDesktopItem: async (item) => {
    const userId = get().userId;
    if (!userId) return;
    const items = get().desktopItems;
    let x = item.x, y = item.y;
    if (x === 0 && y === 0) {
      const col = Math.floor(items.length / 8);
      const row = items.length % 8;
      x = 80 + col * 100;
      y = 36 + row * 94;
    }
    const { data } = await supabase
      .from('desktop_items')
      .insert({ user_id: userId, name: item.name, type: item.type, content: item.content || '', x, y })
      .select()
      .single();
    if (data) {
      set({
        desktopItems: [...get().desktopItems, { id: data.id, name: data.name, type: data.type as 'folder' | 'note', content: data.content || '', x: data.x, y: data.y }],
      });
    }
  },

  removeDesktopItem: async (id) => {
    await supabase.from('desktop_items').delete().eq('id', id);
    set({ desktopItems: get().desktopItems.filter(i => i.id !== id) });
  },

  moveToTrash: async (id) => {
    const item = get().desktopItems.find(i => i.id === id);
    if (!item) return;
    // Add to trash with timestamp
    const trashItem: TrashItem = { ...item, deletedAt: Date.now() };
    set({ 
      desktopItems: get().desktopItems.filter(i => i.id !== id),
      trashItems: [...get().trashItems, trashItem]
    });
    // Store in localStorage for persistence (simple approach)
    const trashKey = `trash_${get().userId}`;
    const existingTrash = JSON.parse(localStorage.getItem(trashKey) || '[]');
    localStorage.setItem(trashKey, JSON.stringify([...existingTrash, trashItem]));
  },

  restoreFromTrash: async (id) => {
    const trashItems = get().trashItems;
    const item = trashItems.find(t => t.id === id);
    if (!item) return;
    // Restore to desktop
    const userId = get().userId;
    if (!userId) return;
    const { data } = await supabase
      .from('desktop_items')
      .insert({ user_id: userId, name: item.name, type: item.type, content: item.content || '', x: item.x, y: item.y })
      .select()
      .single();
    if (data) {
      set({
        desktopItems: [...get().desktopItems, { id: data.id, name: data.name, type: data.type as 'folder' | 'note', content: data.content || '', x: data.x, y: data.y }],
        trashItems: trashItems.filter(t => t.id !== id)
      });
      // Update localStorage
      const trashKey = `trash_${userId}`;
      const existingTrash = JSON.parse(localStorage.getItem(trashKey) || '[]');
      localStorage.setItem(trashKey, JSON.stringify(existingTrash.filter((t: any) => t.id !== id)));
    }
  },

  permanentDelete: async (id) => {
    const userId = get().userId;
    if (!userId) return;
    // Remove from database
    await supabase.from('desktop_items').delete().eq('id', id);
    // Remove from trash
    set({ trashItems: get().trashItems.filter(t => t.id !== id) });
    // Update localStorage
    const trashKey = `trash_${userId}`;
    const existingTrash = JSON.parse(localStorage.getItem(trashKey) || '[]');
    localStorage.setItem(trashKey, JSON.stringify(existingTrash.filter((t: any) => t.id !== id)));
  },

  emptyTrash: async () => {
    const userId = get().userId;
    if (!userId) return;
    const trashItems = get().trashItems;
    // Delete all from database
    const ids = trashItems.map(t => t.id);
    if (ids.length > 0) {
      await supabase.from('desktop_items').delete().in('id', ids);
    }
    set({ trashItems: [] });
    localStorage.removeItem(`trash_${userId}`);
  },

  renameDesktopItem: async (id, name) => {
    await supabase.from('desktop_items').update({ name }).eq('id', id);
    set({ desktopItems: get().desktopItems.map(i => i.id === id ? { ...i, name } : i) });
  },

  updateDesktopItemContent: async (id, content) => {
    await supabase.from('desktop_items').update({ content }).eq('id', id);
    set({ desktopItems: get().desktopItems.map(i => i.id === id ? { ...i, content } : i) });
  },

  moveDesktopItem: async (id, x, y) => {
    // Update locally immediately for responsiveness
    set({ desktopItems: get().desktopItems.map(i => i.id === id ? { ...i, x, y } : i) });
    await supabase.from('desktop_items').update({ x, y }).eq('id', id);
  },

  showContextMenu: (x, y, items) => set({ contextMenu: { x, y, visible: true, items } }),
  hideContextMenu: () => set({ contextMenu: { ...get().contextMenu, visible: false } }),
}));
