import { create } from 'zustand';
import { getPuter } from '@/lib/puter';

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
  content?: string;
  children?: DesktopItem[];
  x: number;
  y: number;
  deletedAt?: number;
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
  userAvatar: string | null;
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
  login: () => Promise<{ error?: string }>;
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

  savePreferences: () => Promise<void>;
  loadPreferences: () => Promise<void>;

  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;
}

const defaultDockApps: DockApp[] = [
  { id: 'files', name: 'Files', icon: '📁' },
  { id: 'terminal', name: 'Terminal', icon: '🖥️' },
  { id: 'settings', name: 'Settings', icon: '⚙️' },
  { id: 'ai', name: 'AI Assistant', icon: '🤖' },
  { id: 'texteditor', name: 'Text Editor', icon: '📝' },
  { id: 'p2p', name: 'P2P Share', icon: '📡' },
  { id: 'p2pgroup', name: 'P2P Group', icon: '🎥' },
  { id: 'sysmonitor', name: 'System Monitor', icon: '📊' },
  { id: 'trash', name: 'Trash', icon: '🗑️' },
];

const DESKTOP_DIR = '/Desktop';
const TRASH_DIR = '/Desktop/.trash';

// Helper to ensure directories exist
async function ensureDir(path: string) {
  try {
    const p = getPuter();
    await p.fs.stat(path);
  } catch {
    try {
      const p = getPuter();
      await p.fs.mkdir(path, { createMissingParents: true });
    } catch { /* already exists */ }
  }
}

// Serialize desktop item metadata to JSON
function serializeItem(item: DesktopItem): string {
  return JSON.stringify({ name: item.name, type: item.type, x: item.x, y: item.y, content: item.content || '' });
}

export const useOSStore = create<OSState>((set, get) => ({
  isLoggedIn: false,
  username: '',
  userId: null,
  userAvatar: null,
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
      const p = getPuter();
      // Check if already authenticated
      if (p.auth.isSignedIn()) {
        const user = p.auth.getUser();
        set({
          isLoggedIn: true,
          username: user?.username || 'User',
          userId: user?.uuid || user?.username || null,
          userAvatar: user?.profile_image || null,
          isAdmin: true, // Puter users have full control
          isLoading: false,
        });
        await get().loadPreferences();
        await get().loadDesktopItems();
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('initAuth error:', err);
      set({ isLoading: false });
    }
  },

  login: async () => {
    try {
      const p = getPuter();
      await p.auth.signIn();
      const user = p.auth.getUser();
      set({
        isLoggedIn: true,
        username: user?.username || 'User',
        userId: user?.uuid || user?.username || null,
        userAvatar: user?.profile_image || null,
        isAdmin: true,
        isLoading: false,
      });
      await get().loadPreferences();
      await get().loadDesktopItems();
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Sign in cancelled' };
    }
  },

  logout: async () => {
    try {
      const p = getPuter();
      await p.auth.signOut();
    } catch {}
    set({
      isLoggedIn: false, username: '', userId: null, userAvatar: null, isAdmin: false,
      windows: [], focusedWindowId: null, nextZIndex: 10, desktopItems: [], trashItems: [],
    });
  },

  setWallpaper: (wp) => {
    set({ wallpaper: wp });
    get().savePreferences();
  },
  setAccentColor: (color) => {
    set({ accentColor: color });
    get().savePreferences();
  },
  setDockAutoHide: (v) => {
    set({ dockAutoHide: v });
    get().savePreferences();
  },

  savePreferences: async () => {
    try {
      const p = getPuter();
      const prefs = {
        wallpaper: get().wallpaper,
        accentColor: get().accentColor,
        dockAutoHide: get().dockAutoHide,
      };
      await p.kv.set('desktop_preferences', JSON.stringify(prefs));
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  },

  loadPreferences: async () => {
    try {
      const p = getPuter();
      const val = await p.kv.get('desktop_preferences');
      if (val) {
        const prefs = JSON.parse(val);
        set({
          wallpaper: prefs.wallpaper || 'default',
          accentColor: prefs.accentColor || 'orange',
          dockAutoHide: prefs.dockAutoHide || false,
        });
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  },

  openWindow: (appId, title, icon, appData) => {
    const { windows, nextZIndex } = get();
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
      width: appId === 'settings' ? 900 : appId === 'texteditor' ? 600 : appId === 'ai' ? 500 : 700,
      height: appId === 'settings' ? 580 : appId === 'texteditor' ? 450 : appId === 'ai' ? 600 : 500,
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
    try {
      await ensureDir(DESKTOP_DIR);
      await ensureDir(TRASH_DIR);
      const p = getPuter();
      
      // Load desktop items
      const entries = await p.fs.readdir(DESKTOP_DIR);
      const items: DesktopItem[] = [];
      
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // skip hidden
        if (entry.is_dir) {
          // Try to read metadata
          let meta = { x: 80 + items.length * 100, y: 36 };
          try {
            const metaBlob = await p.fs.read(`${DESKTOP_DIR}/${entry.name}/.meta.json`);
            const metaText = await metaBlob.text();
            meta = { ...meta, ...JSON.parse(metaText) };
          } catch {}
          items.push({
            id: entry.name,
            name: entry.name,
            type: 'folder',
            x: meta.x,
            y: meta.y,
            children: [],
          });
        } else if (entry.name.endsWith('.meta.json')) {
          // skip meta files at root level
          continue;
        } else {
          let content = '';
          let meta = { x: 80 + items.length * 100, y: 36 };
          try {
            const blob = await p.fs.read(`${DESKTOP_DIR}/${entry.name}`);
            content = await blob.text();
          } catch {}
          try {
            const metaBlob = await p.fs.read(`${DESKTOP_DIR}/${entry.name}.meta.json`);
            const metaText = await metaBlob.text();
            meta = { ...meta, ...JSON.parse(metaText) };
          } catch {}
          items.push({
            id: entry.name,
            name: entry.name,
            type: 'note',
            content,
            x: meta.x,
            y: meta.y,
          });
        }
      }
      set({ desktopItems: items });

      // Load trash items
      try {
        const trashEntries = await p.fs.readdir(TRASH_DIR);
        const trash: TrashItem[] = [];
        for (const entry of trashEntries) {
          if (entry.name.endsWith('.meta.json')) continue;
          let content = '';
          let meta: any = { x: 0, y: 0, deletedAt: Date.now(), type: 'note', originalName: entry.name };
          try {
            const metaBlob = await p.fs.read(`${TRASH_DIR}/${entry.name}.meta.json`);
            meta = { ...meta, ...JSON.parse(await metaBlob.text()) };
          } catch {}
          if (!entry.is_dir) {
            try {
              const blob = await p.fs.read(`${TRASH_DIR}/${entry.name}`);
              content = await blob.text();
            } catch {}
          }
          trash.push({
            id: entry.name,
            name: meta.originalName || entry.name,
            type: entry.is_dir ? 'folder' : 'note',
            content,
            x: meta.x || 0,
            y: meta.y || 0,
            deletedAt: meta.deletedAt || Date.now(),
          });
        }
        set({ trashItems: trash });
      } catch {}
    } catch (err) {
      console.error('Failed to load desktop items:', err);
    }
  },

  addDesktopItem: async (item) => {
    const items = get().desktopItems;
    let x = item.x, y = item.y;
    if (x === 0 && y === 0) {
      const col = Math.floor(items.length / 8);
      const row = items.length % 8;
      x = 80 + col * 100;
      y = 36 + row * 94;
    }
    
    try {
      const p = getPuter();
      const fileName = item.name;
      
      if (item.type === 'folder') {
        await p.fs.mkdir(`${DESKTOP_DIR}/${fileName}`);
        await p.fs.write(`${DESKTOP_DIR}/${fileName}/.meta.json`, JSON.stringify({ x, y }));
      } else {
        await p.fs.write(`${DESKTOP_DIR}/${fileName}`, item.content || '');
        await p.fs.write(`${DESKTOP_DIR}/${fileName}.meta.json`, JSON.stringify({ x, y }));
      }
      
      set({
        desktopItems: [...get().desktopItems, { ...item, id: fileName, x, y }],
      });
    } catch (err) {
      console.error('Failed to add desktop item:', err);
    }
  },

  removeDesktopItem: async (id) => {
    try {
      const p = getPuter();
      await p.fs.delete(`${DESKTOP_DIR}/${id}`, { recursive: true });
      try { await p.fs.delete(`${DESKTOP_DIR}/${id}.meta.json`); } catch {}
    } catch (err) {
      console.error('Failed to remove desktop item:', err);
    }
    set({ desktopItems: get().desktopItems.filter(i => i.id !== id) });
  },

  moveToTrash: async (id) => {
    const item = get().desktopItems.find(i => i.id === id);
    if (!item) return;
    const trashItem: TrashItem = { ...item, deletedAt: Date.now() };
    
    try {
      const p = getPuter();
      // Move file to trash directory
      await p.fs.rename(`${DESKTOP_DIR}/${id}`, `${TRASH_DIR}/${id}`);
      // Save trash metadata
      await p.fs.write(`${TRASH_DIR}/${id}.meta.json`, JSON.stringify({
        originalName: item.name, x: item.x, y: item.y, deletedAt: trashItem.deletedAt, type: item.type,
      }));
      try { await p.fs.delete(`${DESKTOP_DIR}/${id}.meta.json`); } catch {}
    } catch (err) {
      console.error('Failed to move to trash:', err);
    }
    
    set({
      desktopItems: get().desktopItems.filter(i => i.id !== id),
      trashItems: [...get().trashItems, trashItem],
    });
  },

  restoreFromTrash: async (id) => {
    const trashItems = get().trashItems;
    const item = trashItems.find(t => t.id === id);
    if (!item) return;
    
    try {
      const p = getPuter();
      await p.fs.rename(`${TRASH_DIR}/${id}`, `${DESKTOP_DIR}/${id}`);
      await p.fs.write(`${DESKTOP_DIR}/${id}.meta.json`, JSON.stringify({ x: item.x, y: item.y }));
      try { await p.fs.delete(`${TRASH_DIR}/${id}.meta.json`); } catch {}
    } catch (err) {
      console.error('Failed to restore from trash:', err);
    }
    
    set({
      desktopItems: [...get().desktopItems, { ...item, deletedAt: undefined }],
      trashItems: trashItems.filter(t => t.id !== id),
    });
  },

  permanentDelete: async (id) => {
    try {
      const p = getPuter();
      await p.fs.delete(`${TRASH_DIR}/${id}`, { recursive: true });
      try { await p.fs.delete(`${TRASH_DIR}/${id}.meta.json`); } catch {}
    } catch (err) {
      console.error('Failed to permanently delete:', err);
    }
    set({ trashItems: get().trashItems.filter(t => t.id !== id) });
  },

  emptyTrash: async () => {
    const trashItems = get().trashItems;
    try {
      const p = getPuter();
      for (const item of trashItems) {
        try { await p.fs.delete(`${TRASH_DIR}/${item.id}`, { recursive: true }); } catch {}
        try { await p.fs.delete(`${TRASH_DIR}/${item.id}.meta.json`); } catch {}
      }
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
    set({ trashItems: [] });
  },

  renameDesktopItem: async (id, name) => {
    try {
      const p = getPuter();
      await p.fs.rename(`${DESKTOP_DIR}/${id}`, `${DESKTOP_DIR}/${name}`);
      // Rename meta too
      try { await p.fs.rename(`${DESKTOP_DIR}/${id}.meta.json`, `${DESKTOP_DIR}/${name}.meta.json`); } catch {}
    } catch (err) {
      console.error('Failed to rename:', err);
    }
    set({ desktopItems: get().desktopItems.map(i => i.id === id ? { ...i, id: name, name } : i) });
  },

  updateDesktopItemContent: async (id, content) => {
    try {
      const p = getPuter();
      await p.fs.write(`${DESKTOP_DIR}/${id}`, content);
    } catch (err) {
      console.error('Failed to update content:', err);
    }
    set({ desktopItems: get().desktopItems.map(i => i.id === id ? { ...i, content } : i) });
  },

  moveDesktopItem: async (id, x, y) => {
    set({ desktopItems: get().desktopItems.map(i => i.id === id ? { ...i, x, y } : i) });
    try {
      const p = getPuter();
      const item = get().desktopItems.find(i => i.id === id);
      if (item?.type === 'folder') {
        await p.fs.write(`${DESKTOP_DIR}/${id}/.meta.json`, JSON.stringify({ x, y }));
      } else {
        await p.fs.write(`${DESKTOP_DIR}/${id}.meta.json`, JSON.stringify({ x, y }));
      }
    } catch (err) {
      console.error('Failed to save position:', err);
    }
  },

  showContextMenu: (x, y, items) => set({ contextMenu: { x, y, visible: true, items } }),
  hideContextMenu: () => set({ contextMenu: { ...get().contextMenu, visible: false } }),
}));
