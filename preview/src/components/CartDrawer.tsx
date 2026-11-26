import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Plus, Minus, Trash2, ShoppingBag, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { formatBRL, getAvailableStock } from '../utils/format';
import { SafeImage } from './SafeImage';
import type { DeliveryMode, Order } from '../types';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setCartOpen,
    cart,
    products,
    cartSubtotalCents,
    updateCartQty,
    removeFromCart,
    deliverySettings,
    calculateDeliveryQuote,
    checkoutOrder,
    clientProfile,
    setCurrentView,
  } = useNorden();

  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [modality, setModality] = useState<DeliveryMode>('RETIRADA');
  const [recipientName, setRecipientName] = useState(clientProfile.name);
  const [distanceKm, setDistanceKm] = useState<number>(4);
  const [cep, setCep] = useState('01449-000');
  const [street, setStreet] = useState('Rua Haddock Lobo');
  const [number, setNumber] = useState('840');
  const [neighborhood, setNeighborhood] = useState('Jardins');
  const [city, setCity] = useState('São Paulo');
  const [uf, setUf] = useState('SP');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const quote = calculateDeliveryQuote(modality, distanceKm);
  const totalCents = cartSubtotalCents + (quote.allowed ? quote.feeCents : 0);

  const handleClose = () => {
    setCartOpen(false);
    window.setTimeout(() => {
      if (step === 'confirmed') setStep('bag');
      setCheckoutError(null);
    }, 250);
  };

  useEffect(() => {
    if (!isCartOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setCartOpen(false);
      setCheckoutError(null);
      if (step === 'confirmed') setStep('bag');
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isCartOpen, setCartOpen, step]);

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (recipientName.trim().length < 2) {
      setCheckoutError('Informe o nome do destinatário.');
      return;
    }

    if (modality === 'ENTREGA') {
      if (!cep.trim() || !street.trim() || !number.trim() || !city.trim()) {
        setCheckoutError('Preencha o endereço completo para entrega.');
        return;
      }
      if (!quote.allowed) {
        setCheckoutError(quote.reason || 'Endereço fora da área de cobertura.');
        return;
      }
    }

    const res = checkoutOrder({
      modality,
      distanceKm: modality === 'ENTREGA' ? distanceKm : undefined,
      recipientName,
      address:
        modality === 'ENTREGA'
          ? {
              cep,
              street,
              number,
              neighborhood,
              city,
              state: uf,
            }
          : undefined,
    });

    if (!res.ok) {
      setCheckoutError(res.error || 'Não foi possível concluir o pedido.');
      return;
    }

    setConfirmedOrder(res.order ?? null);
    setStep('confirmed');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Sacola NORDEN Store"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-strong)] h-full flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {step === 'checkout' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('bag');
                      setCheckoutError(null);
                    }}
                    aria-label="Voltar para a sacola"
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  {step === 'bag'
                    ? 'Sua Sacola'
                    : step === 'checkout'
                      ? 'Finalizar Pedido Demo'
                      : 'Pedido Registrado'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar sacola"
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
              {step === 'bag' && (
                <>
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <ShoppingBag className="w-9 h-9 text-[var(--text-muted)]/60 mb-4 stroke-[1.5]" />
                      <p className="font-display text-base font-medium text-[var(--text-primary)]">
                        Sua sacola está vazia
                      </p>
                      <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-xs">
                        Explore a NORDEN Store para descobrir pomadas, elixires de barba e cuidados faciais.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          setCurrentView('store');
                        }}
                        className="mt-6 px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
                      >
                        Explorar Loja
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {cart.map((item) => {
                        const prod = products.find((p) => p.id === item.productId);
                        if (!prod) return null;
                        const unitPrice = prod.promoPriceCents ?? prod.priceCents;
                        const available = getAvailableStock(prod.physicalStock, prod.reservedStock);

                        return (
                          <div key={item.productId} className="py-4 first:pt-0 flex gap-4">
                            <SafeImage
                              src={prod.image}
                              alt={prod.name}
                              className="w-20 h-20 object-cover rounded-lg bg-[var(--bg-surface-alt)] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[11px] text-[var(--text-muted)]">
                                    {prod.category} · {prod.volume}
                                  </p>
                                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                    {prod.name}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.productId)}
                                  aria-label={`Remover ${prod.name}`}
                                  className="text-[var(--text-muted)] hover:text-[var(--status-warn)] transition-colors p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="mt-3 flex items-center justify-between">
                                <div className="inline-flex items-center border border-[var(--border-strong)] rounded-lg bg-[var(--bg-input)]">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                                    aria-label="Diminuir quantidade"
                                    className="px-2.5 py-1.5 text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="px-2.5 text-xs font-mono tabular-nums text-[var(--text-primary)]">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                                    disabled={item.quantity >= available}
                                    aria-label="Aumentar quantidade"
                                    className="px-2.5 py-1.5 text-[var(--text-primary)] hover:text-[var(--accent)] disabled:opacity-35 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <span className="text-sm font-mono tabular-nums text-[var(--text-primary)]">
                                  {formatBRL(unitPrice * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {step === 'checkout' && (
                <form id="norden-checkout-form" onSubmit={handleConfirmOrder} className="space-y-5">
                  <div>
                    <label
                      htmlFor="chk-name"
                      className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
                    >
                      Destinatário
                    </label>
                    <input
                      id="chk-name"
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  {/* Modality selector */}
                  <div>
                    <span className="block text-xs font-medium text-[var(--text-primary)] mb-2">
                      Modalidade de recebimento
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg-surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setModality('RETIRADA')}
                        className={`min-h-[40px] py-2 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          modality === 'RETIRADA'
                            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Retirada · Grátis
                      </button>
                      <button
                        type="button"
                        onClick={() => setModality('ENTREGA')}
                        className={`min-h-[40px] py-2 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                          modality === 'ENTREGA'
                            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Entrega por km
                      </button>
                    </div>
                  </div>

                  {modality === 'RETIRADA' ? (
                    <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1.5">
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {deliverySettings.pickupLocation}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {deliverySettings.pickupInstructions}
                      </p>
                      <p className="text-xs text-[var(--accent)] pt-1 font-mono tabular-nums font-medium">
                        Taxa de retirada: R$ 0,00
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor="chk-km" className="text-xs font-medium text-[var(--text-primary)]">
                            Distância estimada (demo)
                          </label>
                          <span className="text-xs font-mono tabular-nums text-[var(--accent)] font-medium">
                            {distanceKm} km · {formatBRL(deliverySettings.rateCentsPerKm)}/km
                          </span>
                        </div>
                        <input
                          id="chk-km"
                          type="range"
                          min={1}
                          max={20}
                          step={1}
                          value={distanceKm}
                          onChange={(e) => setDistanceKm(Number(e.target.value))}
                          className="w-full accent-[#8E6B47] cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                          <span>1 km</span>
                          <span>Cobertura máx.: {deliverySettings.maxRadiusKm} km</span>
                          <span>20 km</span>
                        </div>
                        {!quote.allowed && (
                          <div className="text-xs text-[var(--status-warn)] pt-1">
                            {quote.reason}{' '}
                            <button
                              type="button"
                              onClick={() => setModality('RETIRADA')}
                              className="underline text-[var(--text-primary)] cursor-pointer"
                            >
                              Mudar para Retirada
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-1">
                          <label htmlFor="chk-cep" className="block text-[11px] text-[var(--text-muted)] mb-1">
                            CEP
                          </label>
                          <input
                            id="chk-cep"
                            type="text"
                            value={cep}
                            onChange={(e) => setCep(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label htmlFor="chk-street" className="block text-[11px] text-[var(--text-muted)] mb-1">
                            Rua
                          </label>
                          <input
                            id="chk-street"
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label htmlFor="chk-num" className="block text-[11px] text-[var(--text-muted)] mb-1">
                            Número
                          </label>
                          <input
                            id="chk-num"
                            type="text"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label htmlFor="chk-neigh" className="block text-[11px] text-[var(--text-muted)] mb-1">
                            Bairro / Cidade
                          </label>
                          <input
                            id="chk-neigh"
                            type="text"
                            value={`${neighborhood} · ${city}/${uf}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNeighborhood(val);
                              setCity('São Paulo');
                              setUf('SP');
                            }}
                            className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simulated payment transparent notice */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] leading-relaxed">
                    <span className="text-[var(--text-primary)] font-medium">Pagamento Simulado (Demo):</span>{' '}
                    Use dados fictícios. A confirmação simula a reserva de estoque no painel de gestão deste navegador.
                  </div>

                  {checkoutError && (
                    <p className="text-xs text-[var(--status-warn)] bg-[var(--bg-surface-alt)] border border-[var(--status-warn)]/35 rounded-lg px-3 py-2">
                      {checkoutError}
                    </p>
                  )}
                </form>
              )}

              {step === 'confirmed' && confirmedOrder && (
                <div className="py-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-[var(--accent)] shrink-0" />
                    <div>
                      <p className="font-display text-lg font-semibold text-[var(--text-primary)]">
                        Pedido {confirmedOrder.code}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Status: Recebido · Pagamento Simulado
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-2.5 text-sm">
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Modalidade</span>
                      <span className="text-[var(--text-primary)]">
                        {confirmedOrder.modality === 'RETIRADA'
                          ? 'Retirada no Salão'
                          : `Entrega (${confirmedOrder.distanceKm} km)`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums text-[var(--text-primary)]">
                        {formatBRL(confirmedOrder.subtotalCents)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>Taxa de entrega</span>
                      <span className="font-mono tabular-nums text-[var(--text-primary)]">
                        {formatBRL(confirmedOrder.deliveryFeeCents)}
                      </span>
                    </div>
                    <div className="h-px bg-[var(--border-subtle)] my-1" />
                    <div className="flex justify-between font-medium text-[var(--text-primary)]">
                      <span>Total congelado</span>
                      <span className="font-mono tabular-nums text-[var(--accent)]">
                        {formatBRL(confirmedOrder.totalCents)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      setCurrentView('client');
                    }}
                    className="w-full min-h-[46px] py-2.5 px-4 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
                  >
                    Acompanhar em Meus Pedidos
                  </button>
                </div>
              )}
            </div>

            {/* Footer Totals & Primary CTA */}
            {step !== 'confirmed' && cart.length > 0 && (
              <div className="px-5 sm:px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums text-[var(--text-primary)]">
                      {formatBRL(cartSubtotalCents)}
                    </span>
                  </div>
                  {step === 'checkout' && (
                    <div className="flex justify-between text-[var(--text-muted)]">
                      <span>
                        {modality === 'RETIRADA'
                          ? 'Retirada no salão'
                          : `Entrega estimada (${distanceKm} km)`}
                      </span>
                      <span className="font-mono tabular-nums text-[var(--text-primary)]">
                        {quote.allowed ? formatBRL(quote.feeCents) : 'Indisponível'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold text-[var(--text-primary)] pt-1.5 border-t border-[var(--border-subtle)]">
                    <span>Total</span>
                    <span className="font-mono tabular-nums text-[var(--accent)]">
                      {formatBRL(step === 'checkout' ? totalCents : cartSubtotalCents)}
                    </span>
                  </div>
                </div>

                {step === 'bag' ? (
                  <button
                    type="button"
                    key="choose-delivery"
                    onClick={() => setStep('checkout')}
                    className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
                  >
                    Escolher Retirada ou Entrega
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    key="confirm-demo-order"
                    form="norden-checkout-form"
                    disabled={!quote.allowed}
                    className="w-full min-h-[46px] py-3 px-4 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-45 rounded-lg transition-colors cursor-pointer"
                  >
                    Confirmar Pedido Demonstrativo
                  </button>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
