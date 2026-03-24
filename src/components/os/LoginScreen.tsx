import { useState } from 'react';
import { useOSStore } from '@/store/os-store';
import { motion } from 'framer-motion';

const LoginScreen = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useOSStore(s => s.login);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const result = await login();
    setLoading(false);
    if (result.error) setError(result.error);
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

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-64 h-10 rounded-window-inner bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in with Puter'}
          </button>
          <p className="text-xs text-muted-foreground max-w-xs text-center mt-2">
            Sign in with your Puter.com account to access your cloud desktop, files, and AI assistant.
          </p>
        </div>

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
