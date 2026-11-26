import React from 'react';
import { Moon, RotateCcw, Sun } from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { NordenLogo } from './NordenLogo';

export const Footer: React.FC = () => {
  const { setCurrentView, startBookingWithService, setAuthModalOpen, resetDemoData, theme, toggleTheme } =
    useNorden();

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-footer)] mt-20 transition-colors duration-200">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-[var(--border-subtle)]">
          <div className="md:col-span-5 space-y-4">
            <NordenLogo variant="stacked" className="items-start" />
            <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed pt-2">
              Seu estilo. Sua evolução. Plataforma integrada de cuidados masculinos conectando agendamento, acompanhamento em cadeira, manual pós-serviço e curadoria de produtos.
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-primary)] tracking-wide">Explorar</p>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Início
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => startBookingWithService(null, null)}
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Agendamento Online
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('store');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  NORDEN Store
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Login &amp; Perfis Demo
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-primary)] tracking-wide">
              Atendimento (Ilustrativo)
            </p>
            <div className="space-y-1.5 text-sm text-[var(--text-muted)]">
              <p>Terça a Sexta · 09:00 às 20:00</p>
              <p>Sábado · 09:00 às 18:00</p>
              <p className="pt-1">Av. Europa, 420 · São Paulo, SP</p>
              <p className="font-mono text-xs tabular-nums">(11) 3000-0000 · contato@norden.demo</p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-primary)] tracking-wide">
              Preferências &amp; Demo
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Serviços, preços, estoque e receitas financeiras são dados fictícios para visualização.
            </p>
            <div className="flex flex-col items-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              </button>
              <button
                type="button"
                onClick={resetDemoData}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar dados iniciais
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <p>© {new Date().getFullYear()} NORDEN Salão Masculino · Demonstração interativa</p>
          <p>Privacidade · Termos de Uso · Dados fictícios</p>
        </div>
      </div>
    </footer>
  );
};
