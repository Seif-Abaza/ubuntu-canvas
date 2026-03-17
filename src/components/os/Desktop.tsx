import { useOSStore } from '@/store/os-store';
import TopBar from './TopBar';
import Dock from './Dock';
import WindowFrame from './WindowFrame';
import ContextMenu from './ContextMenu';
import SettingsApp from '@/components/apps/SettingsApp';
import FileExplorer from '@/components/apps/FileExplorer';
import TerminalApp from '@/components/apps/TerminalApp';
import IPFSExplorer from '@/components/apps/IPFSExplorer';
import FabricNetwork from '@/components/apps/FabricNetwork';
import { AnimatePresence } from 'framer-motion';

const wallpaperStyles: Record<string, string> = {
  default: 'linear-gradient(135deg, hsl(268,55%,9%) 0%, hsl(280,40%,18%) 50%, hsl(268,55%,9%) 100%)',
  focal: 'linear-gradient(135deg, hsl(220,40%,10%) 0%, hsl(200,50%,20%) 100%)',
  kinetic: 'linear-gradient(135deg, hsl(16,60%,12%) 0%, hsl(30,40%,18%) 100%)',
  lunar: 'linear-gradient(135deg, hsl(180,30%,8%) 0%, hsl(160,40%,15%) 100%)',
  mantic: 'linear-gradient(135deg, hsl(300,30%,10%) 0%, hsl(320,40%,18%) 100%)',
  noble: 'linear-gradient(135deg, hsl(40,50%,10%) 0%, hsl(50,40%,20%) 100%)',
};

const appContent: Record<string, React.ReactNode> = {
  files: <FileExplorer />,
  terminal: <TerminalApp />,
  settings: <SettingsApp />,
  ipfs: <IPFSExplorer />,
  fabric: <FabricNetwork />,
};

const Desktop = () => {
  const { windows, wallpaper, showContextMenu, logout } = useOSStore();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', action: () => {} },
      { label: 'Change Background', action: () => useOSStore.getState().openWindow('settings', 'Settings', '⚙️') },
      { separator: true, label: '' },
      { label: 'Open Terminal', action: () => useOSStore.getState().openWindow('terminal', 'Terminal', '🖥️') },
      { separator: true, label: '' },
      { label: 'Logout', action: logout },
    ]);
  };

  return (
    <div
      className="fixed inset-0"
      onContextMenu={handleContextMenu}
      onClick={() => useOSStore.getState().hideContextMenu()}
      style={{ background: wallpaperStyles[wallpaper] || wallpaperStyles.default }}
    >
      <TopBar />
      <Dock />

      <AnimatePresence>
        {windows.map(win => (
          <WindowFrame key={win.id} win={win}>
            {appContent[win.appId] || (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Application not found
              </div>
            )}
          </WindowFrame>
        ))}
      </AnimatePresence>

      <ContextMenu />
    </div>
  );
};

export default Desktop;
