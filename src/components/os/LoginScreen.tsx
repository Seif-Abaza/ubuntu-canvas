import { useState } from 'react';
import { useOSStore } from '@/store/os-store';
import { motion } from 'framer-motion';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const login = useOSStore(s => s.login);

  const handleLogin = () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    // Simple local auth for now — backend will handle real auth
    if (password === 'admin' || password.length >= 4) {
      login(username);
    } else {
      setError('Invalid credentials');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!showPasswordField) {
        if (username.trim()) setShowPasswordField(true);
      } else {
        handleLogin();
      }
    }
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(268,55%,9%) 0%, hsl(280,40%,12%) 50%, hsl(268,55%,9%) 100%)' }}>
      {/* Time display */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <div className="text-6xl font-light text-foreground tracking-tight">{currentTime}</div>
        <div className="text-lg text-muted-foreground mt-2">{currentDate}</div>
      </motion.div>

      {/* User avatar and form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-4xl mb-4 border border-border">
          👤
        </div>

        {!showPasswordField ? (
          <div className="flex flex-col items-center gap-3">
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Username"
              autoFocus
              className="w-64 h-10 px-4 rounded-window-inner bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-center"
            />
            <button
              onClick={() => username.trim() && setShowPasswordField(true)}
              className="w-64 h-10 rounded-window-inner bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="text-foreground text-sm font-medium mb-1">{username}</div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Password"
              autoFocus
              className="w-64 h-10 px-4 rounded-window-inner bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-center"
            />
            <button
              onClick={handleLogin}
              className="w-64 h-10 rounded-window-inner bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
            <button
              onClick={() => { setShowPasswordField(false); setPassword(''); setError(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not {username}?
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginScreen;
