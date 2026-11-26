import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  Package,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { formatBRL, formatDateBR, getAvailableStock } from '../utils/format';
import type { Booking, OrderStatus } from '../types';

type ManagerTab = 'finance' | 'agenda' | 'flow' | 'inventory';

export const ManagerHubView: React.FC = () => {
  const {
    monthlyFinancials,
    bookings,
    startAppointment,
    completeAppointment,
    cancelBooking,
    flowOffers,
    sendFlowOffer,
    products,
    adjustStock,
    movements,
    orders,
    advanceOrderStatus,
    switchRole,
    pushToast,
  } = useNorden();

  const [activeTab, setActiveTab] = useState<ManagerTab>('finance');
  const [financeSeriesFilter, setFinanceSeriesFilter] = useState<'all' | 'services' | 'store'>(
    'all',
  );
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);

  // Completion modal state
  const [completingBooking, setCompletingBooking] = useState<Booking | null>(null);
  const [execSummary, setExecSummary] = useState('');
  const [execClientNote, setExecClientNote] = useState('');
  const [execInternalNote, setExecInternalNote] = useState('');
  const [usedProductIds, setUsedProductIds] = useState<string[]>([]);
  const [recommendedProductIds, setRecommendedProductIds] = useState<string[]>([]);

  const latestMonth = monthlyFinancials[monthlyFinancials.length - 1];
  const prevMonth = monthlyFinancials[monthlyFinancials.length - 2];

  const latestTotalCents = latestMonth.serviceRevenueCents + latestMonth.storeDemoRevenueCents;
  const prevTotalCents = prevMonth.serviceRevenueCents + prevMonth.storeDemoRevenueCents;
  const growthPct = Math.round(((latestTotalCents - prevTotalCents) / prevTotalCents) * 100);
  const netMarginCents = latestTotalCents - latestMonth.operatingCostCents;
  const avgTicketCents = Math.round(
    latestMonth.serviceRevenueCents / Math.max(1, latestMonth.completedServicesCount),
  );

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) => getAvailableStock(p.physicalStock, p.reservedStock) <= p.minStockAlert,
      ).length,
    [products],
  );

  const openSuggestionsCount = useMemo(
    () => flowOffers.filter((o) => o.status === 'SUGERIDA' || o.status === 'OFERTADA').length,
    [flowOffers],
  );

  const maxChartCents = useMemo(() => {
    return Math.max(
      ...monthlyFinancials.map((m) => {
        if (financeSeriesFilter === 'services') return m.serviceRevenueCents;
        if (financeSeriesFilter === 'store') return m.storeDemoRevenueCents;
        return m.serviceRevenueCents + m.storeDemoRevenueCents;
      }),
      1,
    );
  }, [monthlyFinancials, financeSeriesFilter]);

  const handleExportCsv = () => {
    const header =
      'Mes,Receita_Servicos_BRL,Vendas_Loja_Demo_BRL,Custos_BRL,Atendimentos,Pedidos_Demo,Ocupacao_Pct';
    const rows = monthlyFinancials.map((m) =>
      [
        m.monthKey,
        (m.serviceRevenueCents / 100).toFixed(2),
        (m.storeDemoRevenueCents / 100).toFixed(2),
        (m.operatingCostCents / 100).toFixed(2),
        m.completedServicesCount,
        m.storeOrdersCount,
        m.occupancyPct,
      ].join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'norden-relatorio-mensal-demo.csv';
    link.click();
    URL.revokeObjectURL(url);
    pushToast(
      'Relatório CSV exportado',
      'Resumo financeiro mensal demonstrativo baixado.',
      'success',
    );
  };

  const openCompletionForm = (bk: Booking) => {
    setCompletingBooking(bk);
    setExecSummary(`Execução completa de ${bk.serviceName} com acabamento sob medida.`);
    setExecClientNote('Fios e pele respondendo muito bem. Seguir orientações do manual Care.');
    setExecInternalNote('Nota interna (privada): manter guarda baixa na lateral direita.');
    setUsedProductIds(bk.preferredProductIds.length > 0 ? bk.preferredProductIds : ['prod-clay']);
    setRecommendedProductIds(['prod-oil']);
  };

  const handleFinalizeAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingBooking) return;
    completeAppointment({
      bookingId: completingBooking.id,
      summary: execSummary,
      clientVisibleNotes: execClientNote,
      internalNotes: execInternalNote,
      usedProducts: usedProductIds.map((pid) => {
        const p = products.find((prod) => prod.id === pid);
        return {
          productId: pid,
          name: p?.name ?? 'Produto de bancada',
          appliedArea: p?.category === 'Barba' ? 'Na barba' : 'No cabelo',
          usageNote: 'Aplicado durante a finalização pelo profissional.',
        };
      }),
      recommendedProducts: recommendedProductIds.map((pid) => {
        const p = products.find((prod) => prod.id === pid);
        return {
          productId: pid,
          name: p?.name ?? 'Produto recomendado',
          reason: 'Recomendado pelo profissional para preservação do resultado em casa.',
        };
      }),
    });
    setCompletingBooking(null);
  };

  const getNextAllowedOrderStatus = (
    modality: 'RETIRADA' | 'ENTREGA',
    current: OrderStatus,
  ): OrderStatus | null => {
    if (current === 'RECEBIDO') return 'EM_PREPARACAO';
    if (current === 'EM_PREPARACAO') {
      return modality === 'RETIRADA' ? 'PRONTO_RETIRADA' : 'SAIU_ENTREGA';
    }
    if (current === 'PRONTO_RETIRADA' || current === 'SAIU_ENTREGA') return 'CONCLUIDO';
    return null;
  };

  const TABS: Array<{
    id: ManagerTab;
    shortLabel: string;
    desktopLabel: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    {
      id: 'finance',
      shortLabel: 'Financeiro',
      desktopLabel: 'Financeiro Mensal',
      icon: BarChart3,
    },
    {
      id: 'agenda',
      shortLabel: 'Agenda',
      desktopLabel: `Agenda (${bookings.length})`,
      icon: Calendar,
      badge: bookings.filter((b) => b.status === 'CONFIRMADO' || b.status === 'EM_ATENDIMENTO')
        .length,
    },
    {
      id: 'flow',
      shortLabel: 'Flow',
      desktopLabel: `NORDEN Flow (${openSuggestionsCount})`,
      icon: Sparkles,
      badge: openSuggestionsCount > 0 ? openSuggestionsCount : undefined,
    },
    {
      id: 'inventory',
      shortLabel: 'Estoque',
      desktopLabel:
        lowStockCount > 0 ? `Estoque & Pedidos (${lowStockCount} alerta)` : 'Estoque & Pedidos',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-12">
      {/* Compact Operational Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center font-display text-base font-semibold text-[var(--accent)] shrink-0">
            RA
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
              Painel Gestor · Demo
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] truncate">
              Rafael Almeida
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              Financeiro, agenda do dia, realocações Flow e estoque.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => switchRole('client')}
            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span>Ir para Cliente</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Exportar CSV</span>
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
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="md:hidden absolute top-1.5 right-2 text-[10px] font-mono font-bold text-[var(--accent)]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: MONTHLY FINANCIAL REPORTS */}
      {activeTab === 'finance' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-6"
        >
          {/* Explicit demo financial separation notice */}
          <div className="px-4 py-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              <strong className="text-[var(--text-primary)]">Dados demo separados:</strong> Serviços e pedidos simulados da loja aparecem em colunas distintas.
            </span>
            <span className="font-mono font-medium text-[var(--accent)] shrink-0">
              Jun – Nov 2026
            </span>
          </div>

          {/* 2x2 Compact Mobile KPI Grid -> 4-Column Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">Serviços · Nov</p>
              <p className="mt-1.5 font-mono text-lg sm:text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {formatBRL(latestMonth.serviceRevenueCents)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--accent)] font-mono tabular-nums">
                {latestMonth.completedServicesCount} atend. · +{growthPct}%
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">Loja Demo · Nov</p>
              <p className="mt-1.5 font-mono text-lg sm:text-2xl font-semibold tabular-nums text-[var(--accent)]">
                {formatBRL(latestMonth.storeDemoRevenueCents)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                {latestMonth.storeOrdersCount} pedidos
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">Resultado Est.</p>
              <p className="mt-1.5 font-mono text-lg sm:text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {formatBRL(netMarginCents)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)] font-mono tabular-nums truncate">
                Custos: {formatBRL(latestMonth.operatingCostCents)}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">Ticket &amp; Ocup.</p>
              <p className="mt-1.5 font-mono text-lg sm:text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                {formatBRL(avgTicketCents)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                Ocupação: {latestMonth.occupancyPct}%
              </p>
            </div>
          </div>

          {/* Interactive Monthly Chart */}
          <div className="p-4 sm:p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                  Evolução Mensal
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Concluir atendimentos ou pedidos atualiza Novembro na hora.
                </p>
              </div>

              <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 bg-[var(--bg-surface-alt)] rounded-lg border border-[var(--border-subtle)]">
                {(
                  [
                    { id: 'all', label: 'Total' },
                    { id: 'services', label: 'Serviços' },
                    { id: 'store', label: 'Loja' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFinanceSeriesFilter(opt.id)}
                    className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      financeSeriesFilter === opt.id
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Bar Visualization */}
            <div className="pt-2">
              <div className="grid grid-cols-6 gap-2 sm:gap-6 items-end h-52 sm:h-60 pt-5 border-b border-[var(--border-subtle)] pb-2">
                {monthlyFinancials.map((m) => {
                  const srvPct = Math.round((m.serviceRevenueCents / maxChartCents) * 100);
                  const storePct = Math.round((m.storeDemoRevenueCents / maxChartCents) * 100);
                  const isHovered = hoveredMonthKey === m.monthKey;
                  const displayVal =
                    financeSeriesFilter === 'services'
                      ? m.serviceRevenueCents
                      : financeSeriesFilter === 'store'
                        ? m.storeDemoRevenueCents
                        : m.serviceRevenueCents + m.storeDemoRevenueCents;

                  return (
                    <div
                      key={m.monthKey}
                      onMouseEnter={() => setHoveredMonthKey(m.monthKey)}
                      onMouseLeave={() => setHoveredMonthKey(null)}
                      className="h-full flex flex-col justify-end items-center gap-1.5"
                    >
                      <span
                        className={`text-[10px] sm:text-[11px] font-mono tabular-nums transition-colors ${
                          isHovered ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {(displayVal / 100000).toFixed(1)}k
                      </span>

                      <div className="w-full max-w-[46px] h-full flex flex-col justify-end gap-0.5">
                        {(financeSeriesFilter === 'all' || financeSeriesFilter === 'store') && (
                          <div
                            style={{ height: `${Math.max(storePct, 6)}%` }}
                            className="w-full bg-[var(--accent)] rounded-t-sm transition-all duration-300"
                            title={`Loja Demo: ${formatBRL(m.storeDemoRevenueCents)}`}
                          />
                        )}
                        {(financeSeriesFilter === 'all' || financeSeriesFilter === 'services') && (
                          <div
                            style={{ height: `${Math.max(srvPct, 10)}%` }}
                            className={`w-full bg-[var(--text-primary)]/85 transition-all duration-300 ${
                              financeSeriesFilter === 'services' ? 'rounded-t-sm' : ''
                            }`}
                            title={`Serviços: ${formatBRL(m.serviceRevenueCents)}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-6 gap-2 sm:gap-6 pt-2.5 text-center">
                {monthlyFinancials.map((m) => (
                  <div key={m.monthKey} className="text-[11px] sm:text-xs font-mono text-[var(--text-muted)]">
                    {m.label}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[var(--text-primary)]/85" />
                  Receita de Serviços
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs bg-[var(--accent)]" />
                  Vendas Loja (Simulado)
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Card Ledger (< md) + Desktop Table (>= md) */}
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
              <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                Demonstrativo Mensal
              </h3>
            </div>

            {/* Mobile Cards (Zero Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-[var(--border-subtle)]">
              {[...monthlyFinancials].reverse().map((m) => {
                const result =
                  m.serviceRevenueCents + m.storeDemoRevenueCents - m.operatingCostCents;
                return (
                  <div key={m.monthKey} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                        {m.label} / 2026
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                        Ocupação {m.occupancyPct}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-[var(--bg-surface-alt)]">
                        <span className="block text-[10px] text-[var(--text-muted)]">Serviços</span>
                        <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
                          {formatBRL(m.serviceRevenueCents)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--bg-surface-alt)]">
                        <span className="block text-[10px] text-[var(--text-muted)]">Loja Demo</span>
                        <span className="font-mono tabular-nums font-medium text-[var(--accent)]">
                          {formatBRL(m.storeDemoRevenueCents)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[var(--bg-surface-alt)]">
                        <span className="block text-[10px] text-[var(--text-muted)]">Resultado</span>
                        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                          {formatBRL(result)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-6 font-medium">Mês</th>
                    <th className="py-3 px-4 font-medium text-right">Serviços</th>
                    <th className="py-3 px-4 font-medium text-right">Loja (Demo)</th>
                    <th className="py-3 px-4 font-medium text-right">Custos</th>
                    <th className="py-3 px-4 font-medium text-right">Resultado</th>
                    <th className="py-3 px-6 font-medium text-right">Ocupação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                  {[...monthlyFinancials].reverse().map((m) => {
                    const result =
                      m.serviceRevenueCents + m.storeDemoRevenueCents - m.operatingCostCents;
                    return (
                      <tr
                        key={m.monthKey}
                        className="hover:bg-[var(--bg-surface-alt)]/70 transition-colors"
                      >
                        <td className="py-3 px-6 font-medium text-[var(--text-primary)]">
                          {m.label} / 2026
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text-primary)]">
                          {formatBRL(m.serviceRevenueCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--accent)]">
                          {formatBRL(m.storeDemoRevenueCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text-muted)]">
                          {formatBRL(m.operatingCostCents)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                          {formatBRL(result)}
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums text-[var(--text-muted)]">
                          {m.occupancyPct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: AGENDA & CHAIR EXECUTION */}
      {activeTab === 'agenda' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">Teste rápido:</strong> Cancele a reserva de{' '}
            <em>Marcelo Tavares</em> para o motor <strong>NORDEN Flow</strong> sugerir o encaixe de{' '}
            <em>Lucas Martins</em> automaticamente.
          </div>

          {/* Mobile Agenda Cards (100% Scannable, Zero Horizontal Scroll) */}
          <div className="md:hidden space-y-3">
            {bookings.map((bk) => (
              <div
                key={bk.id}
                className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs tabular-nums font-semibold text-[var(--accent)]">
                      {formatDateBR(bk.date)} · {bk.startTime}–{bk.endTime} ({bk.durationMin}m)
                    </p>
                    <h3 className="font-display text-base font-semibold text-[var(--text-primary)] mt-0.5">
                      {bk.clientName}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {bk.serviceName} · {bk.professionalName}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-semibold shrink-0 ${
                      bk.status === 'CONCLUIDO'
                        ? 'text-[var(--accent)]'
                        : bk.status === 'CANCELADO'
                          ? 'text-[var(--status-danger)]'
                          : bk.status === 'EM_ATENDIMENTO'
                            ? 'text-[var(--status-warn)]'
                            : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {bk.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {bk.status === 'CONFIRMADO' && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => startAppointment(bk.id)}
                      className="min-h-[40px] px-2 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface-alt)] border border-[var(--border-strong)] rounded-lg cursor-pointer"
                    >
                      Iniciar
                    </button>
                    <button
                      type="button"
                      onClick={() => openCompletionForm(bk)}
                      className="min-h-[40px] px-2 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] rounded-lg cursor-pointer"
                    >
                      Concluir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        cancelBooking(bk.id, 'Cancelado no painel gestor (demo).');
                        setActiveTab('flow');
                      }}
                      className="min-h-[40px] px-2 text-xs font-medium text-[var(--status-warn)] border border-[var(--border-subtle)] rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {bk.status === 'EM_ATENDIMENTO' && (
                  <button
                    type="button"
                    onClick={() => openCompletionForm(bk)}
                    className="w-full min-h-[42px] px-3 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] rounded-lg cursor-pointer"
                  >
                    Finalizar &amp; Publicar Manual Care
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Agenda Table */}
          <div className="hidden md:block rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3.5 px-5 font-medium">Data &amp; Janela</th>
                    <th className="py-3.5 px-4 font-medium">Cliente</th>
                    <th className="py-3.5 px-4 font-medium">Serviço</th>
                    <th className="py-3.5 px-4 font-medium">Profissional</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-5 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                  {bookings.map((bk) => (
                    <tr
                      key={bk.id}
                      className="hover:bg-[var(--bg-surface-alt)]/70 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono text-xs tabular-nums text-[var(--text-primary)] whitespace-nowrap">
                        {formatDateBR(bk.date)} · {bk.startTime}–{bk.endTime} ({bk.durationMin}m)
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-primary)] font-medium whitespace-nowrap">
                        {bk.clientName}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-muted)]">{bk.serviceName}</td>
                      <td className="py-3.5 px-4 text-[var(--text-muted)] whitespace-nowrap">
                        {bk.professionalName}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono whitespace-nowrap">
                        <span
                          className={
                            bk.status === 'CONCLUIDO'
                              ? 'text-[var(--accent)]'
                              : bk.status === 'CANCELADO'
                                ? 'text-[var(--status-danger)]'
                                : bk.status === 'EM_ATENDIMENTO'
                                  ? 'text-[var(--status-warn)]'
                                  : 'text-[var(--text-primary)]'
                          }
                        >
                          {bk.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {bk.status === 'CONFIRMADO' && (
                            <>
                              <button
                                type="button"
                                onClick={() => startAppointment(bk.id)}
                                className="px-2.5 py-1.5 text-xs text-[var(--text-primary)] bg-[var(--bg-input)] hover:border-[var(--accent)] border border-[var(--border-strong)] rounded-md cursor-pointer"
                              >
                                Iniciar
                              </button>
                              <button
                                type="button"
                                onClick={() => openCompletionForm(bk)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md cursor-pointer"
                              >
                                Concluir
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  cancelBooking(bk.id, 'Cancelado no painel gestor (demo).');
                                  setActiveTab('flow');
                                }}
                                className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--status-warn)] cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {bk.status === 'EM_ATENDIMENTO' && (
                            <button
                              type="button"
                              onClick={() => openCompletionForm(bk)}
                              className="px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md cursor-pointer"
                            >
                              Finalizar &amp; Publicar Care
                            </button>
                          )}
                          {(bk.status === 'CONCLUIDO' || bk.status === 'CANCELADO') && (
                            <span className="text-xs text-[var(--text-muted)]">Encerrado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: NORDEN FLOW */}
      {activeTab === 'flow' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Motor NORDEN Flow
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Sugestões automáticas por profissional e duração (sempre com aprovação do cliente).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1 self-start cursor-pointer"
            >
              Simular cancelamento na Agenda
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {flowOffers.length === 0 ? (
            <div className="p-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center text-sm text-[var(--text-muted)]">
              Nenhuma sugestão de realocação registrada.
            </div>
          ) : (
            <div className="space-y-3.5">
              {flowOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 sm:p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span
                        className={`font-semibold ${
                          offer.status === 'EFETIVADA'
                            ? 'text-[var(--accent)]'
                            : offer.status === 'SUGERIDA' || offer.status === 'OFERTADA'
                              ? 'text-[var(--status-warn)]'
                              : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {offer.status}
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-primary)] font-sans font-semibold">
                        {offer.clientName}
                      </span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-muted)] font-sans">
                        {offer.serviceName} ({offer.serviceDurationMin} min)
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {offer.reason}
                    </p>

                    <div className="grid grid-cols-2 sm:inline-flex items-center gap-2 sm:gap-3 text-xs font-mono tabular-nums pt-1">
                      <div className="p-2 sm:p-0 rounded-lg bg-[var(--bg-surface-alt)] sm:bg-transparent">
                        <span className="block sm:inline text-[10px] sm:text-xs text-[var(--text-muted)]">
                          De:{' '}
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          {formatDateBR(offer.originalDate)} {offer.originalStartTime}
                        </span>
                      </div>
                      <ArrowRight className="hidden sm:inline w-3.5 h-3.5 text-[var(--accent)]" />
                      <div className="p-2 sm:p-0 rounded-lg bg-[var(--bg-surface-alt)] sm:bg-transparent">
                        <span className="block sm:inline text-[10px] sm:text-xs text-[var(--accent)]">
                          Para:{' '}
                        </span>
                        <span className="text-[var(--text-primary)] font-semibold">
                          {formatDateBR(offer.proposedDate)} {offer.proposedStartTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2.5">
                    {offer.status === 'SUGERIDA' && (
                      <button
                        type="button"
                        onClick={() => sendFlowOffer(offer.id)}
                        className="w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar Oferta ao Cliente
                      </button>
                    )}
                    {offer.status === 'OFERTADA' && (
                      <button
                        type="button"
                        onClick={() => switchRole('client')}
                        className="w-full sm:w-auto min-h-[42px] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface-alt)] border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] rounded-lg transition-colors cursor-pointer"
                      >
                        Responder como Cliente
                      </button>
                    )}
                    {offer.status === 'EFETIVADA' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)]">
                        <CheckCircle2 className="w-4 h-4" />
                        Troca efetivada
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* TAB 4: INVENTORY & ORDERS */}
      {activeTab === 'inventory' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-6"
        >
          {/* Inventory Section */}
          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Controle de Estoque
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Físico, reservado por pedidos e saldo disponível em tempo real.
                </p>
              </div>
              {lowStockCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--status-warn)]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lowStockCount} item(ns) no limite mínimo
                </span>
              )}
            </div>

            {/* Mobile Inventory Cards (< md) */}
            <div className="md:hidden divide-y divide-[var(--border-subtle)]">
              {products.map((prod) => {
                const available = getAvailableStock(prod.physicalStock, prod.reservedStock);
                const isLow = available <= prod.minStockAlert;
                return (
                  <div key={prod.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                          {prod.name}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">
                          {prod.sku} · {formatBRL(prod.promoPriceCents ?? prod.priceCents)}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-medium shrink-0 ${
                          available === 0
                            ? 'text-[var(--status-danger)]'
                            : isLow
                              ? 'text-[var(--status-warn)]'
                              : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {available === 0 ? 'Esgotado' : isLow ? 'Baixo' : 'Normal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="py-2 px-1 rounded-lg bg-[var(--bg-surface-alt)]">
                        <span className="block text-[10px] text-[var(--text-muted)]">Físico</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                          {prod.physicalStock}
                        </span>
                      </div>
                      <div className="py-2 px-1 rounded-lg bg-[var(--bg-surface-alt)]">
                        <span className="block text-[10px] text-[var(--text-muted)]">
                          Reservado
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-muted)]">
                          {prod.reservedStock}
                        </span>
                      </div>
                      <div className="py-2 px-1 rounded-lg bg-[var(--bg-surface-alt)]">
                        <span className="block text-[10px] text-[var(--accent)]">Disponível</span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                          {available}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          adjustStock(prod.id, 5, 'Reposição rápida (+5 un.) pelo gestor.')
                        }
                        className="min-h-[40px] inline-flex items-center justify-center gap-1 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Repor +5 un.
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adjustStock(prod.id, -1, 'Ajuste manual de inventário (-1 un.).')
                        }
                        className="min-h-[40px] text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface-alt)] border border-[var(--border-strong)] rounded-lg cursor-pointer"
                      >
                        Baixar -1 un.
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Inventory Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-5 font-medium">SKU</th>
                    <th className="py-3 px-4 font-medium">Produto</th>
                    <th className="py-3 px-4 font-medium text-right">Físico</th>
                    <th className="py-3 px-4 font-medium text-right">Reservado</th>
                    <th className="py-3 px-4 font-medium text-right">Disponível</th>
                    <th className="py-3 px-4 font-medium">Situação</th>
                    <th className="py-3 px-5 font-medium text-right">Ajuste Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                  {products.map((prod) => {
                    const available = getAvailableStock(prod.physicalStock, prod.reservedStock);
                    const isLow = available <= prod.minStockAlert;
                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-[var(--bg-surface-alt)]/70 transition-colors"
                      >
                        <td className="py-3 px-5 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                          {prod.sku}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-[var(--text-primary)]">{prod.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {prod.category} · {formatBRL(prod.promoPriceCents ?? prod.priceCents)}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text-primary)]">
                          {prod.physicalStock}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text-muted)]">
                          {prod.reservedStock}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                          {available}
                        </td>
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          {available === 0 ? (
                            <span className="text-[var(--status-danger)]">Sem saldo</span>
                          ) : isLow ? (
                            <span className="text-[var(--status-warn)]">
                              Atenção · Mín. {prod.minStockAlert}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">Normal</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                adjustStock(prod.id, 5, 'Reposição rápida (+5 un.) pelo gestor.')
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />5 un.
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                adjustStock(prod.id, -1, 'Ajuste manual de inventário (-1 un.).')
                              }
                              className="px-2.5 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-strong)] rounded-md cursor-pointer"
                            >
                              -1
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Orders Queue + Recent Stock Movements */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Fila de Pedidos ({orders.length})
                </h3>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {orders.map((ord) => {
                  const nextStatus = getNextAllowedOrderStatus(ord.modality, ord.status);
                  return (
                    <div
                      key={ord.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                    >
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-[var(--text-primary)] font-medium">
                          {ord.code} · {ord.clientName} ·{' '}
                          <span className="text-[var(--accent)]">{formatBRL(ord.totalCents)}</span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {ord.modality === 'RETIRADA'
                            ? 'Retirada no Salão'
                            : `Entrega (${ord.distanceKm} km)`}{' '}
                          · Status:{' '}
                          <span className="text-[var(--text-primary)] font-medium">
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {nextStatus && (
                          <button
                            type="button"
                            onClick={() => advanceOrderStatus(ord.id, nextStatus)}
                            className="flex-1 sm:flex-none min-h-[38px] px-3 py-1.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg cursor-pointer"
                          >
                            Avançar: {nextStatus.replace(/_/g, ' ')}
                          </button>
                        )}
                        {ord.status !== 'CONCLUIDO' && ord.status !== 'CANCELADO' && (
                          <button
                            type="button"
                            onClick={() => advanceOrderStatus(ord.id, 'CANCELADO')}
                            className="min-h-[38px] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--status-warn)] border border-[var(--border-subtle)] rounded-lg cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Movimentações de Estoque
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)] max-h-96 overflow-y-auto">
                {movements.slice(0, 12).map((mov) => (
                  <div key={mov.id} className="px-4 sm:px-5 py-3.5 text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        {mov.productName}
                      </span>
                      <span
                        className={`font-mono tabular-nums font-medium shrink-0 ${
                          mov.quantityDelta > 0
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {mov.type} (
                        {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta})
                      </span>
                    </div>
                    <p className="text-[var(--text-muted)]">{mov.reason}</p>
                    <p className="text-[11px] text-[var(--text-muted)]/80 font-mono">
                      {mov.actor} · {mov.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* COMPLETION MODAL FOR CHAIR EXECUTION */}
      {completingBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Concluir atendimento e publicar manual"
        >
          <div
            onClick={() => setCompletingBooking(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <form
            onSubmit={handleFinalizeAppointment}
            className="relative z-10 w-full sm:max-w-2xl max-h-[92dvh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="shrink-0 flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)]">
              <div>
                <p className="text-xs font-semibold text-[var(--accent)]">
                  Conclusão de Atendimento
                </p>
                <h2 className="font-display text-lg sm:text-xl font-semibold text-[var(--text-primary)] mt-0.5">
                  {completingBooking.serviceName} · {completingBooking.clientName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCompletingBooking(null)}
                aria-label="Fechar"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                  Resumo do procedimento (visível no NORDEN Journey)
                </label>
                <textarea
                  rows={2}
                  value={execSummary}
                  onChange={(e) => setExecSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--accent)] mb-2">
                    Produtos Realmente Utilizados
                  </p>
                  <div className="space-y-2">
                    {products.slice(0, 4).map((p) => {
                      const checked = usedProductIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setUsedProductIds((prev) =>
                                checked ? prev.filter((i) => i !== p.id) : [...prev, p.id],
                              )
                            }
                            className="accent-[#8E6B47] w-4 h-4"
                          />
                          {p.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                    Recomendações para Casa
                  </p>
                  <div className="space-y-2">
                    {products.slice(0, 4).map((p) => {
                      const checked = recommendedProductIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2.5 text-xs text-[var(--text-muted)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setRecommendedProductIds((prev) =>
                                checked ? prev.filter((i) => i !== p.id) : [...prev, p.id],
                              )
                            }
                            className="accent-[#8E6B47] w-4 h-4"
                          />
                          {p.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                  Orientação compartilhada ao cliente
                </label>
                <input
                  type="text"
                  value={execClientNote}
                  onChange={(e) => setExecClientNote(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Anotação interna privada (nunca exibida ao cliente)
                </label>
                <input
                  type="text"
                  value={execInternalNote}
                  onChange={(e) => setExecInternalNote(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCompletingBooking(null)}
                className="min-h-[42px] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg cursor-pointer"
              >
                Validar Manual Care e Concluir
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
