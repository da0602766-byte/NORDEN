import React, { lazy, Suspense } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { NordenProvider, useNorden } from './context/NordenContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { ToastStack } from './components/ToastStack';
import { LandingView } from './views/LandingView';

const StoreView = lazy(() => import('./views/StoreView').then((module) => ({ default: module.StoreView })));

const BookingView = lazy(() => import('./views/BookingView').then((module) => ({ default: module.BookingView })));

const ClientHubView = lazy(() => import('./views/ClientHubView').then((module) => ({ default: module.ClientHubView })));

const ManagerHubView = lazy(() => import('./views/ManagerHubView').then((module) => ({ default: module.ManagerHubView })));

const AppShell: React.FC = () => {
  const { currentView } = useNorden();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-200">
      <a href="#conteudo" className="sr-only focus:not-sr-only">Ir para o conteúdo</a>
      <Navbar />

      <p className="border-b border-[var(--border-subtle)] px-4 py-2 text-center text-sm text-[var(--text-secondary)]">
        Demonstração interativa · As simulações ficam neste navegador. Use dados fictícios.
      </p>
      <main id="conteudo" tabIndex={-1} className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Suspense fallback={<p role="status" className="p-8 text-center">Carregando…</p>}>
              {currentView === 'home' && <LandingView />}
              {currentView === 'store' && <StoreView />}
              {currentView === 'booking' && <BookingView />}
              {currentView === 'client' && <ClientHubView />}
              {currentView === 'manager' && <ManagerHubView />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <AuthModal />
      <CartDrawer />
      <ToastStack />
    </div>
  );
};

export default function App() {
  return (
    <NordenProvider>
      <MotionConfig reducedMotion="user">
        <AppShell />
      </MotionConfig>
    </NordenProvider>
  );
}
