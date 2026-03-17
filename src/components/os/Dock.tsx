import { useOSStore } from '@/store/os-store';
import { motion } from 'framer-motion';

const Dock = () => {
  const dockApps = useOSStore(s => s.dockApps);
  const windows = useOSStore(s => s.windows);
  const openWindow = useOSStore(s => s.openWindow);
  const focusWindow = useOSStore(s => s.focusWindow);

  const handleClick = (app: typeof dockApps[0]) => {
    const existing = windows.find(w => w.appId === app.id);
    if (existing) {
      focusWindow(existing.id);
    } else {
      openWindow(app.id, app.name, app.icon);
    }
  };

  const isOpen = (appId: string) => windows.some(w => w.appId === appId && !w.minimized);

  return (
    <div className="fixed left-0 top-7 bottom-0 w-[72px] z-[999] flex flex-col items-center py-2 gap-1 glass-surface rounded-r-xl" style={{ background: 'hsla(0,0%,100%,0.08)' }}>
      {dockApps.map(app => (
        <motion.button
          key={app.id}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleClick(app)}
          className="relative w-12 h-12 rounded-window-inner flex items-center justify-center text-2xl hover:bg-secondary/50 transition-colors"
          title={app.name}
        >
          {app.icon}
          {isOpen(app.id) && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2 rounded-r-full bg-primary" />
          )}
        </motion.button>
      ))}
    </div>
  );
};

export default Dock;
