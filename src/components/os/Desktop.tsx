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

import wpDefault from '@/assets/wallpaper-default.jpg';
import wpFocal from '@/assets/wallpaper-focal.jpg';
import wpKinetic from '@/assets/wallpaper-kinetic.jpg';
import wpLunar from '@/assets/wallpaper-lunar.jpg';
import wpMantic from '@/assets/wallpaper-mantic.jpg';
import wpNoble from '@/assets/wallpaper-noble.jpg';

export const wallpaperImages: Record<string, string> = {
  default: wpDefault,
  focal: wpFocal,
  kinetic: wpKinetic,
  lunar: wpLunar,
  mantic: wpMantic,
  noble: wpNoble,
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
      className="fixed inset-0 bg-cover bg-center bg-no-repeat"
      onContextMenu={handleContextMenu}
      onClick={() => useOSStore.getState().hideContextMenu()}
      style={{ backgroundImage: `url(${wallpaperImages[wallpaper] || wallpaperImages.default})` }}
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
