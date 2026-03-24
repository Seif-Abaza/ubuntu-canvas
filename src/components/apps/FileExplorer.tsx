import { useState, useEffect } from 'react';
import { useOSStore } from '@/store/os-store';
import { getPuter } from '@/lib/puter';

interface FileEntry {
  name: string;
  is_dir: boolean;
  size?: number;
  modified?: string;
  path?: string;
}

interface FileExplorerProps {
  folderId?: string;
  folderName?: string;
}

const FileExplorer = ({ folderId, folderName }: FileExplorerProps) => {
  const openWindow = useOSStore(s => s.openWindow);
  const showContextMenu = useOSStore(s => s.showContextMenu);
  const [currentPath, setCurrentPath] = useState(folderId || '/');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const sidebarFolders = [
    { name: 'Home', icon: '🏠', path: '/' },
    { name: 'Desktop', icon: '🖥️', path: '/Desktop' },
    { name: 'Documents', icon: '📄', path: '/Documents' },
    { name: 'Downloads', icon: '⬇️', path: '/Downloads' },
    { name: 'Pictures', icon: '🖼️', path: '/Pictures' },
    { name: 'Music', icon: '🎵', path: '/Music' },
  ];

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const p = getPuter();
      // Ensure directory exists
      try { await p.fs.stat(path); } catch {
        try { await p.fs.mkdir(path, { createMissingParents: true }); } catch {}
      }
      const items = await p.fs.readdir(path);
      setEntries(
        (items || [])
          .filter((item: any) => !item.name.startsWith('.'))
          .map((item: any) => ({
            name: item.name,
            is_dir: item.is_dir,
            size: item.size || 0,
            modified: item.modified || '',
            path: item.path || `${path}/${item.name}`,
          }))
      );
    } catch (err) {
      console.error('Failed to load directory:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDoubleClick = (entry: FileEntry) => {
    if (entry.is_dir) {
      const newPath = `${currentPath === '/' ? '' : currentPath}/${entry.name}`;
      setCurrentPath(newPath);
    } else {
      // Open file in text editor
      openFile(entry);
    }
  };

  const openFile = async (entry: FileEntry) => {
    try {
      const p = getPuter();
      const filePath = `${currentPath === '/' ? '' : currentPath}/${entry.name}`;
      const blob = await p.fs.read(filePath);
      const content = await blob.text();
      openWindow('texteditor', entry.name, '📝', { noteId: filePath, content, fileName: entry.name });
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
  };

  const handleContentContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', action: async () => {
        try {
          const p = getPuter();
          const name = `New Folder ${Date.now().toString(36)}`;
          await p.fs.mkdir(`${currentPath === '/' ? '' : currentPath}/${name}`);
          loadDirectory(currentPath);
        } catch (err) { console.error(err); }
      }},
      { label: 'New File', action: async () => {
        try {
          const p = getPuter();
          const name = `Untitled ${Date.now().toString(36)}.txt`;
          await p.fs.write(`${currentPath === '/' ? '' : currentPath}/${name}`, '');
          loadDirectory(currentPath);
        } catch (err) { console.error(err); }
      }},
      { separator: true, label: '' },
      { label: 'Paste', action: () => {} },
      { label: 'Select All', action: () => {} },
      { separator: true, label: '' },
      { label: 'Refresh', action: () => loadDirectory(currentPath) },
      { separator: true, label: '' },
      { label: 'Properties', action: () => {} },
    ]);
  };

  const handleItemContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    e.stopPropagation();
    const filePath = `${currentPath === '/' ? '' : currentPath}/${entry.name}`;
    showContextMenu(e.clientX, e.clientY, [
      { label: 'Open', action: () => handleDoubleClick(entry) },
      { separator: true, label: '' },
      { label: 'Cut', action: () => {} },
      { label: 'Copy', action: () => {} },
      { label: 'Rename', action: () => {} },
      { separator: true, label: '' },
      { label: 'Share P2P', action: () => openWindow('p2p', 'P2P Share', '📡', { shareFile: { name: entry.name, content: '' } }) },
      { separator: true, label: '' },
      { label: 'Compress...', action: () => {} },
      { label: 'Properties', action: () => {} },
      { separator: true, label: '' },
      { label: 'Delete', action: async () => {
        try {
          const p = getPuter();
          await p.fs.delete(filePath, { recursive: true });
          loadDirectory(currentPath);
        } catch (err) { console.error(err); }
      }},
    ]);
  };

  const pathParts = currentPath === '/' ? ['Home'] : ['Home', ...currentPath.split('/').filter(Boolean)];

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-48 border-r border-border py-2" style={{ background: 'hsla(0,0%,0%,0.2)' }}>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Places</div>
        {sidebarFolders.map(f => (
          <button
            key={f.path}
            onClick={() => setCurrentPath(f.path)}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${currentPath === f.path ? 'bg-primary/20 text-foreground' : 'text-foreground hover:bg-secondary/50'}`}
          >
            <span>{f.icon}</span>
            <span>{f.name}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
          <button onClick={navigateUp} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors" disabled={currentPath === '/'}>
            ⬆️
          </button>
          <button onClick={() => loadDirectory(currentPath)} className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
            🔄
          </button>
          <div className="flex-1 flex items-center gap-1 text-xs text-muted-foreground ml-2">
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <span className={i === pathParts.length - 1 ? 'text-foreground' : 'hover:text-foreground cursor-pointer'}>{part}</span>
              </span>
            ))}
          </div>
        </div>

        {/* File grid */}
        <div className="flex-1 p-4 overflow-auto" onContextMenu={handleContentContextMenu}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground animate-pulse">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Empty folder. Right-click to create files or folders.
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {entries.map(entry => (
                <div
                  key={entry.name}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg cursor-pointer hover:bg-secondary/40 transition-colors group"
                  onDoubleClick={() => handleDoubleClick(entry)}
                  onContextMenu={e => handleItemContextMenu(e, entry)}
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">
                    {entry.is_dir ? '📁' : entry.name.endsWith('.html') ? '🌐' : entry.name.endsWith('.json') ? '📋' : '📄'}
                  </span>
                  <span className="text-[11px] text-foreground text-center leading-tight truncate max-w-full">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1 border-t border-border text-[10px] text-muted-foreground" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
          <span>{entries.length} item{entries.length !== 1 ? 's' : ''}</span>
          <span className="font-mono">{currentPath}</span>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
