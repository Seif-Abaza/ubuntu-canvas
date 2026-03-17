import { useState } from 'react';
import { useOSStore } from '@/store/os-store';
import { wallpaperImages } from '@/components/os/Desktop';

const settingsSections = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'background', label: 'Background', icon: '🖼️' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'network', label: 'Network', icon: '📶' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

const wallpapers = [
  { id: 'default', label: 'Jammy Jellyfish', color: 'linear-gradient(135deg, hsl(268,55%,9%) 0%, hsl(280,40%,18%) 50%, hsl(268,55%,9%) 100%)' },
  { id: 'focal', label: 'Focal Fossa', color: 'linear-gradient(135deg, hsl(220,40%,10%) 0%, hsl(200,50%,20%) 100%)' },
  { id: 'kinetic', label: 'Kinetic Kudu', color: 'linear-gradient(135deg, hsl(16,60%,12%) 0%, hsl(30,40%,18%) 100%)' },
  { id: 'lunar', label: 'Lunar Lobster', color: 'linear-gradient(135deg, hsl(180,30%,8%) 0%, hsl(160,40%,15%) 100%)' },
  { id: 'mantic', label: 'Mantic Minotaur', color: 'linear-gradient(135deg, hsl(300,30%,10%) 0%, hsl(320,40%,18%) 100%)' },
  { id: 'noble', label: 'Noble Numbat', color: 'linear-gradient(135deg, hsl(40,50%,10%) 0%, hsl(50,40%,20%) 100%)' },
];

const mockUsers = [
  { id: 1, name: 'admin', role: 'Administrator', active: true },
  { id: 2, name: 'user1', role: 'Standard', active: true },
  { id: 3, name: 'operator', role: 'Standard', active: false },
];

const SettingsApp = () => {
  const [activeSection, setActiveSection] = useState('appearance');
  const { wallpaper, setWallpaper, accentColor, setAccentColor } = useOSStore();
  const [users, setUsers] = useState(mockUsers);
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
                  className={`h-20 rounded-window-inner border-2 transition-all ${wallpaper === wp.id ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}`}
                  style={{ background: wp.color }}
                >
                  <span className="text-[10px] text-foreground/70">{wp.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

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

      case 'users':
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Users</h2>
              <button
                onClick={() => setUsers([...users, { id: Date.now(), name: `user${users.length + 1}`, role: 'Standard', active: true }])}
                className="px-3 py-1.5 text-xs rounded-window-inner bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Add User
              </button>
            </div>
            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">👤</div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.active ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => setUsers(users.filter(u => u.id !== user.id))}
                      className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'network':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-foreground">Network</h2>
            <div className="space-y-3">
              <div className="p-3 rounded-window-inner bg-secondary">
                <div className="flex justify-between text-sm text-foreground"><span>IPFS Node</span><span className="text-green-400">● Online</span></div>
                <div className="text-xs text-muted-foreground mt-1 font-ubuntu-mono">Peers: 12 | Gateway: localhost:8080</div>
              </div>
              <div className="p-3 rounded-window-inner bg-secondary">
                <div className="flex justify-between text-sm text-foreground"><span>Fabric Network</span><span className="text-green-400">● Connected</span></div>
                <div className="text-xs text-muted-foreground mt-1 font-ubuntu-mono">Org: Org1MSP | Channel: mychannel</div>
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
              <div className="flex justify-between p-2"><span className="text-muted-foreground">IPFS Version</span><span className="font-ubuntu-mono text-foreground">0.22.0</span></div>
              <div className="flex justify-between p-2"><span className="text-muted-foreground">Fabric SDK</span><span className="font-ubuntu-mono text-foreground">2.5.4</span></div>
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
