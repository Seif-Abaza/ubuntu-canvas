import { useState } from 'react';
import { useOSStore } from '@/store/os-store';
import { wallpaperImages } from '@/components/os/Desktop';
import WebPublisher from '@/components/apps/WebPublisher';

const settingsSections = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'background', label: 'Background', icon: '🖼️' },
  { id: 'dock', label: 'Dock', icon: '🔲' },
  { id: 'webpublisher', label: 'Web Publisher', icon: '🌐' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  { id: 'network', label: 'Network', icon: '📶' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

const wallpapers = [
  { id: 'default', label: 'Jammy Jellyfish' },
  { id: 'focal', label: 'Focal Fossa' },
  { id: 'kinetic', label: 'Kinetic Kudu' },
  { id: 'lunar', label: 'Lunar Lobster' },
  { id: 'mantic', label: 'Mantic Minotaur' },
  { id: 'noble', label: 'Noble Numbat' },
];

const SettingsApp = () => {
  const [activeSection, setActiveSection] = useState('appearance');
  const { wallpaper, setWallpaper, accentColor, setAccentColor, dockAutoHide, setDockAutoHide } = useOSStore();
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-foreground">Appearance</h2>
            <div>
              <label className="text-sm text-muted-foreground mb-3 block">Style</label>
              <div className="flex gap-3">
                <div className="w-24 h-16 rounded-window-inner bg-card border-2 border-primary flex items-center justify-center text-xs text-foreground">Dark</div>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-3 block">Accent Color</label>
              <div className="flex gap-2">
                {['orange', 'blue', 'green', 'red', 'purple', 'teal'].map(c => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${accentColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{
                      background: c === 'orange' ? 'hsl(16,82%,52%)' : c === 'blue' ? 'hsl(210,80%,50%)' : c === 'green' ? 'hsl(130,50%,40%)' : c === 'red' ? 'hsl(0,72%,51%)' : c === 'purple' ? 'hsl(270,60%,50%)' : 'hsl(180,50%,40%)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'background':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-foreground">Background</h2>
            <div className="grid grid-cols-3 gap-3">
              {wallpapers.map(wp => (
                <button
                  key={wp.id}
                  onClick={() => setWallpaper(wp.id)}
                  className={`h-20 rounded-window-inner border-2 transition-all overflow-hidden relative ${wallpaper === wp.id ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}`}
                >
                  <img src={wallpaperImages[wp.id]} alt={wp.label} className="absolute inset-0 w-full h-full object-cover" />
                  <span className="relative text-[10px] text-foreground/90 font-medium drop-shadow-md">{wp.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'dock':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-foreground">Dock</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                <div>
                  <span className="text-sm text-foreground">Auto-hide the Dock</span>
                  <p className="text-xs text-muted-foreground mt-0.5">The dock hides when not in use and appears on hover</p>
                </div>
                <button onClick={() => setDockAutoHide(!dockAutoHide)} className={`w-10 h-5 rounded-full transition-colors ${dockAutoHide ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${dockAutoHide ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                <span className="text-sm text-foreground">Icon Size</span>
                <span className="text-xs text-muted-foreground">48px</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                <span className="text-sm text-foreground">Position</span>
                <span className="text-xs text-muted-foreground">Left</span>
              </div>
            </div>
          </div>
        );

      case 'webpublisher':
        return <WebPublisher />;

      case 'accessibility':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-foreground">Accessibility</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                <span className="text-sm text-foreground">Large Text</span>
                <input type="range" min={75} max={150} value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-32 accent-primary" />
                <span className="text-xs text-muted-foreground w-10 text-right">{fontSize}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                <span className="text-sm text-foreground">High Contrast</span>
                <button onClick={() => setHighContrast(!highContrast)} className={`w-10 h-5 rounded-full transition-colors ${highContrast ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${highContrast ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                <span className="text-sm text-foreground">Reduce Motion</span>
                <button onClick={() => setReducedMotion(!reducedMotion)} className={`w-10 h-5 rounded-full transition-colors ${reducedMotion ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${reducedMotion ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'network':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-foreground">Network</h2>
            <div className="space-y-3">
              <div className="p-3 rounded-window-inner bg-secondary">
                <div className="flex justify-between text-sm text-foreground"><span>Puter Cloud</span><span className="text-primary">● Connected</span></div>
                <div className="text-xs text-muted-foreground mt-1 font-ubuntu-mono">API: js.puter.com/v2</div>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-medium text-foreground">About</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2"><span className="text-muted-foreground">OS Name</span><span className="text-foreground">Ubuntu Web OS</span></div>
              <div className="flex justify-between p-2"><span className="text-muted-foreground">Version</span><span className="text-foreground">24.04 LTS</span></div>
              <div className="flex justify-between p-2"><span className="text-muted-foreground">Backend</span><span className="text-foreground">Puter.com Cloud</span></div>
              <div className="flex justify-between p-2"><span className="text-muted-foreground">AI Models</span><span className="font-ubuntu-mono text-foreground">GPT-4, Claude, Gemini</span></div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-border py-2" style={{ background: 'hsla(0,0%,0%,0.2)' }}>
        {settingsSections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeSection === s.id ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary/50'}`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">{renderContent()}</div>
    </div>
  );
};

export default SettingsApp;
