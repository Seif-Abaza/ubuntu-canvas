import { useEffect } from 'react';
import { useOSStore, ContextMenuItem } from '@/store/os-store';

const ContextMenu = () => {
  const { contextMenu, hideContextMenu } = useOSStore();

  useEffect(() => {
    const handleClick = () => hideContextMenu();
    if (contextMenu.visible) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible, hideContextMenu]);

  if (!contextMenu.visible) return null;

  return (
    <div
      className="fixed z-[2000] w-56 py-1 rounded-lg border shadow-xl"
      style={{
        left: contextMenu.x,
        top: contextMenu.y,
        background: 'hsl(0,0%,17%)',
        borderColor: 'hsla(0,0%,100%,0.1)',
      }}
    >
      {contextMenu.items.map((item: ContextMenuItem, i: number) =>
        item.separator ? (
          <div key={i} className="my-1 h-px bg-border" />
        ) : (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              item.action?.();
              hideContextMenu();
            }}
            className="w-full text-left text-sm px-4 py-2 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
};

export default ContextMenu;
