import { useState, useRef, useCallback } from 'react';
import { useOSStore, DesktopItem } from '@/store/os-store';

const ICON_W = 90;
const ICON_H = 90;
const MARGIN_TOP = 36;
const MARGIN_LEFT = 80;
const GRID_COL_GAP = ICON_W + 10;
const GRID_ROW_GAP = ICON_H + 4;

// Clipboard state for cut/copy/paste
let clipboard: { type: 'cut' | 'copy'; item: DesktopItem } | null = null;
let clipboardListener: (() => void) | null = null;

const DesktopIcons = () => {
  const desktopItems = useOSStore(s => s.desktopItems);
  const showContextMenu = useOSStore(s => s.showContextMenu);
  const moveToTrash = useOSStore(s => s.moveToTrash);
  const renameDesktopItem = useOSStore(s => s.renameDesktopItem);
  const moveDesktopItem = useOSStore(s => s.moveDesktopItem);
  const openWindow = useOSStore(s => s.openWindow);
  const addDesktopItem = useOSStore(s => s.addDesktopItem);
  
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Force re-render when clipboard changes
  const [, forceUpdate] = useState(0);
  
  // Subscribe to clipboard changes
  useCallback(() => {
    if (clipboardListener) return;
    clipboardListener = () => forceUpdate(n => n + 1);
  }, []);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStart = useRef<{ mouseX: number; mouseY: number; itemX: number; itemY: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleDoubleClick = (item: DesktopItem) => {
    if (item.type === 'folder') {
      openWindow('files', item.name, '📁', { folderId: item.id, folderName: item.name });
    } else if (item.type === 'note') {
      openWindow('texteditor', item.name, '📝', { noteId: item.id, content: item.content || '', fileName: item.name });
    }
  };

  const handleCut = (item: DesktopItem) => {
    clipboard = { type: 'cut', item };
    if (clipboardListener) clipboardListener();
  };

  const handleCopy = (item: DesktopItem) => {
    clipboard = { type: 'copy', item };
    if (clipboardListener) clipboardListener();
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    const { type, item } = clipboard;
    
    if (type === 'cut') {
      clipboard = null;
      if (clipboardListener) clipboardListener();
    } else if (type === 'copy') {
      const newName = `${item.name} (copy)`;
      await addDesktopItem({
        id: '',
        name: newName,
        type: item.type,
        content: item.content,
        x: item.x + 20,
        y: item.y + 20,
      });
      clipboard = null;
      if (clipboardListener) clipboardListener();
    }
  };

  const handleCompress = async (item: DesktopItem) => {
    const zipContent = {
      name: `${item.name}.zip`,
      originalName: item.name,
      type: item.type,
      content: item.content,
      compressedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(zipContent, null, 2)], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleContextMenu = (e: React.MouseEvent, item: DesktopItem) => {
    e.preventDefault();
    e.stopPropagation();

    const hasClipboard = clipboard !== null;

    const folderItems = [
      { label: 'Open', action: () => handleDoubleClick(item) },
      { separator: true, label: '' },
      { label: 'Cut', action: () => handleCut(item) },
      { label: 'Copy', action: () => handleCopy(item) },
      { label: 'Paste', action: handlePaste, disabled: !hasClipboard },
      { separator: true, label: '' },
      { label: 'Rename', action: () => { setRenamingId(item.id); setRenameVal(item.name); setTimeout(() => inputRef.current?.focus(), 50); } },
      { label: 'Compress...', action: () => handleCompress(item) },
      { label: 'Share P2P', action: () => openWindow('p2p', 'P2P Share', '📡', { shareFile: { name: item.name, content: item.content || '' } }) },
      { separator: true, label: '' },
      { label: 'Properties', action: () => {} },
      { separator: true, label: '' },
      { label: 'Move to Trash', action: () => moveToTrash(item.id) },
    ];

    const noteItems = [
      { label: 'Open', action: () => handleDoubleClick(item) },
      { label: 'Open With Text Editor', action: () => handleDoubleClick(item) },
      { separator: true, label: '' },
      { label: 'Cut', action: () => handleCut(item) },
      { label: 'Copy', action: () => handleCopy(item) },
      { label: 'Paste', action: handlePaste, disabled: !hasClipboard },
      { separator: true, label: '' },
      { label: 'Rename', action: () => { setRenamingId(item.id); setRenameVal(item.name); setTimeout(() => inputRef.current?.focus(), 50); } },
      { label: 'Compress...', action: () => handleCompress(item) },
      { label: 'Share P2P', action: () => openWindow('p2p', 'P2P Share', '📡', { shareFile: { name: item.name, content: item.content || '' } }) },
      { separator: true, label: '' },
      { label: 'Move to Trash', action: () => moveToTrash(item.id) },
    ];

    showContextMenu(e.clientX, e.clientY, item.type === 'folder' ? folderItems : noteItems);
  };

  const handleRenameSubmit = (id: string) => {
    if (renameVal.trim()) {
      renameDesktopItem(id, renameVal.trim());
    }
    setRenamingId(null);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, item: DesktopItem) => {
    if (e.button !== 0) return; // only left click
    e.preventDefault();
    setDraggingId(item.id);
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, itemX: item.x, itemY: item.y };
    setDragOffset({ x: 0, y: 0 });

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      setDragOffset({
        x: ev.clientX - dragStart.current.mouseX,
        y: ev.clientY - dragStart.current.mouseY,
      });
    };

    const handleMouseUp = (ev: MouseEvent) => {
      if (dragStart.current) {
        const newX = dragStart.current.itemX + (ev.clientX - dragStart.current.mouseX);
        const newY = dragStart.current.itemY + (ev.clientY - dragStart.current.mouseY);
        // Snap to grid
        const snappedX = Math.max(0, Math.round((newX - MARGIN_LEFT) / GRID_COL_GAP) * GRID_COL_GAP + MARGIN_LEFT);
        const snappedY = Math.max(MARGIN_TOP, Math.round((newY - MARGIN_TOP) / GRID_ROW_GAP) * GRID_ROW_GAP + MARGIN_TOP);
        moveDesktopItem(item.id, snappedX, snappedY);
      }
      setDraggingId(null);
      dragStart.current = null;
      setDragOffset({ x: 0, y: 0 });
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [moveDesktopItem]);

  return (
    <>
      {desktopItems.map((item, index) => {
        // Use stored x/y, fallback to grid position for legacy items at 0,0
        let x = item.x;
        let y = item.y;
        if (x === 0 && y === 0) {
          const col = Math.floor(index / 8);
          const row = index % 8;
          x = MARGIN_LEFT + col * GRID_COL_GAP;
          y = MARGIN_TOP + row * GRID_ROW_GAP;
        }

        const isDragging = draggingId === item.id;
        const displayX = isDragging ? x + dragOffset.x : x;
        const displayY = isDragging ? y + dragOffset.y : y;

        return (
          <div
            key={item.id}
            className={`absolute flex flex-col items-center justify-center cursor-pointer group select-none ${isDragging ? 'opacity-70 z-50' : ''}`}
            style={{ left: displayX, top: displayY, width: ICON_W, height: ICON_H }}
            onMouseDown={(e) => handleMouseDown(e, item)}
            onDoubleClick={() => handleDoubleClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            <span className="text-3xl mb-1 group-hover:scale-110 transition-transform pointer-events-none">
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
                onMouseDown={e => e.stopPropagation()}
              />
            ) : (
              <span className="text-[11px] text-foreground text-center leading-tight px-1 rounded group-hover:bg-primary/20 transition-colors truncate max-w-full pointer-events-none">
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
