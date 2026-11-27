import { useLayoutEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

type ModalProps = Omit<ComponentPropsWithoutRef<'dialog'>, 'open' | 'onClose'> & {
  open: boolean;
  onDismiss: () => void;
  dismissBlocked?: boolean;
};

export function Modal({ open, onDismiss, dismissBlocked, children, ...props }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const fromBackdrop = useRef(false);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected && !document.querySelector('dialog[open]')) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return (
    <dialog
      {...props}
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!dismissBlocked) onDismiss();
      }}
      onPointerDown={(event) => { fromBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (fromBackdrop.current && event.target === event.currentTarget && !dismissBlocked) onDismiss();
        fromBackdrop.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      {children}
    </dialog>
  );
}
