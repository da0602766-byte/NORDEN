import { useEffect, useRef } from 'react';
import { Briefcase, LogOut, User, X } from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { NordenLogo } from './NordenLogo';

const profiles = [
  {
    role: 'client',
    title: 'Cliente',
    name: 'Lucas Martins',
    description: 'Explore a agenda, o histórico Journey, o manual Care e seus pedidos.',
    icon: User,
  },
  {
    role: 'manager',
    title: 'Gestor',
    name: 'Rafael Almeida',
    description: 'Teste a gestão de atendimentos, pedidos, estoque e o NORDEN Flow.',
    icon: Briefcase,
  },
] as const;

export function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, role, switchRole } = useNorden();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!isAuthModalOpen) {
      element.close();
      return;
    }

    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAuthModalOpen]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-description"
      onClose={() => setAuthModalOpen(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) setAuthModalOpen(false);
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none max-h-[92dvh] overflow-auto rounded-t-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:max-w-xl sm:rounded-2xl"
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <NordenLogo variant="markOnly" />
          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            aria-label="Fechar janela de acesso"
            className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-alt)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 id="auth-modal-title" className="mt-4 font-display text-2xl font-semibold">Escolha um perfil de demonstração</h2>
        <p id="auth-modal-description" className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          Use os perfis fictícios para explorar o sistema. As simulações ficam neste navegador.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {profiles.map(({ role: profile, title, name, description, icon: Icon }) => (
            <button
              key={profile}
              type="button"
              onClick={() => switchRole(profile)}
              className="cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] p-4 text-left transition-colors hover:border-[var(--accent)]"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="h-4 w-4 text-[var(--accent)]" />
                {title}
              </span>
              <span className="mt-2 block text-sm">{name}</span>
              <span className="mt-1 block text-sm leading-relaxed text-[var(--text-muted)]">{description}</span>
            </button>
          ))}
        </div>
        {role !== 'visitor' && (
          <button
            type="button"
            onClick={() => switchRole('visitor')}
            className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]"
          >
            <LogOut className="h-4 w-4" /> Voltar ao perfil visitante
          </button>
        )}
      </div>
    </dialog>
  );
}
