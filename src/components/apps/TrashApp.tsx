import { useState, useEffect } from 'react';
import { useOSStore, TrashItem } from '@/store/os-store';
import { toast } from 'sonner';

const TrashApp = () => {
  const trashItems = useOSStore(s => s.trashItems);
  const restoreFromTrash = useOSStore(s => s.restoreFromTrash);
  const permanentDelete = useOSStore(s => s.permanentDelete);
  const emptyTrash = useOSStore(s => s.emptyTrash);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelect = (id: string, multi: boolean) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (!multi) newSelected.clear();
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleRestore = async (id?: string) => {
    const idsToRestore = id ? [id] : Array.from(selectedIds);
    for (const itemId of idsToRestore) {
      await restoreFromTrash(itemId);
    }
    setSelectedIds(new Set());
    toast.success(`Restored ${idsToRestore.length} item${idsToRestore.length > 1 ? 's' : ''}`);
  };

  const handlePermanentDelete = async (id?: string) => {
    const idsToDelete = id ? [id] : Array.from(selectedIds);
    for (const itemId of idsToDelete) {
      await permanentDelete(itemId);
    }
    setSelectedIds(new Set());
    toast.success(`Permanently deleted ${idsToDelete.length} item${idsToDelete.length > 1 ? 's' : ''}`);
  };

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    await emptyTrash();
    setSelectedIds(new Set());
    toast.success('Trash emptied');
  };

  const formatDeletedTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full text-foreground text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border" style={{ background: 'hsla(0,0%,0%,0.15)' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRestore()}
            disabled={selectedIds.size === 0}
            className="px-3 py-1.5 rounded bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ↩️ Restore
          </button>
          <button
            onClick={() => handlePermanentDelete()}
            disabled={selectedIds.size === 0}
            className="px-3 py-1.5 rounded bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            🗑️ Delete
          </button>
        </div>
        <button
          onClick={handleEmptyTrash}
          disabled={trashItems.length === 0}
          className="px-3 py-1.5 rounded bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Empty Trash
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {trashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
            <span className="text-4xl mb-2">🗑️</span>
            <p className="text-xs">Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-1">
            {trashItems.map(item => (
              <div
                key={item.id}
                onClick={(e) => handleSelect(item.id, e.ctrlKey || e.metaKey)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(item.id) ? 'bg-primary/20 border border-primary' : 'hover:bg-secondary/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.type === 'folder' ? '📁' : '📄'}</span>
                  <div>
                    <div className="text-xs font-medium">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Deleted {formatDeletedTime(item.deletedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}
                    className="p-1.5 rounded hover:bg-primary/20 text-primary text-xs transition-colors"
                    title="Restore"
                  >
                    ↩️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePermanentDelete(item.id); }}
                    className="p-1.5 rounded hover:bg-destructive/20 text-destructive text-xs transition-colors"
                    title="Delete Permanently"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground" style={{ background: 'hsla(0,0%,0%,0.1)' }}>
        <span>{trashItems.length} item{trashItems.length !== 1 ? 's' : ''}</span>
        {selectedIds.size > 0 && <span>{selectedIds.size} selected</span>}
      </div>
    </div>
  );
};

export default TrashApp;
