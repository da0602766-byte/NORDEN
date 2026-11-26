import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  AppView,
  Booking,
  CartItem,
  ClientProfile,
  CompletedAppointment,
  DeliveryAddress,
  DeliveryMode,
  DeliverySettings,
  InventoryMovement,
  MonthlyFinancialPoint,
  Order,
  OrderStatus,
  Product,
  Professional,
  RescheduleOffer,
  ServiceItem,
  ToastMessage,
  UsedProductRecord,
  RecommendedProductRecord,
  UserRole,
} from '../types';
import {
  ASSETS,
  CARE_TEMPLATES,
  INITIAL_BOOKINGS,
  INITIAL_CLIENT_PROFILE,
  INITIAL_COMPLETED_APPOINTMENTS,
  INITIAL_DELIVERY_SETTINGS,
  INITIAL_FLOW_OFFERS,
  INITIAL_INVENTORY_MOVEMENTS,
  INITIAL_MONTHLY_FINANCIALS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PROFESSIONALS,
  INITIAL_SERVICES,
} from '../data/seedData';
import {
  addMinutesToTime,
  localDateKey,
  formatBRL,
  getAvailableStock,
  rangesOverlap,
  timeToMinutes,
} from '../utils/format';

const STORAGE_KEY = 'norden_pages_demo_v1';
const viewPaths = {
  home: '/',
  store: '/loja',
  booking: '/agendar',
  client: '/app',
  manager: '/gestao',
} satisfies Record<AppView, string>;

function readView(): AppView {
  const [section, subpage] = window.location.hash.slice(1).split(/[?#]/)[0].split('/').slice(1);
  if (section === 'app' && subpage === 'agendar') return 'booking';
  switch (section) {
    case 'loja': return 'store';
    case 'agendar': return 'booking';
    case 'app': return 'client';
    case 'gestao': return 'manager';
    default: return 'home';
  }
}

interface PersistedState {
  role: UserRole;
  clientProfile: ClientProfile;
  products: Product[];
  bookings: Booking[];
  flowOffers: RescheduleOffer[];
  completedAppointments: CompletedAppointment[];
  cart: CartItem[];
  orders: Order[];
  movements: InventoryMovement[];
}

interface NordenContextValue {
  // Navigation & UI
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  preselectedServiceId: string | null;
  startBookingWithService: (serviceId?: string | null, professionalId?: string | null) => void;
  preselectedProfessionalId: string | null;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (title: string, description?: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // Auth & Profile
  role: UserRole;
  switchRole: (role: UserRole) => void;
  clientProfile: ClientProfile;
  updateClientProfile: (patch: Partial<ClientProfile>) => void;

  // Catalog
  services: ServiceItem[];
  professionals: Professional[];
  products: Product[];
  deliverySettings: DeliverySettings;

  // Agenda & NORDEN Flow
  bookings: Booking[];
  flowOffers: RescheduleOffer[];
  getAvailableSlots: (date: string, professionalId: string, durationMin: number) => string[];
  createBooking: (input: {
    serviceId: string;
    professionalId: string;
    date: string;
    startTime: string;
    preferredProductIds: string[];
    notes?: string;
    clientNameOverride?: string;
  }) => { ok: boolean; error?: string; booking?: Booking };
  cancelBooking: (bookingId: string, reason?: string) => void;
  sendFlowOffer: (offerId: string) => void;
  respondToFlowOffer: (offerId: string, decision: 'accept' | 'decline') => void;

  // Execution, Journey & Care
  completedAppointments: CompletedAppointment[];
  startAppointment: (bookingId: string) => void;
  completeAppointment: (input: {
    bookingId: string;
    summary: string;
    clientVisibleNotes: string;
    internalNotes: string;
    usedProducts: UsedProductRecord[];
    recommendedProducts: RecommendedProductRecord[];
    customFirst24Hours?: string[];
  }) => void;

  // Store, Cart, Stock & Orders
  cart: CartItem[];
  cartCount: number;
  cartSubtotalCents: number;
  addToCart: (productId: string, qty?: number) => boolean;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  calculateDeliveryQuote: (
    modality: DeliveryMode,
    distanceKm: number,
  ) => { allowed: boolean; feeCents: number; reason?: string };
  checkoutOrder: (input: {
    modality: DeliveryMode;
    distanceKm?: number;
    address?: DeliveryAddress;
    recipientName: string;
  }) => { ok: boolean; error?: string; order?: Order };
  orders: Order[];
  advanceOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  adjustStock: (productId: string, delta: number, reason: string) => void;
  movements: InventoryMovement[];

  // Financials
  monthlyFinancials: MonthlyFinancialPoint[];
  resetDemoData: () => void;
}

const NordenContext = createContext<NordenContextValue | null>(null);

function loadInitialState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as PersistedState | null;
    if (!state || !['visitor', 'client', 'manager'].includes(state.role)) return null;
    if (!state.clientProfile || typeof state.clientProfile.name !== 'string' ||
        typeof state.clientProfile.id !== 'string') return null;
    const records = [state.products, state.bookings, state.flowOffers, state.completedAppointments,
      state.cart, state.orders, state.movements];
    if (records.some((items) => !Array.isArray(items) || items.some((item) => !item || typeof item !== 'object'))) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export const NordenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const saved = useMemo(() => loadInitialState(), []);

  const [requestedView, setRequestedView] = useState(readView);
  const setCurrentView = (view: AppView) => {
    if (readView() !== view) window.location.hash = viewPaths[view];
    setRequestedView(view);
  };
  useEffect(() => {
    const syncView = () => setRequestedView(readView());
    window.addEventListener('hashchange', syncView);
    return () => window.removeEventListener('hashchange', syncView);
  }, []);
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);
  const [preselectedProfessionalId, setPreselectedProfessionalId] = useState<string | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('norden_theme');
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('norden_theme', theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const setTheme = (next: 'dark' | 'light') => setThemeState(next);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const [role, setRole] = useState<UserRole>(() => {
    const profile = new URLSearchParams(window.location.search).get('perfil');
    if (profile === 'cliente') return 'client';
    if (profile === 'gestor') return 'manager';
    return saved?.role ?? 'visitor';
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('perfil')) return;
    url.searchParams.delete('perfil');
    window.history.replaceState(window.history.state, '', url);
  }, []);
  const currentView = (
    (requestedView === 'client' && role !== 'client') ||
    (requestedView === 'manager' && role !== 'manager')
  ) ? 'home' : requestedView;
  const [clientProfile, setClientProfile] = useState<ClientProfile>(
    saved?.clientProfile ?? INITIAL_CLIENT_PROFILE,
  );
  const [services] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [professionals] = useState<Professional[]>(INITIAL_PROFESSIONALS);
  const [deliverySettings] = useState<DeliverySettings>(INITIAL_DELIVERY_SETTINGS);

  const [products, setProducts] = useState<Product[]>(saved?.products ?? INITIAL_PRODUCTS);
  const [bookings, setBookings] = useState<Booking[]>(saved?.bookings ?? INITIAL_BOOKINGS);
  const [flowOffers, setFlowOffers] = useState<RescheduleOffer[]>(
    saved?.flowOffers ?? INITIAL_FLOW_OFFERS,
  );
  const [completedAppointments, setCompletedAppointments] = useState<CompletedAppointment[]>(
    saved?.completedAppointments ?? INITIAL_COMPLETED_APPOINTMENTS,
  );
  const [cart, setCart] = useState<CartItem[]>(saved?.cart ?? []);
  const [orders, setOrders] = useState<Order[]>(saved?.orders ?? INITIAL_ORDERS);
  const [movements, setMovements] = useState<InventoryMovement[]>(
    saved?.movements ?? INITIAL_INVENTORY_MOVEMENTS,
  );

  // Persist demo state seamlessly in localStorage
  useEffect(() => {
    const snapshot: PersistedState = {
      role,
      clientProfile,
      products,
      bookings,
      flowOffers,
      completedAppointments,
      cart,
      orders,
      movements,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore quota errors in sandboxed iframes
    }
  }, [
    role,
    clientProfile,
    products,
    bookings,
    flowOffers,
    completedAppointments,
    cart,
    orders,
    movements,
  ]);

  const pushToast = (
    title: string,
    description?: string,
    variant: ToastMessage['variant'] = 'default',
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const startBookingWithService = (
    serviceId: string | null = null,
    professionalId: string | null = null,
  ) => {
    setPreselectedServiceId(serviceId);
    setPreselectedProfessionalId(professionalId);
    setCurrentView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchRole = (nextRole: UserRole) => {
    setRole(nextRole);
    setAuthModalOpen(false);
    if (nextRole === 'client') {
      pushToast('Sessão de demonstração ativa', `Conectado como ${clientProfile.name} (Cliente).`, 'success');
      setCurrentView('client');
    } else if (nextRole === 'manager') {
      pushToast('Painel Profissional & Gestão ativo', 'Conectado como Rafael Almeida (Gestor Demo).', 'success');
      setCurrentView('manager');
    } else {
      pushToast('Modo visitante ativo', 'Você saiu da conta demonstrativa.');
      setCurrentView('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateClientProfile = (patch: Partial<ClientProfile>) => {
    setClientProfile((prev) => ({
      ...prev,
      ...patch,
      consentUpdatedAt: new Date().toISOString().slice(0, 10),
    }));
    pushToast('Perfil atualizado', 'Suas preferências e alertas foram salvos na sessão demo.', 'success');
  };

  // Semi-open interval availability calculator [start, end)
  const getAvailableSlots = (
    date: string,
    professionalId: string,
    durationMin: number,
  ): string[] => {
    const now = new Date();
    const today = localDateKey(now);
    const day = new Date(`${date}T12:00:00`).getDay();
    if (date < today || !Number.isFinite(day) || day < 2) return [];

    const workStart = 9 * 60;
    const workEnd = (day === 6 ? 18 : 20) * 60;
    const earliest = date === today ? now.getHours() * 60 + now.getMinutes() + 1 : workStart;
    const step = 30;

    const busyRanges = bookings
      .filter(
        (b) =>
          b.date === date &&
          (b.professionalId === professionalId || b.clientId === clientProfile.id) &&
          b.status !== 'CANCELADO' &&
          b.status !== 'CONCLUIDO',
      )
      .map((b) => ({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      }));

    const slots: string[] = [];
    for (let cursor = workStart; cursor + durationMin <= workEnd; cursor += step) {
      const slotEnd = cursor + durationMin;
      const conflict = busyRanges.some((r) => rangesOverlap(cursor, slotEnd, r.start, r.end));
      if (!conflict && cursor >= earliest) {
        const hh = String(Math.floor(cursor / 60)).padStart(2, '0');
        const mm = String(cursor % 60).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }
    return slots;
  };

  const createBooking: NordenContextValue['createBooking'] = ({
    serviceId,
    professionalId,
    date,
    startTime,
    preferredProductIds,
    notes,
    clientNameOverride,
  }) => {
    const srv = services.find((s) => s.id === serviceId && s.active);
    const prof = professionals.find((p) => p.id === professionalId && p.active);
    if (!srv || !prof) {
      return { ok: false, error: 'Serviço ou profissional indisponível.' };
    }
    if (!prof.serviceIds.includes(srv.id)) {
      return { ok: false, error: `${prof.name} não está habilitado para este serviço.` };
    }

    if (!getAvailableSlots(date, professionalId, srv.durationMin).includes(startTime)) {
      return { ok: false, error: 'Este horário não está disponível. Selecione outra opção.' };
    }

    const newBooking: Booking = {
      id: `bk-${crypto.randomUUID()}`,
      clientId: clientProfile.id,
      clientName: clientNameOverride || clientProfile.name,
      serviceId: srv.id,
      serviceName: srv.name,
      professionalId: prof.id,
      professionalName: prof.name,
      date,
      startTime,
      endTime: addMinutesToTime(startTime, srv.durationMin),
      durationMin: srv.durationMin,
      priceCents: srv.priceCents,
      status: 'CONFIRMADO',
      preferredProductIds,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);
    if (role !== 'client') {
      setRole('client');
    }
    pushToast(
      'Agendamento confirmado',
      `${srv.name} com ${prof.name} às ${startTime}.`,
      'success',
    );
    return { ok: true, booking: newBooking };
  };

  // Deterministic NORDEN Flow candidate generator on cancellation
  const cancelBooking = (bookingId: string, reason = 'Cancelado pela gestão/cliente (demo)') => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target || target.status === 'CANCELADO' || target.status === 'CONCLUIDO') return;

    const freedStart = timeToMinutes(target.startTime);
    const freedEnd = timeToMinutes(target.endTime);
    const freedDuration = freedEnd - freedStart;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'CANCELADO',
              cancelledAt: new Date().toISOString(),
              cancelReason: reason,
            }
          : b,
      ),
    );

    // Find eligible later bookings on same day with same professional whose duration fits <= freedDuration
    const candidates = bookings
      .filter((b) => {
        if (b.id === target.id) return false;
        if (b.status !== 'CONFIRMADO' && b.status !== 'PENDENTE') return false;
        if (b.professionalId !== target.professionalId) return false;
        if (b.date !== target.date) return false;
        const candStart = timeToMinutes(b.startTime);
        // Only suggest moving earlier into the freed window
        if (candStart <= freedStart) return false;
        // Strict deterministic duration rule: e.g. 60 min window accepts 45 min, rejects 90 min
        if (b.durationMin > freedDuration) return false;
        return true;
      })
      .sort((a, b) => b.durationMin - a.durationMin);

    if (candidates.length > 0) {
      const newSuggestions: RescheduleOffer[] = candidates.map((cand) => ({
        id: `flow-${Date.now()}-${cand.id}`,
        sourceCancelledBookingId: target.id,
        targetBookingId: cand.id,
        clientId: cand.clientId,
        clientName: cand.clientName,
        serviceName: cand.serviceName,
        serviceDurationMin: cand.durationMin,
        professionalId: target.professionalId,
        professionalName: target.professionalName,
        originalDate: cand.date,
        originalStartTime: cand.startTime,
        originalEndTime: cand.endTime,
        proposedDate: target.date,
        proposedStartTime: target.startTime,
        proposedEndTime: addMinutesToTime(target.startTime, cand.durationMin),
        freedWindowMin: freedDuration,
        reason: `Janela de ${freedDuration} min liberada às ${target.startTime}. Serviço de ${cand.durationMin} min cabe com margem e antecipa o atendimento com ${target.professionalName}.`,
        status: 'SUGERIDA',
        createdAt: new Date().toISOString(),
      }));

      setFlowOffers((prev) => [...newSuggestions, ...prev]);
      pushToast(
        'NORDEN Flow detectou encaixes',
        `${newSuggestions.length} sugestão(ões) determinística(s) pronta(s) para revisão do gestor.`,
        'success',
      );
    } else {
      pushToast('Reserva cancelada', 'Janela liberada na agenda sem candidatos elegíveis no mesmo dia.');
    }
  };

  const sendFlowOffer = (offerId: string) => {
    if (!flowOffers.some((offer) => offer.id === offerId && offer.status === 'SUGERIDA')) return;
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    setFlowOffers((prev) =>
      prev.map((offer) => offer.id === offerId && offer.status === 'SUGERIDA'
        ? { ...offer, status: 'OFERTADA', expiresAt }
        : offer),
    );
    pushToast(
      'Oferta enviada ao cliente',
      'O cliente já pode aceitar ou recusar na Área do Cliente (NORDEN Flow).',
      'success',
    );
  };

  const respondToFlowOffer = (offerId: string, decision: 'accept' | 'decline') => {
    const offer = flowOffers.find((o) => o.id === offerId);
    if (!offer || offer.status !== 'OFERTADA' || offer.clientId !== clientProfile.id) return;

    const target = bookings.find((booking) => booking.id === offer.targetBookingId);
    const expired = (
      (offer.expiresAt !== undefined && offer.expiresAt <= Date.now()) ||
      new Date(`${offer.proposedDate}T${offer.proposedStartTime}`).getTime() <= Date.now()
    );
    if (expired || !target ||
        (target.status !== 'CONFIRMADO' && target.status !== 'PENDENTE') ||
        target.date !== offer.originalDate || target.startTime !== offer.originalStartTime) {
      setFlowOffers((prev) => prev.map((item) => item.id === offerId
        ? { ...item, status: expired ? 'EXPIRADA' : 'INVALIDADA' }
        : item));
      pushToast('Oferta indisponível', 'A janela de encaixe não pode mais ser utilizada.', 'warning');
      return;
    }

    if (decision === 'decline') {
      setFlowOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: 'RECUSADA' } : o)),
      );
      pushToast(
        'Oferta recusada',
        `Seu horário original (${offer.originalStartTime}) permanece garantido.`,
      );
      return;
    }

    // Atomic validation before swapping
    const propStart = timeToMinutes(offer.proposedStartTime);
    const propEnd = timeToMinutes(offer.proposedEndTime);
    const slotNowBusy = bookings.some(
      (b) =>
        b.id !== offer.targetBookingId &&
        b.date === offer.proposedDate &&
        (b.professionalId === offer.professionalId || b.clientId === offer.clientId) &&
        b.status !== 'CANCELADO' &&
        b.status !== 'CONCLUIDO' &&
        rangesOverlap(propStart, propEnd, timeToMinutes(b.startTime), timeToMinutes(b.endTime)),
    );

    if (slotNowBusy) {
      setFlowOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: 'INVALIDADA' } : o)),
      );
      pushToast(
        'Horário já preenchido',
        `A oferta foi invalidada e sua reserva original às ${offer.originalStartTime} foi preservada.`,
        'warning',
      );
      return;
    }

    // Commit atomic swap + invalidate competing offers for the same cancelled window
    setBookings((prev) =>
      prev.map((b) =>
        b.id === offer.targetBookingId
          ? {
              ...b,
              date: offer.proposedDate,
              startTime: offer.proposedStartTime,
              endTime: offer.proposedEndTime,
            }
          : b,
      ),
    );

    setFlowOffers((prev) =>
      prev.map((o) => {
        if (o.id === offerId) return { ...o, status: 'EFETIVADA' };
        if (
          o.sourceCancelledBookingId === offer.sourceCancelledBookingId &&
          (o.status === 'SUGERIDA' || o.status === 'OFERTADA')
        ) {
          return { ...o, status: 'INVALIDADA' };
        }
        return o;
      }),
    );

    pushToast(
      'Realocação efetivada',
      `Novo horário confirmado: ${offer.proposedStartTime} com ${offer.professionalName}.`,
      'success',
    );
  };

  const startAppointment = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId && b.status === 'CONFIRMADO' ? { ...b, status: 'EM_ATENDIMENTO' } : b)),
    );
    pushToast('Atendimento iniciado', 'Status atualizado para Em Atendimento na agenda.');
  };

  const completeAppointment: NordenContextValue['completeAppointment'] = ({
    bookingId,
    summary,
    clientVisibleNotes,
    internalNotes,
    usedProducts,
    recommendedProducts,
    customFirst24Hours,
  }) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target || target.status === 'CONCLUIDO' || target.status === 'CANCELADO') return;

    // Idempotency guard: never create duplicate appointment for same booking
    if (completedAppointments.some((a) => a.bookingId === bookingId)) return;

    const srv = services.find((s) => s.id === target.serviceId);
    const tpl = CARE_TEMPLATES[srv?.careTemplateId ?? 'tpl-corte'] ?? CARE_TEMPLATES['tpl-corte'];

    const nowLabel = new Date().toLocaleDateString('pt-BR');
    const newCompleted: CompletedAppointment = {
      id: `apt-${crypto.randomUUID()}`,
      bookingId: target.id,
      clientId: target.clientId,
      clientName: target.clientName,
      serviceId: target.serviceId,
      serviceName: target.serviceName,
      professionalId: target.professionalId,
      professionalName: target.professionalName,
      date: target.date,
      durationMin: target.durationMin,
      priceCents: target.priceCents,
      summary: summary.trim() || `Execução completa de ${target.serviceName}.`,
      clientVisibleNotes: clientVisibleNotes.trim() || 'Procedimento finalizado conforme alinhamento.',
      internalNotes: internalNotes.trim(),
      beforeImage: ASSETS.transformLucasBefore,
      afterImage: ASSETS.transformLucasAfter,
      usedProducts: usedProducts.map((u) => ({
        ...u,
        appliedArea: u.appliedArea || 'No cabelo',
      })),
      recommendedProducts,
      careManual: {
        ...tpl,
        first24Hours: customFirst24Hours && customFirst24Hours.length > 0 ? customFirst24Hours : tpl.first24Hours,
        reviewedBy: target.professionalName,
        reviewedAt: `${nowLabel} · validado`,
      },
      completedAt: new Date().toISOString(),
    };

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'CONCLUIDO' } : b)),
    );
    setCompletedAppointments((prev) => [newCompleted, ...prev]);

    pushToast(
      'Atendimento concluído',
      'NORDEN Journey e Manual Care publicados para o cliente.',
      'success',
    );
  };

  // Cart & Store
  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  const cartSubtotalCents = useMemo(() => {
    return cart.reduce((acc, item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (!p) return acc;
      const unit = p.promoPriceCents ?? p.priceCents;
      return acc + unit * item.quantity;
    }, 0);
  }, [cart, products]);

  const addToCart = (productId: string, qty = 1): boolean => {
    const product = products.find((p) => p.id === productId);
    if (!product || !product.active) {
      pushToast('Produto indisponível', 'Este item está inativo no catálogo.', 'warning');
      return false;
    }
    const available = getAvailableStock(product.physicalStock, product.reservedStock);
    const existingQty = cart.find((c) => c.productId === productId)?.quantity ?? 0;
    if (existingQty + qty > available) {
      pushToast(
        'Limite de estoque atingido',
        `Apenas ${available} unidade(s) disponível(is) de ${product.name}.`,
        'warning',
      );
      return false;
    }
    setCart((prev) => {
      const exists = prev.find((c) => c.productId === productId);
      if (exists) {
        return prev.map((c) =>
          c.productId === productId ? { ...c, quantity: c.quantity + qty } : c,
        );
      }
      return [...prev, { productId, quantity: qty }];
    });
    pushToast('Adicionado à sacola', `${product.name} · ${formatBRL(product.promoPriceCents ?? product.priceCents)}`, 'success');
    return true;
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const available = getAvailableStock(product.physicalStock, product.reservedStock);
    if (qty > available) {
      pushToast(
        'Quantidade indisponível',
        `Máximo disponível em estoque: ${available} un.`,
        'warning',
      );
      return;
    }
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c)));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const calculateDeliveryQuote: NordenContextValue['calculateDeliveryQuote'] = (
    modality,
    distanceKm,
  ) => {
    if (modality === 'RETIRADA') {
      return { allowed: true, feeCents: 0 };
    }
    if (Number.isNaN(distanceKm) || distanceKm <= 0) {
      return { allowed: false, feeCents: 0, reason: 'Informe uma distância estimada válida (km).' };
    }
    if (distanceKm > deliverySettings.maxRadiusKm) {
      return {
        allowed: false,
        feeCents: 0,
        reason: `Fora da área de cobertura (máximo ${deliverySettings.maxRadiusKm} km). Selecione Retirada no Salão.`,
      };
    }
    const computed =
      deliverySettings.baseFeeCents + Math.round(distanceKm * deliverySettings.rateCentsPerKm);
    const feeCents = Math.max(deliverySettings.minFeeCents, computed);
    return { allowed: true, feeCents };
  };

  const checkoutOrder: NordenContextValue['checkoutOrder'] = ({
    modality,
    distanceKm = 0,
    address,
    recipientName,
  }) => {
    if (cart.length === 0) {
      return { ok: false, error: 'Sua sacola está vazia.' };
    }

    // Revalidate stock & pricing atomically
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.productId && p.active);
      if (!prod) {
        return { ok: false, error: 'Um item da sacola não está mais disponível.' };
      }
      const available = getAvailableStock(prod.physicalStock, prod.reservedStock);
      if (item.quantity > available) {
        return {
          ok: false,
          error: `Estoque insuficiente para ${prod.name} (disponível: ${available}).`,
        };
      }
    }

    const quote = calculateDeliveryQuote(modality, distanceKm);
    if (!quote.allowed) {
      return { ok: false, error: quote.reason || 'Modalidade indisponível.' };
    }

    const orderItems = cart.map((item) => {
      const prod = products.find((p) => p.id === item.productId)!;
      return {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: item.quantity,
        unitPriceCents: prod.promoPriceCents ?? prod.priceCents,
      };
    });

    const subtotalCents = orderItems.reduce(
      (sum, it) => sum + it.unitPriceCents * it.quantity,
      0,
    );
    const totalCents = subtotalCents + quote.feeCents;
    const code = `NRD-${new Date().getFullYear()}-${String(420 + orders.length).padStart(4, '0')}`;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      code,
      clientId: clientProfile.id,
      clientName: recipientName.trim() || clientProfile.name,
      modality,
      status: 'RECEBIDO',
      financialStatus: 'SIMULADO',
      items: orderItems,
      subtotalCents,
      deliveryFeeCents: quote.feeCents,
      distanceKm: modality === 'ENTREGA' ? distanceKm : undefined,
      totalCents,
      address: modality === 'ENTREGA' ? address : undefined,
      stockDeducted: false,
      createdAt: new Date().toISOString(),
      events: [
        {
          status: 'RECEBIDO',
          timestamp: `Hoje · ${nowTime}`,
          actor: recipientName.trim() || clientProfile.name,
          note:
            modality === 'RETIRADA'
              ? 'Retirada no salão · Pagamento simulado (demo).'
              : `Entrega estimada (${distanceKm} km) · Pagamento simulado (demo).`,
        },
      ],
    };

    // Reserve stock atomically
    setProducts((prev) =>
      prev.map((prod) => {
        const line = orderItems.find((i) => i.productId === prod.id);
        if (!line) return prod;
        return {
          ...prod,
          reservedStock: prod.reservedStock + line.quantity,
        };
      }),
    );

    // Log inventory reservation movements
    const newMovs: InventoryMovement[] = orderItems.map((line) => ({
      id: `mov-${Date.now()}-${line.productId}`,
      productId: line.productId,
      productName: line.name,
      type: 'RESERVA',
      quantityDelta: -line.quantity,
      actor: 'NORDEN Store',
      reason: `Reserva do pedido ${code}`,
      timestamp: `Hoje · ${nowTime}`,
    }));
    setMovements((prev) => [...newMovs, ...prev]);

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    if (role !== 'client') {
      setRole('client');
    }

    pushToast(
      `Pedido ${code} registrado`,
      `Total ${formatBRL(totalCents)} (Simulado) · Estoque reservado automaticamente.`,
      'success',
    );
    return { ok: true, order: newOrder };
  };

  const advanceOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord || ord.status === nextStatus || ord.status === 'CANCELADO' || ord.status === 'CONCLUIDO') return;

    // Enforce modality rules
    if (ord.modality === 'RETIRADA' && nextStatus === 'SAIU_ENTREGA') {
      pushToast('Transição bloqueada', 'Pedido de retirada não pode sair para entrega.', 'warning');
      return;
    }
    if (ord.modality === 'ENTREGA' && nextStatus === 'PRONTO_RETIRADA') {
      pushToast('Transição bloqueada', 'Pedido de entrega não usa status de retirada.', 'warning');
      return;
    }

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const shouldDeductNow = !ord.stockDeducted && (nextStatus === 'SAIU_ENTREGA' || nextStatus === 'CONCLUIDO');
    const shouldReleaseNow = !ord.stockDeducted && nextStatus === 'CANCELADO';

    if (shouldDeductNow) {
      setProducts((prev) =>
        prev.map((prod) => {
          const line = ord.items.find((i) => i.productId === prod.id);
          if (!line) return prod;
          return {
            ...prod,
            physicalStock: Math.max(0, prod.physicalStock - line.quantity),
            reservedStock: Math.max(0, prod.reservedStock - line.quantity),
          };
        }),
      );
      const movs: InventoryMovement[] = ord.items.map((line) => ({
        id: `mov-out-${Date.now()}-${line.productId}`,
        productId: line.productId,
        productName: line.name,
        type: 'SAIDA_VENDA',
        quantityDelta: -line.quantity,
        actor: 'Rafael Almeida',
        reason: `Expedição/conclusão do pedido ${ord.code}`,
        timestamp: `Hoje · ${nowTime}`,
      }));
      setMovements((prev) => [...movs, ...prev]);
    } else if (shouldReleaseNow) {
      setProducts((prev) =>
        prev.map((prod) => {
          const line = ord.items.find((i) => i.productId === prod.id);
          if (!line) return prod;
          return {
            ...prod,
            reservedStock: Math.max(0, prod.reservedStock - line.quantity),
          };
        }),
      );
      const movs: InventoryMovement[] = ord.items.map((line) => ({
        id: `mov-rel-${Date.now()}-${line.productId}`,
        productId: line.productId,
        productName: line.name,
        type: 'LIBERACAO',
        quantityDelta: line.quantity,
        actor: 'Rafael Almeida',
        reason: `Estorno de reserva por cancelamento (${ord.code})`,
        timestamp: `Hoje · ${nowTime}`,
      }));
      setMovements((prev) => [...movs, ...prev]);
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              stockDeducted: o.stockDeducted || shouldDeductNow,
              events: [
                ...o.events,
                {
                  status: nextStatus,
                  timestamp: `Hoje · ${nowTime}`,
                  actor: 'Rafael Almeida',
                },
              ],
            }
          : o,
      ),
    );

    pushToast(`Pedido ${ord.code} atualizado`, `Novo status: ${nextStatus.replace('_', ' ')}.`, 'success');
  };

  const adjustStock = (productId: string, delta: number, reason: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const nextPhysical = target.physicalStock + delta;
    if (nextPhysical < target.reservedStock) {
      pushToast(
        'Ajuste bloqueado',
        `Saldo físico não pode ficar abaixo do reservado (${target.reservedStock} un.).`,
        'warning',
      );
      return;
    }

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, physicalStock: nextPhysical } : p)),
    );
    setMovements((prev) => [
      {
        id: `mov-adj-${Date.now()}`,
        productId,
        productName: target.name,
        type: delta > 0 ? 'ENTRADA' : 'AJUSTE',
        quantityDelta: delta,
        actor: 'Rafael Almeida',
        reason,
        timestamp: `Hoje · ${nowTime}`,
      },
      ...prev,
    ]);
    pushToast(
      'Estoque atualizado',
      `${target.name}: saldo físico ajustado para ${nextPhysical} un.`,
      'success',
    );
  };

  // Combine 6-month baseline with live session completions & simulated orders in Nov
  const monthlyFinancials = useMemo<MonthlyFinancialPoint[]>(() => {
    const extraCompleted = completedAppointments.filter(
      (a) => !INITIAL_COMPLETED_APPOINTMENTS.some((seed) => seed.id === a.id),
    );
    const extraServiceCents = extraCompleted.reduce((acc, a) => acc + a.priceCents, 0);

    const extraOrders = orders.filter(
      (o) => o.status !== 'CANCELADO' && !INITIAL_ORDERS.some((seed) => seed.id === o.id),
    );
    const extraStoreCents = extraOrders.reduce((acc, o) => acc + o.subtotalCents, 0);

    return INITIAL_MONTHLY_FINANCIALS.map((pt, idx) => {
      if (idx !== INITIAL_MONTHLY_FINANCIALS.length - 1) return pt;
      return {
        ...pt,
        serviceRevenueCents: pt.serviceRevenueCents + extraServiceCents,
        storeDemoRevenueCents: pt.storeDemoRevenueCents + extraStoreCents,
        completedServicesCount: pt.completedServicesCount + extraCompleted.length,
        storeOrdersCount: pt.storeOrdersCount + extraOrders.length,
      };
    });
  }, [completedAppointments, orders]);

  const resetDemoData = () => {
    setClientProfile(INITIAL_CLIENT_PROFILE);
    setProducts(INITIAL_PRODUCTS);
    setBookings(INITIAL_BOOKINGS);
    setFlowOffers(INITIAL_FLOW_OFFERS);
    setCompletedAppointments(INITIAL_COMPLETED_APPOINTMENTS);
    setCart([]);
    setOrders(INITIAL_ORDERS);
    setMovements(INITIAL_INVENTORY_MOVEMENTS);
    pushToast('Ambiente demo restaurado', 'Todos os registros voltaram ao estado inicial.');
  };

  const value: NordenContextValue = {
    currentView,
    setCurrentView,
    preselectedServiceId,
    preselectedProfessionalId,
    startBookingWithService,
    isAuthModalOpen,
    setAuthModalOpen,
    isCartOpen,
    setCartOpen,
    toasts,
    pushToast,
    dismissToast,
    theme,
    setTheme,
    toggleTheme,
    role,
    switchRole,
    clientProfile,
    updateClientProfile,
    services,
    professionals,
    products,
    deliverySettings,
    bookings,
    flowOffers,
    getAvailableSlots,
    createBooking,
    cancelBooking,
    sendFlowOffer,
    respondToFlowOffer,
    completedAppointments,
    startAppointment,
    completeAppointment,
    cart,
    cartCount,
    cartSubtotalCents,
    addToCart,
    updateCartQty,
    removeFromCart,
    calculateDeliveryQuote,
    checkoutOrder,
    orders,
    advanceOrderStatus,
    adjustStock,
    movements,
    monthlyFinancials,
    resetDemoData,
  };

  return <NordenContext.Provider value={value}>{children}</NordenContext.Provider>;
};

export function useNorden() {
  const ctx = useContext(NordenContext);
  if (!ctx) {
    throw new Error('useNorden must be used within NordenProvider');
  }
  return ctx;
}
