import { useOSStore } from '@/store/os-store';
import LoginScreen from '@/components/os/LoginScreen';
import Desktop from '@/components/os/Desktop';
import { AnimatePresence, motion } from 'framer-motion';

const Index = () => {
  const isLoggedIn = useOSStore(s => s.isLoggedIn);

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
