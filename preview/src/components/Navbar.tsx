import React, { useRef, useState } from 'react';
import { Menu, Moon, Sun, X, User, Briefcase, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNorden } from '../context/NordenContext';
import { NordenLogo } from './NordenLogo';
import type { AppView } from '../types';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    startBookingWithService,
    role,
    switchRole,
    clientProfile,
    setAuthModalOpen,
    cartCount,
    setCartOpen,
    flowOffers,
    theme,
    toggleTheme,
  } = useNorden();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  const pendingClientOffers = flowOffers.filter(
    (o) => o.clientId === clientProfile.id && o.status === 'OFERTADA',
  ).length;

  const navigate = (view: AppView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePortalClick = () => {
    setMobileMenuOpen(false);
    if (role === 'manager') {
      navigate('manager');
    } else if (role === 'client') {
      navigate('client');
    } else {
      setAuthModalOpen(true);
    }
  };

  const portalLabel =
    role === 'manager'
      ? 'Painel Gestão'
      : role === 'client'
        ? pendingClientOffers > 0
          ? `Minha Área (${pendingClientOffers})`
          : 'Minha Área'
        : 'Jornada';

  const accountLabel =
    role === 'manager'
      ? 'Rafael · Gestor'
      : role === 'client'
        ? clientProfile.name.split(' ')[0]
        : 'Entrar';

  return (
    <header onKeyDown={(event) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      }
    }} className="sticky top-0 z-[var(--layer-header)] bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors duration-200">
      <div className="max-w-[1240px] mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Single-line Brand Wordmark & Redesigned Vector Emblem */}
        <button
          type="button"
          onClick={() => navigate('home')}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded py-1 shrink-0 cursor-pointer"
          aria-label="NORDEN — Ir para página inicial"
        >
          <NordenLogo variant="header" />
        </button>

        {/* Zone 2: 5 Concise Single-Line Text Nav Links */}
        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-6 text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => navigate('home')}
            className={`whitespace-nowrap shrink-0 transition-colors duration-150 py-1 border-b cursor-pointer ${
              currentView === 'home'
                ? 'text-[var(--text-primary)] border-[var(--accent)]'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            Início
          </button>

          <button
            type="button"
            onClick={() => navigate('store')}
            className={`whitespace-nowrap shrink-0 transition-colors duration-150 py-1 border-b cursor-pointer ${
              currentView === 'store'
                ? 'text-[var(--text-primary)] border-[var(--accent)]'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            Loja
          </button>

          <button
            type="button"
            onClick={handlePortalClick}
            className={`whitespace-nowrap shrink-0 transition-colors duration-150 py-1 border-b cursor-pointer ${
              currentView === 'client' || currentView === 'manager'
                ? 'text-[var(--text-primary)] border-[var(--accent)]'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            {portalLabel}
          </button>

          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="whitespace-nowrap shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 py-1 border-b border-transparent cursor-pointer"
          >
            {accountLabel}
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="whitespace-nowrap shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 py-1 border-b border-transparent tabular-nums cursor-pointer"
          >
            {cartCount > 0 ? `Sacola (${cartCount})` : 'Sacola'}
          </button>
        </nav>

        {/* Zone 3: Theme Toggle + Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            className="w-10 h-10 max-[374px]:w-8 flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              startBookingWithService(null, null);
            }}
            className="px-2.5 sm:px-4 h-10 text-xs sm:text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]"
          >
            Agendar
          </button>

          <button
            type="button"
            ref={menuButton}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuOpen ? "demo-mobile-menu" : undefined}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            id="demo-mobile-menu"
            aria-label="Menu principal"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden bg-[var(--bg-surface)] border-b border-[var(--border-strong)] px-4 py-4 shadow-xl"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => navigate('home')}
                className={`text-left min-h-[44px] px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                  currentView === 'home'
                    ? 'bg-[var(--bg-surface-alt)] text-[var(--accent)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                <span>Início</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('store')}
                className={`text-left min-h-[44px] px-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                  currentView === 'store'
                    ? 'bg-[var(--bg-surface-alt)] text-[var(--accent)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                <span>NORDEN Store</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCartOpen(true);
                }}
                className="text-left min-h-[44px] px-3 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] flex items-center justify-between transition-colors tabular-nums"
              >
                <span className="inline-flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[var(--accent)]" />
                  Sacola
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                </span>
              </button>

              {/* Quick Direct Profile Access inside Mobile Menu */}
              <div className="my-2 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <p className="px-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Perfis &amp; Acesso Rápido
                </p>
                <div className="grid grid-cols-2 gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      switchRole('client');
                    }}
                    className={`min-h-[48px] px-3 py-2 rounded-xl border text-left transition-colors ${
                      role === 'client' && currentView === 'client'
                        ? 'border-[var(--accent)] bg-[var(--bg-surface-alt)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-input)]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <User className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Cliente
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      Lucas Martins
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      switchRole('manager');
                    }}
                    className={`min-h-[48px] px-3 py-2 rounded-xl border text-left transition-colors ${
                      role === 'manager' && currentView === 'manager'
                        ? 'border-[var(--accent)] bg-[var(--bg-surface-alt)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-input)]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                      <Briefcase className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Gestor
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      Rafael Almeida
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-lg text-xs font-semibold text-[var(--accent)] hover:bg-[var(--bg-surface-alt)] text-center transition-colors"
                >
                  Abrir seletor de perfil
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};
