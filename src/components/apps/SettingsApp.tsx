import { useState, useEffect, useCallback } from 'react';
import { useOSStore } from '@/store/os-store';
import { wallpaperImages } from '@/components/os/Desktop';
import { supabase } from '@/integrations/supabase/client';

const settingsSections = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'background', label: 'Background', icon: '🖼️' },
  { id: 'dock', label: 'Dock', icon: '🔲' },
  { id: 'accessibility', label: 'Accessibility', icon: '♿' },
  { id: 'users', label: 'Users', icon: '👥' },
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

interface UserData {
  userId: string;
  username: string;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  nationalId: string;
  role: string;
  active: boolean;
}

const emptyUser: UserData = {
  userId: '', username: '', fullName: '', phone: '', email: '', password: '', nationalId: '', role: 'user', active: true,
};

const SettingsApp = () => {
  const [activeSection, setActiveSection] = useState('appearance');
  const { wallpaper, setWallpaper, accentColor, setAccentColor, isAdmin, dockAutoHide, setDockAutoHide } = useOSStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    setUserError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const mapped: UserData[] = (data || []).map((u: any) => ({
        userId: u.user_id,
        username: u.username || '',
        fullName: u.full_name || '',
        phone: u.phone || '',
        email: u.email || '',
        password: '••••••',
        nationalId: u.national_id || '',
        role: u.role || 'user',
        active: u.active !== false,
      }));
      setUsers(mapped);
    } catch (err: any) {
      setUserError(err.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeSection === 'users' && isAdmin) {
      loadUsers();
    }
  }, [activeSection, isAdmin, loadUsers]);

  const handleAddUser = () => {
    setEditingUser({ ...emptyUser });
    setIsNewUser(true);
    setUserError('');
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser({ ...user });
    setIsNewUser(false);
    setUserError('');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    if (!editingUser.username.trim()) { setUserError('Username is required'); return; }
    if (isNewUser && !editingUser.email.trim()) { setUserError('Email is required'); return; }
    if (isNewUser && !editingUser.password.trim()) { setUserError('Password is required'); return; }

    setSaving(true);
    setUserError('');
    try {
      const action = isNewUser ? 'create' : 'update';
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action,
          userId: editingUser.userId || undefined,
          username: editingUser.username,
          fullName: editingUser.fullName,
          phone: editingUser.phone,
          email: editingUser.email,
          password: editingUser.password,
          nationalId: editingUser.nationalId,
          role: editingUser.role,
          active: editingUser.active,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEditingUser(null);
      setIsNewUser(false);
      await loadUsers();
    } catch (err: any) {
      setUserError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserError('');
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await loadUsers();
    } catch (err: any) {
      setUserError(err.message || 'Failed to delete user');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setIsNewUser(false);
    setUserError('');
  };

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
        if (!isAdmin) {
          return (
            <div className="p-6">
              <h2 className="text-lg font-medium text-foreground mb-4">Users</h2>
              <p className="text-sm text-muted-foreground">Admin access required to manage users.</p>
            </div>
          );
        }
        return (
          <div className="p-6 space-y-6">
            {userError && (
              <div className="p-2 rounded-window-inner bg-destructive/10 text-destructive text-xs">{userError}</div>
            )}
            {editingUser ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-foreground">{isNewUser ? 'Add User' : 'Edit User'}</h2>
                  <div className="flex gap-2">
                    <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs rounded-window-inner bg-secondary text-foreground hover:opacity-80 transition-opacity">Cancel</button>
                    <button onClick={handleSaveUser} disabled={saving} className="px-3 py-1.5 text-xs rounded-window-inner bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {([
                    { key: 'username', label: 'Username', type: 'text', placeholder: 'e.g. johndoe' },
                    { key: 'fullName', label: 'Full Name', type: 'text', placeholder: 'e.g. John Doe' },
                    { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: 'e.g. +1234567890' },
                    { key: 'email', label: 'Email', type: 'email', placeholder: 'e.g. john@example.com', disabled: !isNewUser },
                    { key: 'password', label: isNewUser ? 'Default Password' : 'Password', type: 'password', placeholder: isNewUser ? 'Set default password' : 'Leave blank to keep current' },
                    { key: 'nationalId', label: 'National ID', type: 'text', placeholder: 'e.g. 1234567890' },
                  ] as { key: string; label: string; type: string; placeholder: string; disabled?: boolean }[]).map(field => (
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">{field.label}</label>
                      <input
                        type={field.type}
                        value={(editingUser as any)[field.key] as string}
                        onChange={e => setEditingUser({ ...editingUser, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        disabled={field.disabled}
                        className="h-9 px-3 rounded-window-inner bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                    </div>
                  ))}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Role</label>
                    <select
                      value={editingUser.role}
                      onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="h-9 px-3 rounded-window-inner bg-secondary text-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="user">Standard</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-window-inner bg-secondary">
                    <span className="text-sm text-foreground">Active</span>
                    <button onClick={() => setEditingUser({ ...editingUser, active: !editingUser.active })} className={`w-10 h-5 rounded-full transition-colors ${editingUser.active ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${editingUser.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-foreground">Users</h2>
                  <button onClick={handleAddUser} className="px-3 py-1.5 text-xs rounded-window-inner bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Add User</button>
                </div>
                {usersLoading ? (
                  <div className="text-sm text-muted-foreground animate-pulse">Loading users...</div>
                ) : (
                  <div className="space-y-2">
                    {users.map(user => (
                      <div
                        key={user.userId}
                        onClick={() => handleEditUser(user)}
                        className="flex items-center justify-between p-3 rounded-window-inner bg-secondary hover:bg-secondary/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">👤</div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{user.fullName || user.username}</div>
                            <div className="text-xs text-muted-foreground">{user.role === 'admin' ? 'Administrator' : 'Standard'} · {user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${user.active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteUser(user.userId); }}
                            className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && !usersLoading && (
                      <div className="text-sm text-muted-foreground">No users found.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'network':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-medium text-foreground">Network</h2>
            <div className="space-y-3">
              <div className="p-3 rounded-window-inner bg-secondary">
                <div className="flex justify-between text-sm text-foreground"><span>IPFS Node</span><span className="text-primary">● Online</span></div>
                <div className="text-xs text-muted-foreground mt-1 font-ubuntu-mono">Peers: 12 | Gateway: localhost:8080</div>
              </div>
              <div className="p-3 rounded-window-inner bg-secondary">
                <div className="flex justify-between text-sm text-foreground"><span>Fabric Network</span><span className="text-primary">● Connected</span></div>
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
