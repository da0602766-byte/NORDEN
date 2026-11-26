import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeftRight,
  Calendar,
  Check,
  Clock,
  FileText,
  History,
  Package,
  Plus,
  ShieldAlert,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { ASSETS } from '../data/seedData';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { SafeImage } from '../components/SafeImage';
import { formatBRL, formatDateBR, getAvailableStock } from '../utils/format';
import type { AllergyStatus } from '../types';

type ClientTab = 'overview' | 'journey' | 'orders' | 'profile';

export const ClientHubView: React.FC = () => {
  const {
    clientProfile,
    updateClientProfile,
    bookings,
    cancelBooking,
    flowOffers,
    respondToFlowOffer,
    completedAppointments,
    products,
    addToCart,
    setCartOpen,
    orders,
    startBookingWithService,
    setCurrentView,
    switchRole,
  } = useNorden();

  const [activeTab, setActiveTab] = useState<ClientTab>('overview');

  const clientBookings = useMemo(
    () => bookings.filter((b) => b.clientId === clientProfile.id),
    [bookings, clientProfile.id],
  );
  const upcomingBookings = useMemo(
    () =>
      clientBookings.filter(
        (b) => b.status === 'CONFIRMADO' || b.status === 'PENDENTE' || b.status === 'EM_ATENDIMENTO',
      ),
    [clientBookings],
  );
  const clientOffers = useMemo(
    () => flowOffers.filter((o) => o.clientId === clientProfile.id && o.status === 'OFERTADA'),
    [flowOffers, clientProfile.id],
  );
  const clientJourney = useMemo(
    () => completedAppointments.filter((a) => a.clientId === clientProfile.id),
    [completedAppointments, clientProfile.id],
  );
  const clientOrders = useMemo(
    () => orders.filter((o) => o.clientId === clientProfile.id),
    [orders, clientProfile.id],
  );

  const [selectedJourneyId, setSelectedJourneyId] = useState<string>(clientJourney[0]?.id ?? '');

  const selectedJourney =
    clientJourney.find((a) => a.id === selectedJourneyId) ?? clientJourney[0] ?? null;

  // Profile form state
  const [stylePref, setStylePref] = useState(clientProfile.stylePreferences);
  const [beardPref, setBeardPref] = useState(clientProfile.beardPreferences);
  const [allergyStatus, setAllergyStatus] = useState<AllergyStatus>(clientProfile.allergyStatus);
  const [allergyDetails, setAllergyDetails] = useState(clientProfile.allergyDetails);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateClientProfile({
      stylePreferences: stylePref,
      beardPreferences: beardPref,
      allergyStatus,
      allergyDetails: allergyStatus === 'SIM' ? allergyDetails : '',
    });
  };

  const initials = clientProfile.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const TABS: Array<{
    id: ClientTab;
    shortLabel: string;
    desktopLabel: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    {
      id: 'overview',
      shortLabel: 'Agenda',
      desktopLabel:
        clientOffers.length > 0 ? `Agenda & Flow (${clientOffers.length})` : 'Agenda & Resumo',
      icon: Calendar,
      badge: clientOffers.length > 0 ? clientOffers.length : undefined,
    },
    {
      id: 'journey',
      shortLabel: 'Jornada',
      desktopLabel: `Linha do Tempo (${clientJourney.length})`,
      icon: History,
    },
    {
      id: 'orders',
      shortLabel: 'Pedidos',
      desktopLabel: `Meus Pedidos (${clientOrders.length})`,
      icon: Package,
    },
    {
      id: 'profile',
      shortLabel: 'Perfil',
      desktopLabel: 'Preferências & Ficha',
      icon: User,
    },
  ];

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6 sm:py-12">
      {/* Compact, Crystal-Clear Client Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center font-display text-base font-semibold text-[var(--accent)] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
              Perfil Cliente
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] truncate">
              Olá, {clientProfile.name.split(' ')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              {upcomingBookings.length} agendado · {clientJourney.length} visitas no histórico ·{' '}
              {clientOrders.length} pedido(s)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => switchRole('manager')}
            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span>Ir para Gestor</span>
          </button>
          <button
            type="button"
            onClick={() => startBookingWithService(null, null)}
            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Novo Horário</span>
          </button>
        </div>
      </div>

      {/* Zero-Overflow Navigation: 4-Column Touch Grid on Mobile, Clean Tabs on Desktop */}
      <div className="py-4 border-b border-[var(--border-subtle)]">
        <div className="grid grid-cols-4 md:flex md:items-center gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative min-h-[54px] md:min-h-[40px] flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl md:rounded-lg text-[11px] md:text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-fg)] shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="md:hidden truncate max-w-full">{tab.shortLabel}</span>
                <span className="hidden md:inline whitespace-nowrap">{tab.desktopLabel}</span>
                {tab.badge && (
                  <span className="md:hidden absolute top-1.5 right-2 text-[10px] font-mono font-bold text-[var(--accent)]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & NORDEN FLOW */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-6"
        >
          {/* At-a-glance Mobile-Friendly Summary Strip */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--text-muted)]">Próximo</p>
              <p className="mt-1 font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--text-primary)] truncate">
                {upcomingBookings[0] ? upcomingBookings[0].startTime : 'Livre'}
              </p>
              <p className="text-[11px] text-[var(--accent)] truncate mt-0.5">
                {upcomingBookings[0] ? formatDateBR(upcomingBookings[0].date) : 'Agendar'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('journey')}
              className="text-left p-3.5 sm:p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <p className="text-[11px] text-[var(--text-muted)]">Jornada</p>
              <p className="mt-1 font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--text-primary)]">
                {clientJourney.length} visitas
              </p>
              <p className="text-[11px] text-[var(--accent)] truncate mt-0.5">Ver Antes/Depois</p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="text-left p-3.5 sm:p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <p className="text-[11px] text-[var(--text-muted)]">Pedidos</p>
              <p className="mt-1 font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--text-primary)]">
                {clientOrders.length} ativo(s)
              </p>
              <p className="text-[11px] text-[var(--accent)] truncate mt-0.5">Acompanhar</p>
            </button>
          </div>

          {/* Active NORDEN Flow Offers */}
          {clientOffers.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className="font-display text-base sm:text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  Horário mais cedo disponível (NORDEN Flow)
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  Opcional · Sua reserva atual continua garantida
                </span>
              </div>

              {clientOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 sm:p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent)]/60 space-y-4 shadow-sm"
                >
                  <div>
                    <p className="text-xs font-medium text-[var(--accent)]">
                      {offer.serviceName} · {offer.professionalName}
                    </p>
                    <p className="text-sm text-[var(--text-primary)] mt-1 leading-relaxed">
                      {offer.reason}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                      <p className="text-[11px] text-[var(--text-muted)]">Horário atual</p>
                      <p className="mt-1 font-mono text-xs sm:text-sm font-medium tabular-nums text-[var(--text-primary)]">
                        {formatDateBR(offer.originalDate)}
                      </p>
                      <p className="font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--text-secondary)]">
                        {offer.originalStartTime} – {offer.originalEndTime}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--accent)]">
                      <p className="text-[11px] font-medium text-[var(--accent)]">Novo horário</p>
                      <p className="mt-1 font-mono text-xs sm:text-sm font-medium tabular-nums text-[var(--text-primary)]">
                        {formatDateBR(offer.proposedDate)}
                      </p>
                      <p className="font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--accent)]">
                        {offer.proposedStartTime} – {offer.proposedEndTime}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => respondToFlowOffer(offer.id, 'accept')}
                      className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Aceitar Antecipação
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToFlowOffer(offer.id, 'decline')}
                      className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface-alt)] border border-[var(--border-strong)] hover:border-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Manter Horário Atual
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Upcoming Bookings + Latest Journey Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  Seus Agendamentos
                </h2>
                <button
                  type="button"
                  onClick={() => startBookingWithService(null, null)}
                  className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
                >
                  + Agendar outro
                </button>
              </div>

              {upcomingBookings.length === 0 ? (
                <div className="p-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
                  <Calendar className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-3 stroke-[1.5]" />
                  <p className="text-sm text-[var(--text-primary)] font-medium">
                    Nenhum horário futuro reservado
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Escolha seu serviço e especialista em poucos cliques.
                  </p>
                  <button
                    type="button"
                    onClick={() => startBookingWithService(null, null)}
                    className="mt-4 min-h-[42px] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] rounded-lg cursor-pointer"
                  >
                    Agendar Agora
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-mono tabular-nums font-medium text-[var(--accent)]">
                          {bk.status} · {formatDateBR(bk.date)} · {bk.startTime} – {bk.endTime}
                        </p>
                        <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                          {bk.serviceName}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Com {bk.professionalName} · {bk.durationMin} min ·{' '}
                          <span className="font-mono tabular-nums text-[var(--text-primary)]">
                            {formatBRL(bk.priceCents)}
                          </span>
                        </p>
                      </div>

                      {bk.status === 'CONFIRMADO' && (
                        <button
                          type="button"
                          onClick={() =>
                            cancelBooking(bk.id, 'Cancelado pelo cliente na Área do Cliente.')
                          }
                          className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--status-warn)] border border-[var(--border-strong)] hover:border-[var(--status-warn)] rounded-lg transition-colors cursor-pointer"
                        >
                          Cancelar reserva
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-3.5">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Último Corte &amp; Produtos
              </h2>

              {clientJourney[0] ? (
                <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                      {formatDateBR(clientJourney[0].date)} · {clientJourney[0].professionalName}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] mt-1">
                      {clientJourney[0].serviceName}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                      {clientJourney[0].summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJourneyId(clientJourney[0].id);
                        setActiveTab('journey');
                      }}
                      className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface-alt)] hover:border-[var(--accent)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer"
                    >
                      Abrir Antes/Depois e Produtos Usados
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                  Seus atendimentos concluídos aparecerão automaticamente aqui.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: NORDEN JOURNEY & CARE */}
      {activeTab === 'journey' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Visit Switcher: Compact Horizontal Cards on Mobile, Vertical Timeline on Desktop */}
          <div className="lg:col-span-4 space-y-2.5">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Selecione uma visita ({clientJourney.length} registradas)
            </p>
            <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {clientJourney.map((apt, idx) => {
                const active = selectedJourney?.id === apt.id;
                return (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => setSelectedJourneyId(apt.id)}
                    className={`min-w-[210px] lg:min-w-0 lg:w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[var(--bg-surface)] border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg-surface-alt)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <p className="text-[11px] font-mono tabular-nums font-medium text-[var(--accent)]">
                      Visita #{clientJourney.length - idx} · {formatDateBR(apt.date)}
                    </p>
                    <p className="font-display text-sm sm:text-base font-semibold text-[var(--text-primary)] mt-0.5 truncate">
                      {apt.serviceName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {apt.professionalName} · {apt.durationMin} min
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Detailed Record + Frozen Care Manual */}
          <div className="lg:col-span-8">
            {selectedJourney ? (
              <div className="space-y-5">
                {/* Summary + Visual Before & After Transformation */}
                <div className="p-4 sm:p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                        {formatDateBR(selectedJourney.date)} · {selectedJourney.professionalName} ·{' '}
                        {selectedJourney.durationMin} min
                      </p>
                      <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mt-1">
                        {selectedJourney.serviceName}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        startBookingWithService(
                          selectedJourney.serviceId,
                          selectedJourney.professionalId,
                        )
                      }
                      className="w-full sm:w-auto min-h-[42px] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg shrink-0 cursor-pointer"
                    >
                      Repetir este serviço
                    </button>
                  </div>

                  {/* Interactive Before & After Visual Record */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    <div className="md:col-span-6">
                      <BeforeAfterSlider
                        beforeSrc={selectedJourney.beforeImage || ASSETS.transformLucasBefore}
                        afterSrc={selectedJourney.afterImage || ASSETS.transformLucasAfter}
                        beforeLabel="Antes"
                        afterLabel="Depois"
                        altSubject={`${selectedJourney.clientName} — ${selectedJourney.serviceName}`}
                        autoAnimate={true}
                      />
                    </div>
                    <div className="md:col-span-6 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                        Resultado Registrado
                      </p>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        {selectedJourney.summary}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        <span className="text-[var(--text-primary)] font-medium">
                          Nota do especialista:
                        </span>{' '}
                        {selectedJourney.clientVisibleNotes}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Used Products vs Recommended Products */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3.5">
                    <div>
                      <p className="text-xs text-[var(--accent)] font-semibold">
                        Produtos Usados em Você
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Itens exatos aplicados durante esta visita.
                      </p>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)]">
                      {selectedJourney.usedProducts.map((up, i) => {
                        const catalogProd = up.productId
                          ? products.find((p) => p.id === up.productId && p.active)
                          : null;
                        const avail = catalogProd
                          ? getAvailableStock(catalogProd.physicalStock, catalogProd.reservedStock)
                          : 0;
                        return (
                          <div
                            key={`${up.name}-${i}`}
                            className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3"
                          >
                            {catalogProd && (
                              <SafeImage
                                src={catalogProd.image}
                                alt={catalogProd.name}
                                className="w-14 h-14 rounded-lg object-cover shrink-0 bg-[var(--bg-surface-alt)]"
                              />
                            )}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  {up.appliedArea && (
                                    <span className="block text-[11px] text-[var(--accent)] font-medium">
                                      {up.appliedArea}
                                    </span>
                                  )}
                                  <p className="text-sm font-medium text-[var(--text-primary)]">
                                    {up.name}
                                  </p>
                                </div>
                                {catalogProd && (
                                  <span className="text-xs font-mono tabular-nums text-[var(--accent)] font-medium shrink-0">
                                    {formatBRL(catalogProd.promoPriceCents ?? catalogProd.priceCents)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                {up.usageNote}
                              </p>
                              {catalogProd && avail > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (addToCart(catalogProd.id, 1)) setCartOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline pt-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Comprar este produto
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3.5">
                    <div>
                      <p className="text-xs text-[var(--text-primary)] font-semibold">
                        Recomendações para Casa
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Sugestões opcionais para manter o acabamento.
                      </p>
                    </div>

                    <div className="divide-y divide-[var(--border-subtle)]">
                      {selectedJourney.recommendedProducts.map((rec) => {
                        const catalogProd = products.find(
                          (p) => p.id === rec.productId && p.active,
                        );
                        const avail = catalogProd
                          ? getAvailableStock(catalogProd.physicalStock, catalogProd.reservedStock)
                          : 0;
                        return (
                          <div key={rec.productId} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {rec.name}
                              </p>
                              {catalogProd && (
                                <span className="text-xs font-mono tabular-nums text-[var(--text-primary)] shrink-0">
                                  {formatBRL(catalogProd.promoPriceCents ?? catalogProd.priceCents)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                              {rec.reason}
                            </p>
                            {catalogProd && avail > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (addToCart(catalogProd.id, 1)) setCartOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline pt-0.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Adicionar à sacola
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Frozen NORDEN Care Manual */}
                <div className="p-4 sm:p-6 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-3.5 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--accent)] shrink-0" />
                      <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                        {selectedJourney.careManual.title}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {selectedJourney.careManual.version} · {selectedJourney.careManual.reviewedBy}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-[var(--accent)]">Primeiras 24 horas</p>
                      <ul className="space-y-1.5 text-[var(--text-muted)] leading-relaxed">
                        {selectedJourney.careManual.first24Hours.map((line, idx) => (
                          <li key={idx}>• {line}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-semibold text-[var(--text-primary)]">O que evitar</p>
                      <ul className="space-y-1.5 text-[var(--text-muted)] leading-relaxed">
                        {selectedJourney.careManual.avoidList.map((line, idx) => (
                          <li key={idx}>• {line}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-semibold text-[var(--text-primary)]">Manutenção diária</p>
                      <ul className="space-y-1.5 text-[var(--text-muted)] leading-relaxed">
                        {selectedJourney.careManual.dailyMaintenance.map((line, idx) => (
                          <li key={idx}>• {line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Retorno sugerido em {selectedJourney.careManual.suggestedReturnDays} dias
                    </span>
                    <span>Versão salva para este atendimento</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center text-sm text-[var(--text-muted)]">
                Nenhum procedimento concluído registrado ainda.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 3: MY ORDERS */}
      {activeTab === 'orders' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          {clientOrders.length === 0 ? (
            <div className="p-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center">
              <Package className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 stroke-[1.5]" />
              <p className="font-display text-lg text-[var(--text-primary)]">
                Nenhum pedido realizado ainda
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('store')}
                className="mt-4 min-h-[42px] px-5 py-2.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] rounded-lg cursor-pointer"
              >
                Visitar NORDEN Store
              </button>
            </div>
          ) : (
            clientOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 sm:p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-[var(--border-subtle)]">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      Pedido {ord.code}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {ord.modality === 'RETIRADA'
                        ? 'Retirada no Salão (Grátis)'
                        : `Entrega Estimada (${ord.distanceKm} km)`}{' '}
                      · {ord.financialStatus}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-baseline sm:items-end justify-between gap-2">
                    <p className="text-xs font-semibold text-[var(--accent)]">
                      {ord.status.replace(/_/g, ' ')}
                    </p>
                    <p className="font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
                      {formatBRL(ord.totalCents)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-7 space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Itens</p>
                    <div className="divide-y divide-[var(--border-subtle)] text-xs">
                      {ord.items.map((it) => (
                        <div key={it.sku} className="py-2 flex justify-between gap-4">
                          <span className="text-[var(--text-muted)]">
                            {it.quantity}×{' '}
                            <span className="text-[var(--text-primary)]">{it.name}</span>
                          </span>
                          <span className="font-mono tabular-nums text-[var(--text-primary)] shrink-0">
                            {formatBRL(it.unitPriceCents * it.quantity)}
                          </span>
                        </div>
                      ))}
                      <div className="py-2 flex justify-between gap-4 text-[var(--text-muted)]">
                        <span>Taxa de entrega</span>
                        <span className="font-mono tabular-nums text-[var(--text-primary)]">
                          {formatBRL(ord.deliveryFeeCents)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      Acompanhamento
                    </p>
                    <div className="space-y-2 text-xs">
                      {ord.events.map((ev, i) => (
                        <div key={i} className="flex justify-between gap-3 text-[var(--text-muted)]">
                          <span className="text-[var(--text-primary)]">
                            {ev.status.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono tabular-nums shrink-0">{ev.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* TAB 4: PROFILE & SAFETY */}
      {activeTab === 'profile' && (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveProfile}
          className="mt-6 max-w-2xl space-y-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-7"
        >
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
              Preferências &amp; Ficha de Sensibilidade
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Visível apenas para o especialista responsável pelo seu atendimento.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="pref-style"
                className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
              >
                Preferência de corte
              </label>
              <textarea
                id="pref-style"
                rows={2}
                value={stylePref}
                onChange={(e) => setStylePref(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="pref-beard"
                className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
              >
                Preferência de barba
              </label>
              <textarea
                id="pref-beard"
                rows={2}
                value={beardPref}
                onChange={(e) => setBeardPref(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
              <p className="text-xs font-semibold text-[var(--accent)] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Alguma alergia ou sensibilidade a cosméticos?
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { val: 'SIM', label: 'Sim' },
                    { val: 'NAO', label: 'Não' },
                    { val: 'NAO_SEI', label: 'Não sei' },
                    { val: 'PREFIRO_INFORMAR', label: 'Na hora' },
                  ] as Array<{ val: AllergyStatus; label: string }>
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setAllergyStatus(opt.val)}
                    className={`min-h-[42px] py-2 px-3 text-xs rounded-lg border transition-colors cursor-pointer ${
                      allergyStatus === opt.val
                        ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-fg)] border-[var(--tab-active-bg)] font-semibold'
                        : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {allergyStatus === 'SIM' && (
                <div>
                  <label
                    htmlFor="pref-allergy"
                    className="block text-xs text-[var(--text-muted)] mb-1.5"
                  >
                    Substâncias ou produtos conhecidos (opcional)
                  </label>
                  <textarea
                    id="pref-allergy"
                    rows={2}
                    value={allergyDetails}
                    onChange={(e) => setAllergyDetails(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              Consentimento registrado em {clientProfile.consentUpdatedAt}
            </span>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </motion.form>
      )}
    </div>
  );
};
