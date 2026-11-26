import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ArrowLeft, ArrowRight, Calendar, Clock, ShieldAlert } from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { SafeImage } from '../components/SafeImage';
import { addMinutesToTime, bookingDates, formatBRL, formatDateBR } from '../utils/format';
import type { Booking } from '../types';

export const BookingView: React.FC = () => {
  const {
    services,
    professionals,
    products,
    preselectedServiceId,
    preselectedProfessionalId,
    getAvailableSlots,
    createBooking,
    clientProfile,
    setCurrentView,
  } = useNorden();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [serviceId, setServiceId] = useState<string>(preselectedServiceId ?? '');
  const [professionalId, setProfessionalId] = useState<string>(preselectedProfessionalId ?? '');
  const [preferredProductIds, setPreferredProductIds] = useState<string[]>([]);
  const [dates] = useState(bookingDates);
  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (preselectedServiceId) {
      setServiceId(preselectedServiceId);
      setStep(2);
    } else if (preselectedProfessionalId) {
      setProfessionalId(preselectedProfessionalId);
      setStep(1);
    }
  }, [preselectedServiceId, preselectedProfessionalId]);

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const selectedService = useMemo(
    () => activeServices.find((s) => s.id === serviceId) ?? null,
    [activeServices, serviceId],
  );

  const eligibleProfessionals = useMemo(() => {
    if (!selectedService) return professionals.filter((p) => p.active);
    return professionals.filter((p) => p.active && p.serviceIds.includes(selectedService.id));
  }, [professionals, selectedService]);

  const selectedProfessional = useMemo(
    () => eligibleProfessionals.find((p) => p.id === professionalId) ?? null,
    [eligibleProfessionals, professionalId],
  );

  const compatibleProducts = useMemo(() => {
    if (!selectedService) return [];
    return products.filter(
      (p) => p.active && selectedService.compatibleProductIds.includes(p.id),
    );
  }, [products, selectedService]);

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedProfessional) return [];
    return getAvailableSlots(selectedDate, selectedProfessional.id, selectedService.durationMin);
  }, [selectedDate, selectedProfessional, selectedService, getAvailableSlots]);

  const toggleProductPref = (pid: string) => {
    setPreferredProductIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid],
    );
  };

  const handleConfirm = () => {
    if (!selectedService || !selectedProfessional || !selectedSlot) return;
    setError(null);
    const res = createBooking({
      serviceId: selectedService.id,
      professionalId: selectedProfessional.id,
      date: selectedDate,
      startTime: selectedSlot,
      preferredProductIds,
      notes,
    });
    if (!res.ok) {
      setError(res.error || 'Erro ao confirmar reserva.');
      return;
    }
    setCreatedBooking(res.booking ?? null);
    setStep(6);
  };

  const STEP_LABELS = ['Serviço', 'Especialista', 'Preferências', 'Data & Horário', 'Revisão'];

  return (
    <div className="max-w-[1040px] mx-auto px-4 sm:px-8 py-10 sm:py-16">
      <div className="mb-8 sm:mb-10">
        <p className="text-xs tracking-[0.2em] text-[var(--accent)] uppercase mb-2 font-semibold">
          Agendamento de demonstração
        </p>
        <h1 className="font-display text-2xl sm:text-4xl font-semibold text-[var(--text-primary)]">
          {step === 6 ? 'Horário reservado com sucesso.' : 'Personalize sua próxima visita.'}
        </h1>

        {step < 6 && (
          <div className="mt-5 flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2">
            {STEP_LABELS.map((label, idx) => {
              const num = (idx + 1) as 1 | 2 | 3 | 4 | 5;
              const isCurrent = step === num;
              const isDone = step > num;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={num > step}
                  onClick={() => setStep(num)}
                  className={`flex items-center gap-2 text-xs whitespace-nowrap shrink-0 transition-colors ${
                    isCurrent
                      ? 'text-[var(--text-primary)] font-semibold'
                      : isDone
                        ? 'text-[var(--accent)] cursor-pointer'
                        : 'text-[var(--text-muted)]/60'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
                      isCurrent
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : isDone
                          ? 'border border-[var(--accent)] text-[var(--accent)]'
                          : 'border border-[var(--border-strong)] text-[var(--text-muted)]'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : num}
                  </span>
                  <span>{label}</span>
                  {idx < STEP_LABELS.length - 1 && (
                    <span className="text-[var(--border-strong)] ml-1">/</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 1: SERVICE */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {activeServices.map((srv) => {
            const active = serviceId === srv.id;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => {
                  setServiceId(srv.id);
                  setPreferredProductIds([]);
                  if (professionalId) {
                    const prof = professionals.find((p) => p.id === professionalId);
                    if (!prof || !prof.serviceIds.includes(srv.id)) {
                      setProfessionalId('');
                    }
                  }
                  setStep(2);
                }}
                className={`text-left p-5 sm:p-6 rounded-xl border transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-[var(--bg-surface)] border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent)]'
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                    {srv.name}
                  </h2>
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--accent)] shrink-0">
                    {formatBRL(srv.priceCents)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums mt-1">
                  {srv.category} · {srv.durationMin} min
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-2.5 leading-relaxed">
                  {srv.description}
                </p>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* STEP 2: PROFESSIONAL */}
      {step === 2 && selectedService && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {eligibleProfessionals.map((prof) => {
              const active = professionalId === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => {
                    setProfessionalId(prof.id);
                    setSelectedSlot('');
                    setStep(3);
                  }}
                  className={`text-left p-4 sm:p-5 rounded-xl border flex gap-4 sm:gap-5 items-center transition-all cursor-pointer ${
                    active
                      ? 'bg-[var(--bg-surface)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent)]'
                  }`}
                >
                  <SafeImage
                    src={prof.image}
                    alt={prof.name}
                    className="w-20 h-24 rounded-lg object-cover object-top shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--accent)]">{prof.roleTitle}</p>
                    <h3 className="font-display text-xl font-semibold text-[var(--text-primary)] mt-0.5">
                      {prof.name}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                      {prof.specialties.join(' · ')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Alterar serviço
          </button>
        </motion.div>
      )}

      {/* STEP 3: OPTIONAL PRODUCT PREFERENCES */}
      {step === 3 && selectedService && selectedProfessional && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] leading-relaxed">
            <span className="text-[var(--text-primary)] font-semibold">Etapa opcional:</span>{' '}
            Selecione produtos que gostaria de experimentar com {selectedProfessional.name}. Esta escolha é apenas informativa — não gera cobrança automática.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {compatibleProducts.map((prod) => {
              const checked = preferredProductIds.includes(prod.id);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => toggleProductPref(prod.id)}
                  className={`text-left p-4 rounded-xl border transition-all flex gap-3.5 items-center cursor-pointer ${
                    checked
                      ? 'bg-[var(--bg-surface)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <SafeImage
                    src={prod.image}
                    alt={prod.name}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {prod.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{prod.volume}</p>
                    <p className="text-xs font-mono tabular-nums font-medium text-[var(--accent)] mt-1">
                      Loja: {formatBRL(prod.promoPriceCents ?? prod.priceCents)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPreferredProductIds([]);
                  setStep(4);
                }}
                className="min-h-[42px] px-4 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Pular etapa
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
              >
                Escolher Data e Horário
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 4: DATE & TIME SLOTS */}
      {step === 4 && selectedService && selectedProfessional && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              Selecione a data (Fuso: America/Sao_Paulo)
            </p>
            <div className="flex flex-wrap gap-2">
              {dates.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d.iso);
                    setSelectedSlot('');
                  }}
                  className={`min-h-[42px] px-4 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    selectedDate === d.iso
                      ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-fg)] border-[var(--tab-active-bg)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--accent)]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent)]" />
              Horários livres para {selectedProfessional.name} ({selectedService.durationMin} min)
            </p>

            {availableSlots.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] p-6 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                Sem janelas livres nesta data para a duração selecionada. Escolha outro dia.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`min-h-[44px] py-2.5 px-3 text-sm font-mono tabular-nums rounded-lg border transition-colors cursor-pointer ${
                      selectedSlot === slot
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] font-semibold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>

            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(5)}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              Revisar Agendamento
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 5: REVIEW & CONFIRM */}
      {step === 5 && selectedService && selectedProfessional && selectedSlot && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8"
        >
          <div className="lg:col-span-7 space-y-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-7">
            <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">
              Resumo da Reserva
            </h2>

            <dl className="divide-y divide-[var(--border-subtle)] text-sm">
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Serviço</dt>
                <dd className="text-[var(--text-primary)] font-medium text-right">
                  {selectedService.name}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Especialista</dt>
                <dd className="text-[var(--text-primary)] text-right">
                  {selectedProfessional.name}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Data e Janela</dt>
                <dd className="font-mono tabular-nums text-[var(--text-primary)] text-right">
                  {formatDateBR(selectedDate)} · {selectedSlot} –{' '}
                  {addMinutesToTime(selectedSlot, selectedService.durationMin)}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Valor congelado</dt>
                <dd className="font-mono tabular-nums text-[var(--accent)] font-semibold text-right">
                  {formatBRL(selectedService.priceCents)}
                </dd>
              </div>
              <div className="py-3 flex justify-between gap-4">
                <dt className="text-[var(--text-muted)]">Preferências</dt>
                <dd className="text-[var(--text-primary)] text-right">
                  {preferredProductIds.length === 0
                    ? 'Nenhuma selecionada'
                    : preferredProductIds
                        .map((id) => products.find((p) => p.id === id)?.name)
                        .filter(Boolean)
                        .join(', ')}
                </dd>
              </div>
            </dl>

            <div>
              <label
                htmlFor="bk-notes"
                className="block text-xs font-medium text-[var(--text-primary)] mb-1.5"
              >
                Observações opcionais ao profissional
              </label>
              <textarea
                id="bk-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Evento à noite, manter volume natural no topo..."
                className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--status-warn)] bg-[var(--bg-surface-alt)] border border-[var(--status-warn)]/35 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          <div className="lg:col-span-5 space-y-5">
            {clientProfile.allergyStatus === 'SIM' && (
              <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent)]/45 space-y-2">
                <p className="text-xs font-semibold text-[var(--accent)] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Alerta discreto compartilhado com o profissional
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {clientProfile.allergyDetails}
                </p>
              </div>
            )}

            <div className="p-5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-4">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Cancelamentos podem ser feitos pela Área do Cliente sem multa nesta demonstração. Ao cancelar, a janela é disponibilizada automaticamente para o NORDEN Flow.
              </p>

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full min-h-[46px] py-3 px-4 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
              >
                Confirmar Agendamento
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full min-h-[40px] py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Alterar data ou horário
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 6: CONFIRMED */}
      {step === 6 && createdBooking && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 sm:p-7 space-y-6"
        >
          <div>
            <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              Reserva Confirmada
            </p>
            <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)] mt-1">
              {createdBooking.serviceName}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Com {createdBooking.professionalName} · {formatDateBR(createdBooking.date)} às{' '}
              <span className="font-mono tabular-nums text-[var(--text-primary)] font-semibold">
                {createdBooking.startTime}
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('client')}
              className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
            >
              Ver em Meus Agendamentos
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSelectedSlot('');
                setCreatedBooking(null);
              }}
              className="min-h-[44px] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-lg transition-colors cursor-pointer"
            >
              Fazer Novo Agendamento
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
