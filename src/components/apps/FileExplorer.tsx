import { useOSStore } from '@/store/os-store';

interface FileExplorerProps {
  folderId?: string;
  folderName?: string;
}

const FileExplorer = ({ folderId, folderName }: FileExplorerProps) => {
  const desktopItems = useOSStore(s => s.desktopItems);
  const addDesktopItem = useOSStore(s => s.addDesktopItem);
  const removeDesktopItem = useOSStore(s => s.removeDesktopItem);
  const openWindow = useOSStore(s => s.openWindow);
  const showContextMenu = useOSStore(s => s.showContextMenu);

  // Show desktop items as the root file system
  const currentItems = folderId
    ? desktopItems.find(i => i.id === folderId)?.children || []
    : desktopItems;

  const folders = [
    { name: 'Home', icon: '🏠', id: '__home' },
    { name: 'Desktop', icon: '🖥️', id: '__desktop' },
    { name: 'Documents', icon: '📄', id: '__docs' },
    { name: 'Downloads', icon: '⬇️', id: '__downloads' },
    { name: 'IPFS Pinned', icon: '📌', id: '__ipfs' },
    { name: 'Fabric Assets', icon: '🔗', id: '__fabric' },
  ];

  const handleDoubleClick = (item: typeof desktopItems[0]) => {
    if (item.type === 'folder') {
      openWindow('files', item.name, '📁', { folderId: item.id, folderName: item.name });
    } else if (item.type === 'note') {
      openWindow('texteditor', item.name, '📝', { noteId: item.id, content: item.content || '', fileName: item.name });
    }
  };

  const handleContentContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', action: () => {
        const id = `folder-${Date.now()}`;
        addDesktopItem({ id, name: 'New Folder', type: 'folder', children: [], x: 0, y: 0 });
      }},
      { label: 'New Notes', action: () => {
        const id = `note-${Date.now()}`;
        const item = { id, name: 'Untitled Note.txt', type: 'note' as const, content: '', x: 0, y: 0 };
        addDesktopItem(item);
        openWindow('texteditor', item.name, '📝', { noteId: id, content: '', fileName: item.name });
      }},
      { separator: true, label: '' },
      { label: 'Paste', action: () => {} },
      { label: 'Select All', action: () => {} },
      { separator: true, label: '' },
      { label: 'Sort by Name', action: () => {} },
      { label: 'Sort by Type', action: () => {} },
      { label: 'Sort by Size', action: () => {} },
      { separator: true, label: '' },
      { label: 'Properties', action: () => {} },
    ]);
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: typeof desktopItems[0]) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
      { label: 'Open', action: () => handleDoubleClick(item) },
      { separator: true, label: '' },
      { label: 'Cut', action: () => {} },
      { label: 'Copy', action: () => {} },
      { label: 'Rename', action: () => {} },
      { separator: true, label: '' },
      { label: 'Sync to Network', action: () => {} },
      { label: 'Permissions', action: () => {} },
      { label: 'Share With...', action: () => {} },
      { separator: true, label: '' },
      { label: 'Compress...', action: () => {} },
      { label: 'Properties', action: () => {} },
      { separator: true, label: '' },
      { label: 'Move to Trash', action: () => removeDesktopItem(item.id) },
    ]);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-48 border-r border-border py-2" style={{ background: 'hsla(0,0%,0%,0.2)' }}>
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Places</div>
        {folders.map(f => (
          <button key={f.id} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors">
            <span>{f.icon}</span>
            <span>{f.name}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border text-xs text-muted-foreground" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
          <span className="hover:text-foreground cursor-pointer">Home</span>
          <span>/</span>
          <span className="hover:text-foreground cursor-pointer">Desktop</span>
          {folderName && (
            <>
              <span>/</span>
              <span className="text-foreground">{folderName}</span>
            </>
          )}
        </div>

        {/* File grid */}
        <div className="flex-1 p-4 overflow-auto" onContextMenu={handleContentContextMenu}>
          {currentItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {folderId ? 'Empty folder' : 'No items on desktop. Right-click to create files or folders.'}
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {currentItems.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg cursor-pointer hover:bg-secondary/40 transition-colors group"
                  onDoubleClick={() => handleDoubleClick(item)}
                  onContextMenu={e => handleItemContextMenu(e, item)}
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">
                    {item.type === 'folder' ? '📁' : '📄'}
                  </span>
                  <span className="text-[11px] text-foreground text-center leading-tight truncate max-w-full">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1 border-t border-border text-[10px] text-muted-foreground" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
          <span>{currentItems.length} item{currentItems.length !== 1 ? 's' : ''}</span>
          <span>Free space: 128 GB</span>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
