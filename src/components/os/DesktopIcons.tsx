import { useState, useRef } from 'react';
import { useOSStore, DesktopItem } from '@/store/os-store';

const DesktopIcons = () => {
  const desktopItems = useOSStore(s => s.desktopItems);
  const showContextMenu = useOSStore(s => s.showContextMenu);
  const removeDesktopItem = useOSStore(s => s.removeDesktopItem);
  const renameDesktopItem = useOSStore(s => s.renameDesktopItem);
  const openWindow = useOSStore(s => s.openWindow);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (item: DesktopItem) => {
    if (item.type === 'folder') {
      openWindow('files', item.name, '📁', { folderId: item.id, folderName: item.name });
    } else if (item.type === 'note') {
      openWindow('texteditor', item.name, '📝', { noteId: item.id, content: item.content || '', fileName: item.name });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: DesktopItem) => {
    e.preventDefault();
    e.stopPropagation();

    const folderItems = [
      { label: 'Open', action: () => handleDoubleClick(item) },
      { separator: true, label: '' },
      { label: 'Rename', action: () => { setRenamingId(item.id); setRenameVal(item.name); setTimeout(() => inputRef.current?.focus(), 50); } },
      { label: 'Copy', action: () => {} },
      { label: 'Cut', action: () => {} },
      { separator: true, label: '' },
      { label: 'Sync to Network', action: () => {} },
      { label: 'Permissions', action: () => {} },
      { label: 'Share With...', action: () => {} },
      { separator: true, label: '' },
      { label: 'Compress...', action: () => {} },
      { label: 'Properties', action: () => {} },
      { separator: true, label: '' },
      { label: 'Move to Trash', action: () => removeDesktopItem(item.id) },
    ];

    const noteItems = [
      { label: 'Open', action: () => handleDoubleClick(item) },
      { label: 'Open With Text Editor', action: () => handleDoubleClick(item) },
      { separator: true, label: '' },
      { label: 'Rename', action: () => { setRenamingId(item.id); setRenameVal(item.name); setTimeout(() => inputRef.current?.focus(), 50); } },
      { label: 'Copy', action: () => {} },
      { label: 'Cut', action: () => {} },
      { separator: true, label: '' },
      { label: 'Sync to Network', action: () => {} },
      { label: 'Permissions', action: () => {} },
      { label: 'Share With...', action: () => {} },
      { separator: true, label: '' },
      { label: 'Move to Trash', action: () => removeDesktopItem(item.id) },
    ];

    showContextMenu(e.clientX, e.clientY, item.type === 'folder' ? folderItems : noteItems);
  };

  const handleRenameSubmit = (id: string) => {
    if (renameVal.trim()) {
      renameDesktopItem(id, renameVal.trim());
    }
    setRenamingId(null);
  };

  // Grid layout: items arranged in columns from top-left
  const ICON_W = 90;
  const ICON_H = 90;
  const MARGIN_TOP = 36;
  const MARGIN_LEFT = 80;

  return (
    <>
      {desktopItems.map((item, index) => {
        const col = Math.floor(index / 8);
        const row = index % 8;
        const x = MARGIN_LEFT + col * (ICON_W + 10);
        const y = MARGIN_TOP + row * (ICON_H + 4);

        return (
          <div
            key={item.id}
            className="absolute flex flex-col items-center justify-center cursor-pointer group"
            style={{ left: x, top: y, width: ICON_W, height: ICON_H }}
            onDoubleClick={() => handleDoubleClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">
              {item.type === 'folder' ? '📁' : '📄'}
            </span>
            {renamingId === item.id ? (
              <input
                ref={inputRef}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={() => handleRenameSubmit(item.id)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(item.id); if (e.key === 'Escape') setRenamingId(null); }}
                className="w-full text-center text-[11px] bg-primary/30 text-foreground border border-primary rounded px-1 focus:outline-none"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="text-[11px] text-foreground text-center leading-tight px-1 rounded group-hover:bg-primary/20 transition-colors truncate max-w-full">
                {item.name}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
};

export default DesktopIcons;
