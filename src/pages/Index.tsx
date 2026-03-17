import { useEffect } from 'react';
import { useOSStore } from '@/store/os-store';
import LoginScreen from '@/components/os/LoginScreen';
import Desktop from '@/components/os/Desktop';
import { AnimatePresence, motion } from 'framer-motion';

const Index = () => {
  const isLoggedIn = useOSStore(s => s.isLoggedIn);
  const isLoading = useOSStore(s => s.isLoading);
  const initAuth = useOSStore(s => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(268,55%,9%) 0%, hsl(280,40%,12%) 50%, hsl(268,55%,9%) 100%)' }}>
        <div className="text-foreground text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        <motion.div key="login" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <LoginScreen />
        </motion.div>
      ) : (
        <motion.div key="desktop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Desktop />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
