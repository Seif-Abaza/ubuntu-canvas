import { useState } from 'react';
import { useOSStore } from '@/store/os-store';
import { motion } from 'framer-motion';
import FaceLogin from './FaceLogin';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const login = useOSStore(s => s.login);

  const handleLogin = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!showPasswordField) {
        if (email.trim()) setShowPasswordField(true);
      } else {
        handleLogin();
      }
    }
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(268,55%,9%) 0%, hsl(280,40%,12%) 50%, hsl(268,55%,9%) 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <div className="text-6xl font-light text-foreground tracking-tight">{currentTime}</div>
        <div className="text-lg text-muted-foreground mt-2">{currentDate}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-4xl mb-4 border border-border">
          👤
        </div>

        {showFaceLogin ? (
          <FaceLogin
            onSuccess={() => {}}
            onCancel={() => setShowFaceLogin(false)}
          />
        ) : !showPasswordField ? (
          <div className="flex flex-col items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Email"
              autoFocus
              className="w-64 h-10 px-4 rounded-window-inner bg-secondary text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary text-center"
            />
            <button
              onClick={() => email.trim() && setShowPasswordField(true)}
              className="w-64 h-10 rounded-window-inner bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Next
            </button>
            <button
              onClick={() => setShowFaceLogin(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mt-2"
            >
              📷 Sign in with Face Recognition
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="text-foreground text-sm font-medium mb-1">{email}</div>
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
              disabled={loading}
              className="w-64 h-10 rounded-window-inner bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              onClick={() => { setShowPasswordField(false); setPassword(''); setError(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not {email}?
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-destructive">
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginScreen;
