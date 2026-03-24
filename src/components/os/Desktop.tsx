import { useOSStore } from '@/store/os-store';
import TopBar from './TopBar';
import Dock from './Dock';
import WindowFrame from './WindowFrame';
import ContextMenu from './ContextMenu';
import DesktopIcons from './DesktopIcons';
import SettingsApp from '@/components/apps/SettingsApp';
import FileExplorer from '@/components/apps/FileExplorer';
import TerminalApp from '@/components/apps/TerminalApp';
import IPFSExplorer from '@/components/apps/IPFSExplorer';
import FabricNetwork from '@/components/apps/FabricNetwork';
import TextEditor from '@/components/apps/TextEditor';
import P2PShareApp from '@/components/apps/P2PShareApp';
import P2PGroupApp from '@/components/apps/P2PGroupApp';
import TrashApp from '@/components/apps/TrashApp';
import AIAssistant from '@/components/apps/AIAssistant';
import SystemMonitor from '@/components/apps/SystemMonitor';
import WebPublisher from '@/components/apps/WebPublisher';
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

const getAppContent = (win: ReturnType<typeof useOSStore.getState>['windows'][0]) => {
  switch (win.appId) {
    case 'files':
      return <FileExplorer folderId={win.appData?.folderId} folderName={win.appData?.folderName} />;
    case 'terminal':
      return <TerminalApp />;
    case 'settings':
      return <SettingsApp />;
    case 'ipfs':
      return <IPFSExplorer />;
    case 'fabric':
      return <FabricNetwork />;
    case 'texteditor':
      return <TextEditor windowId={win.id} noteId={win.appData?.noteId} initialContent={win.appData?.content || ''} fileName={win.appData?.fileName || 'Untitled'} />;
    case 'p2p':
      return <P2PShareApp shareFile={win.appData?.shareFile} />;
    case 'p2pgroup':
      return <P2PGroupApp />;
    case 'trash':
      return <TrashApp />;
    case 'ai':
      return <AIAssistant />;
    case 'sysmonitor':
      return <SystemMonitor />;
    case 'webpublisher':
      return <WebPublisher />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Application not found
        </div>
      );
  }
};

const Desktop = () => {
  const { windows, wallpaper, showContextMenu, logout, addDesktopItem } = useOSStore();

  const createNewFolder = () => {
    const name = `New Folder ${Date.now().toString(36)}`;
    addDesktopItem({
      id: name, name, type: 'folder',
      children: [],
      x: 0, y: 0,
    });
  };

  const createNewNote = () => {
    const name = `Untitled Note ${Date.now().toString(36)}.txt`;
    const item = {
      id: name, name, type: 'note' as const,
      content: '',
      x: 0, y: 0,
    };
    addDesktopItem(item);
    useOSStore.getState().openWindow('texteditor', item.name, '📝', { noteId: name, content: '', fileName: item.name });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', action: createNewFolder },
      { label: 'New Notes', action: createNewNote },
      { separator: true, label: '' },
      { label: 'Paste', action: () => {} },
      { separator: true, label: '' },
      { label: 'Change Background', action: () => useOSStore.getState().openWindow('settings', 'Settings', '⚙️') },
      { label: 'Display Settings', action: () => useOSStore.getState().openWindow('settings', 'Settings', '⚙️') },
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
      <DesktopIcons />

      <AnimatePresence>
        {windows.map(win => (
          <WindowFrame key={win.id} win={win}>
            {getAppContent(win)}
          </WindowFrame>
        ))}
      </AnimatePresence>

      <ContextMenu />
    </div>
  );
};

export default Desktop;
