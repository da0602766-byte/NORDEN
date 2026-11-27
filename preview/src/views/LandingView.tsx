import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Clock,
  Plus,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { ASSETS, INITIAL_COMPLETED_APPOINTMENTS } from '../data/seedData';
import { SafeImage } from '../components/SafeImage';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { formatBRL, formatDateBR, getAvailableStock } from '../utils/format';

const HERO_SCENES = [
  {
    image: ASSETS.ritualPrecisionCut,
    caption: 'Corte Arquitetônico · Precisão na tesoura',
    alt: 'Especialista realizando corte masculino de precisão na tesoura dentro do salão NORDEN',
  },
  {
    image: ASSETS.ritualHotTowel,
    caption: 'Ritual Barba & Vapor · Toalha quente aromática',
    alt: 'Cliente relaxando no ritual de barba com toalha quente e vapor no salão NORDEN',
  },
  {
    image: ASSETS.heroSalon,
    caption: 'Arquitetura NORDEN · Ambiente masculino contemporâneo',
    alt: 'Interior arquitetônico do salão masculino NORDEN em pedra grafite e bronze escovado',
  },
];

const LOOKBOOK_FRAMES = [
  {
    image: ASSETS.ritualPrecisionCut,
    title: 'Corte Arquitetônico',
    meta: 'Tesoura & textura fosca',
  },
  {
    image: ASSETS.ritualHotTowel,
    title: 'Vapor & Toalha Quente',
    meta: 'Relaxamento & navalha',
  },
  {
    image: ASSETS.transformLucasAfter,
    title: 'Mid-Fade Natural',
    meta: 'Finalizado com Pomada Matte',
  },
  {
    image: ASSETS.productClay,
    title: 'Pomada Matte 85g',
    meta: 'Fixação seca sem brilho',
  },
  {
    image: ASSETS.transformBeardAfter,
    title: 'Visagismo & Barba',
    meta: 'Contorno geométrico + Elixir',
  },
  {
    image: ASSETS.productBeardOil,
    title: 'Elixir Cedro & Âmbar',
    meta: 'Hidratação de toque seco',
  },
  {
    image: ASSETS.transformFadeAfter,
    title: 'Acabamento Executivo',
    meta: 'Linhas precisas',
  },
  {
    image: ASSETS.productTools,
    title: 'Objetos de Bancada',
    meta: 'Carbono & cerâmica fosca',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Como funciona minha linha do tempo pessoal de antes e depois?',
    a: 'Cada atendimento concluído fica salvo na sua área privada NORDEN Journey com o registro do resultado, os produtos exatos utilizados no seu cabelo ou barba e o manual de cuidados para manter o corte impecável em casa.',
  },
  {
    q: 'Posso comprar exatamente a pomada ou óleo que o barbeiro usou em mim?',
    a: 'Sim. Na sua linha do tempo, cada produto aplicado durante o atendimento aparece identificado com a forma de uso e botão direto para adicionar à sacola, com retirada gratuita ou entrega por quilômetro.',
  },
  {
    q: 'Escolher produtos durante o agendamento gera alguma cobrança extra?',
    a: 'Não. Indicar produtos de preferência no agendamento serve apenas para orientar o especialista antes de você sentar na cadeira. A compra na NORDEN Store é sempre voluntária.',
  },
  {
    q: 'E se abrir um horário mais cedo no dia do meu corte?',
    a: 'Com o NORDEN Flow, quando um horário é liberado com seu especialista, você recebe uma proposta opcional de antecipação e decide em um toque se prefere antecipar ou manter sua reserva original.',
  },
];

type LandingProps = Pick<ReturnType<typeof useNorden>, 'services' | 'professionals' | 'products' | 'startBookingWithService' | 'setCurrentView' | 'setCartOpen' | 'switchRole'> & {
  addToCart: (id: string, quantity?: number) => boolean | Promise<boolean>;
  live?: boolean;
};

export const LandingView: React.FC = () => <LandingContent {...useNorden()} />;

export const LandingContent: React.FC<LandingProps> = (props) => {
  const {
    services,
    professionals,
    products,
    startBookingWithService,
    setCurrentView,
    addToCart,
    setCartOpen,
    switchRole,
    live,
  } = props;

  // Continuous living Hero scene cycle
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SCENES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  // Interactive Service + Product Pairing Explorer state
  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const [selectedRitualId, setSelectedRitualId] = useState<string>(
    activeServices[0]?.id ?? 'srv-corte',
  );
  const selectedRitual = useMemo(
    () => activeServices.find((s) => s.id === selectedRitualId) ?? activeServices[0],
    [activeServices, selectedRitualId],
  );
  const pairedRitualProducts = useMemo(() => {
    if (!selectedRitual) return [];
    return products.filter(
      (p) => p.active && selectedRitual.compatibleProductIds.includes(p.id),
    );
  }, [products, selectedRitual]);

  // Interactive Client Timeline Showcase
  const timelineClients = useMemo(() => {
    const map = new Map<string, { clientId: string; clientName: string; count: number }>();
    INITIAL_COMPLETED_APPOINTMENTS.forEach((apt) => {
      const existing = map.get(apt.clientId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(apt.clientId, {
          clientId: apt.clientId,
          clientName: apt.clientName,
          count: 1,
        });
      }
    });
    return Array.from(map.values());
  }, []);

  const [showcaseClientId, setShowcaseClientId] = useState<string>(
    timelineClients[0]?.clientId ?? 'client-lucas',
  );

  const showcaseTimeline = useMemo(
    () => INITIAL_COMPLETED_APPOINTMENTS.filter((a) => a.clientId === showcaseClientId),
    [showcaseClientId],
  );

  const [showcaseAptId, setShowcaseAptId] = useState<string>('');
  const activeShowcaseApt = useMemo(() => {
    return showcaseTimeline.find((a) => a.id === showcaseAptId) ?? showcaseTimeline[0] ?? null;
  }, [showcaseTimeline, showcaseAptId]);

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const featuredProducts = products.filter((p) => p.active && p.featured).slice(0, 4);

  return (
    <div className="bg-[var(--bg-canvas)] overflow-x-clip transition-colors duration-200">
      {/* 1. LIVING CINEMA HERO (Always dark photographic canvas with guaranteed high-contrast scrims) */}
      <section className="relative min-h-[78vh] sm:min-h-[82vh] flex items-center overflow-hidden border-b border-[var(--border-subtle)] bg-[#0B0B0D]">
        <div className="absolute inset-0">
          <AnimatePresence mode="sync">
            <motion.div
              key={heroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <SafeImage
                src={HERO_SCENES[heroIndex].image}
                alt={HERO_SCENES[heroIndex].alt}
                priority
                className="w-full h-full object-cover object-center animate-kenburns"
              />
            </motion.div>
          </AnimatePresence>

          {/* Editorial dark contrast scrims (preserved in both themes for photo legibility) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D] via-[#0B0B0D]/82 to-[#0B0B0D]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-[#0B0B0D]/40" />
        </div>

        <div className="relative z-10 max-w-[1240px] w-full mx-auto px-4 sm:px-8 pt-16 pb-20 sm:pt-28 sm:pb-28">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.22em] text-[#B58E65] uppercase mb-5"
            >
              <span>NORDEN · Salão Masculino Premium</span>
              <span aria-hidden="true">·</span>
              <span>Seu Estilo. Sua Evolução.</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[clamp(2.2rem,4.8vw,4.1rem)] font-semibold leading-[1.05] tracking-[-0.028em] text-[#E7E2DB]"
            >
              Seu corte, sua barba e sua evolução registrados em cada detalhe.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 text-base sm:text-lg text-[#E7E2DB]/85 leading-relaxed max-w-xl"
            >
              Reserve seu ritual em segundos, acompanhe seu antes e depois na sua linha do tempo privada e leve para casa exatamente a pomada e o elixir aplicados no seu atendimento.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4"
            >
              <button
                type="button"
                onClick={() => startBookingWithService(null, null)}
                className="relative overflow-hidden inline-flex items-center gap-2.5 px-6 sm:px-7 min-h-[48px] py-3 text-sm font-semibold text-[#0B0B0D] bg-[#B58E65] hover:bg-[#C6A077] active:scale-[0.98] rounded-lg transition-all duration-150 cursor-pointer group"
              >
                <span className="relative z-10 inline-flex items-center gap-2">
                  Agendar Meu Horário
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-sheen"
                />
              </button>

              <a
                href="#linha-do-tempo"
                className="inline-flex items-center gap-2 px-5 min-h-[48px] py-3 text-sm font-medium text-[#E7E2DB] border border-[#E7E2DB]/30 hover:border-[#B58E65] hover:text-[#B58E65] rounded-lg transition-colors duration-150"
              >
                Ver Antes &amp; Depois
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Scene Progress Controls */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-12 pt-5 border-t border-[#8C8176]/28 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                {HERO_SCENES.map((scene, idx) => (
                  <button
                    key={scene.caption}
                    type="button"
                    onClick={() => setHeroIndex(idx)}
                    aria-label={`Mostrar cena ${idx + 1}: ${scene.caption}`}
                    className={`h-1 rounded-full transition-all duration-500 cursor-pointer ${
                      idx === heroIndex
                        ? 'w-12 bg-[#B58E65]'
                        : 'w-5 bg-[#E7E2DB]/30 hover:bg-[#E7E2DB]/65'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#E7E2DB]/80 font-mono">
                {HERO_SCENES[heroIndex].caption}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. INFINITE MOVING LOOKBOOK FILMSTRIP */}
      <section
        aria-label="Galeria em movimento NORDEN"
        className="py-10 sm:py-12 border-b border-[var(--border-subtle)] bg-[var(--bg-band)] overflow-hidden marquee-group transition-colors duration-200"
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 mb-6 flex items-baseline justify-between gap-4">
          <p className="text-xs tracking-[0.22em] text-[var(--accent)] font-semibold uppercase">
            Atmosfera &amp; Acabamentos em Movimento
          </p>
          <p className="text-xs text-[var(--text-muted)] hidden sm:block">
            Passe o cursor para pausar · Clique em qualquer ritual para agendar
          </p>
        </div>

        <div className="relative flex overflow-hidden">
          <div className="flex gap-4 sm:gap-5 animate-marquee pr-5">
            {[...LOOKBOOK_FRAMES, ...LOOKBOOK_FRAMES].map((frame, i) => (
              <button
                key={`${frame.title}-${i}`}
                type="button"
                onClick={() => startBookingWithService(null, null)}
                className="group relative w-[250px] sm:w-[320px] aspect-[16/10] rounded-xl overflow-hidden bg-[#1F1F23] border border-[var(--border-subtle)] shrink-0 text-left cursor-pointer"
              >
                <SafeImage
                  src={frame.image}
                  alt={frame.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D]/90 via-[#0B0B0D]/25 to-transparent" />
                <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-medium text-[#E7E2DB] group-hover:text-[#B58E65] transition-colors">
                      {frame.title}
                    </p>
                    <p className="text-[11px] text-[#CFC7BC]">{frame.meta}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#B58E65] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PERSUASIVE SERVICES + INTEGRATED PRODUCTS */}
      <section id="servicos" className="max-w-[1240px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 sm:pb-12"
        >
          <div className="max-w-2xl">
            <p className="text-xs tracking-[0.22em] text-[var(--accent)] font-semibold uppercase mb-2.5">
              Rituais &amp; Serviços
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text-primary)]">
              Escolha a experiência ideal para o seu visual.
            </h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
            Cada procedimento combina técnica precisa, tempo dedicado sem pressa e produtos profissionais que você pode escolher já no agendamento.
          </p>
        </motion.div>

        {/* Infinite Subtle Ritual Atmosphere Ticker */}
        <div className="mb-10 overflow-hidden marquee-group border-y border-[var(--border-subtle)] py-3">
          <div className="flex animate-marquee-reverse whitespace-nowrap items-center gap-8 text-xs tracking-[0.2em] uppercase text-[var(--text-muted)]">
            {[
              'Corte na Tesoura & Precisão',
              'Toalha Quente & Vapor Botânico',
              'Finalização Matte Sem Brilho',
              'Visagismo Personalizado',
              'Registro Antes & Depois',
              'Manual NORDEN Care',
              'Corte na Tesoura & Precisão',
              'Toalha Quente & Vapor Botânico',
              'Finalização Matte Sem Brilho',
              'Visagismo Personalizado',
              'Registro Antes & Depois',
              'Manual NORDEN Care',
            ].map((phrase, idx) => (
              <span key={`${phrase}-${idx}`} className="inline-flex items-center gap-8 shrink-0">
                <span className="hover:text-[var(--text-primary)] transition-colors">{phrase}</span>
                <span aria-hidden="true" className="text-[var(--accent)]">
                  ·
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Visual Featured Services Grid with Cinemagraph Hover */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeServices.map((srv, idx) => {
            const linkedProducts = products.filter(
              (p) => p.active && srv.compatibleProductIds.includes(p.id),
            );
            return (
              <motion.article
                key={srv.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="group relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 shadow-[var(--shadow-card)]"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left z-20"
                />

                <div className="relative aspect-[16/10] overflow-hidden bg-[#141417]">
                  <div
                    className="w-full h-full animate-cinemagraph"
                    style={{ animationDelay: `${idx * -2.3}s` }}
                  >
                    <SafeImage
                      src={srv.image || ASSETS.heroSalon}
                      alt={srv.name}
                      className="w-full h-full object-cover cinemagraph-media transition-all duration-700 ease-out"
                    />
                  </div>

                  {/* Rising warm steam / studio haze */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden opacity-45 group-hover:opacity-90 transition-opacity duration-500"
                  >
                    <div
                      className="absolute -bottom-8 left-1/4 w-44 h-44 rounded-full bg-[radial-gradient(circle,rgba(231,226,219,0.22),rgba(181,142,101,0.08)_45%,transparent_72%)] blur-xl animate-steam-drift"
                      style={{ animationDelay: `${idx * -1.8}s` }}
                    />
                    <div
                      className="absolute -bottom-10 right-1/4 w-36 h-36 rounded-full bg-[radial-gradient(circle,rgba(181,142,101,0.24),transparent_70%)] blur-xl animate-steam-drift-delayed"
                      style={{ animationDelay: `${idx * -2.5}s` }}
                    />
                  </div>

                  {/* Diagonal warm bronze rim-light sweep */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden opacity-20 group-hover:opacity-80 transition-opacity duration-300"
                  >
                    <div
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#E7E2DB]/20 to-transparent animate-light-sweep"
                      style={{ animationDelay: `${idx * -1.9}s` }}
                    />
                  </div>

                  {/* Dark photo scrim so white/bronze photo metadata always has high contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D]/90 via-[#0B0B0D]/25 to-transparent" />
                  <div className="absolute bottom-3 left-5 right-5 flex items-baseline justify-between text-xs font-mono tabular-nums z-10">
                    <span className="text-[#E7E2DB] inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#B58E65]" />
                      {srv.durationMin} min
                    </span>
                    <span className="text-base font-semibold text-[#D7B992]">
                      {formatBRL(srv.priceCents)}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] tracking-wide uppercase">
                      {srv.category}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {srv.name}
                    </h3>
                    {srv.clientBenefit && (
                      <p className="mt-1.5 text-xs text-[var(--text-secondary)] font-medium">
                        {srv.clientBenefit}
                      </p>
                    )}
                    <p className="mt-2.5 text-sm text-[var(--text-muted)] leading-relaxed">
                      {srv.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3.5">
                    {linkedProducts.length > 0 && (
                      <div>
                        <p className="text-[11px] text-[var(--text-muted)] mb-1.5">
                          Produtos usados / compatíveis:
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {linkedProducts.slice(0, 2).map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={async () => {
                                if (await addToCart(prod.id, 1)) setCartOpen(true);
                              }}
                              className="rounded-sm bg-[var(--accent)]/12 text-[var(--text-primary)] font-semibold ring-2 ring-[var(--accent)]/12 hover:bg-[var(--accent)]/25 underline decoration-[var(--accent)] underline-offset-4 transition-colors cursor-pointer"
                            >
                              {prod.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => startBookingWithService(srv.id, null)}
                      className="relative overflow-hidden w-full min-h-[42px] py-2.5 px-4 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="relative z-10 inline-flex items-center gap-2">
                        Reservar Este Ritual
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-sheen"
                      />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Interactive Service + Products Integration Spotlight */}
        {selectedRitual && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45 }}
            className="mt-14 p-5 sm:p-8 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-[var(--border-subtle)]">
              <div>
                <p className="text-xs tracking-[0.2em] text-[var(--accent)] font-semibold uppercase mb-1.5">
                  Serviço + Produto Integrados
                </p>
                <h3 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
                  Veja o que entra na cadeira e como manter o resultado em casa
                </h3>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                {activeServices.slice(0, 4).map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedRitualId(srv.id)}
                    className={`min-h-[38px] px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      selectedRitual.id === srv.id
                        ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-fg)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {srv.name.replace(' NORDEN', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 pt-6 items-center">
              <div className="lg:col-span-5 space-y-4">
                <p className="text-xs font-mono tabular-nums font-medium text-[var(--accent)]">
                  {selectedRitual.durationMin} min · {formatBRL(selectedRitual.priceCents)}
                </p>
                <h4 className="font-display text-2xl font-semibold text-[var(--text-primary)]">
                  {selectedRitual.name}
                </h4>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {selectedRitual.description} Ao agendar, você já pode marcar seus produtos favoritos como preferência para o especialista avaliar e aplicar durante o ritual.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startBookingWithService(selectedRitual.id, null)}
                    className="min-h-[42px] inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
                  >
                    Agendar {selectedRitual.name.split(' ')[0]}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('store');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-lg transition-colors cursor-pointer"
                  >
                    Ver Loja Completa
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pairedRitualProducts.slice(0, 3).map((prod) => {
                  const avail = getAvailableStock(prod.physicalStock, prod.reservedStock);
                  return (
                    <div
                      key={prod.id}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col group"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-[#141417]">
                        <SafeImage
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-[var(--text-muted)]">{prod.category}</p>
                          <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 leading-snug">
                            {prod.name}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                          <span className="font-mono text-xs font-medium tabular-nums text-[var(--accent)]">
                            {formatBRL(prod.promoPriceCents ?? prod.priceCents)}
                          </span>
                          <button
                            type="button"
                            disabled={avail === 0}
                            onClick={async () => {
                              if (await addToCart(prod.id, 1)) setCartOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Levar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* 4. STAR FEATURE: CLIENT TIMELINE WITH BEFORE & AFTER + EXACT PRODUCTS USED */}
      <section
        id="linha-do-tempo"
        className="border-y border-[var(--border-subtle)] bg-[var(--bg-band)] py-16 sm:py-24 transition-colors duration-200"
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10">
            <div className="max-w-2xl">
              <p className="text-xs tracking-[0.22em] text-[var(--accent)] font-semibold uppercase mb-2.5 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                NORDEN Journey · Exclusivo de Cada Cliente
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text-primary)]">
                Sua linha do tempo: antes, depois e o produto exato usado em você.
              </h2>
              <p className="mt-3.5 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
                Nunca mais esqueça qual pomada deixou seu cabelo perfeito. Cada cliente possui sua própria linha do tempo com a evolução visual do serviço e os itens aplicados pelo profissional.
              </p>
            </div>

            {/* Client Switcher */}
            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <span className="text-[11px] text-[var(--text-muted)]">
                Alterne para explorar a linha do tempo de cada cliente (demo):
              </span>
              <div className="inline-flex items-center gap-1 p-1 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl">
                {timelineClients.map((cl) => (
                  <button
                    key={cl.clientId}
                    type="button"
                    onClick={() => {
                      setShowcaseClientId(cl.clientId);
                      setShowcaseAptId('');
                    }}
                    className={`min-h-[38px] px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      showcaseClientId === cl.clientId
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cl.clientName} ({cl.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeShowcaseApt && (
            <motion.div
              key={activeShowcaseApt.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-8 items-start"
            >
              {/* Left: Interactive Auto-Gliding Before & After Comparator */}
              <div className="lg:col-span-6 space-y-3.5">
                <BeforeAfterSlider
                  beforeSrc={activeShowcaseApt.beforeImage || ASSETS.transformLucasBefore}
                  afterSrc={activeShowcaseApt.afterImage || ASSETS.transformLucasAfter}
                  beforeLabel="Antes do Ritual"
                  afterLabel="Depois no NORDEN"
                  altSubject={`${activeShowcaseApt.clientName} — ${activeShowcaseApt.serviceName}`}
                  autoAnimate={true}
                />
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1 gap-3">
                  <span>Arraste o controle ou observe a comparação contínua</span>
                  <span className="font-mono font-medium text-[var(--text-primary)] shrink-0">
                    {formatDateBR(activeShowcaseApt.date)}
                  </span>
                </div>
              </div>

              {/* Right: Timeline Visit Selector + Exact Products Applied */}
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {showcaseTimeline.map((apt, idx) => {
                    const isSelected = apt.id === activeShowcaseApt.id;
                    return (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() => setShowcaseAptId(apt.id)}
                        className={`text-left px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--bg-surface)] border-[var(--accent)] text-[var(--text-primary)] shadow-sm'
                            : 'bg-[var(--bg-surface-alt)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="block font-mono text-[11px] font-medium text-[var(--accent)]">
                          Visita #{showcaseTimeline.length - idx} · {formatDateBR(apt.date)}
                        </span>
                        <span className="block text-xs font-semibold mt-0.5">
                          {apt.serviceName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Visit Details */}
                <div className="p-5 sm:p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-5 shadow-[var(--shadow-card)]">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                      Cliente:{' '}
                      <span className="text-[var(--text-primary)] font-medium">
                        {activeShowcaseApt.clientName}
                      </span>{' '}
                      · Especialista: {activeShowcaseApt.professionalName} ·{' '}
                      {activeShowcaseApt.durationMin} min
                    </p>
                    <h3 className="font-display text-2xl font-semibold text-[var(--text-primary)] mt-1">
                      {activeShowcaseApt.serviceName}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                      {activeShowcaseApt.summary}
                    </p>
                  </div>

                  {/* EXACT PRODUCTS USED IN THIS SERVICE */}
                  <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold tracking-wide uppercase text-[var(--accent)]">
                        Produtos usados neste atendimento
                      </p>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Registrado na cadeira
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeShowcaseApt.usedProducts.map((used, idx) => {
                        const prod = used.productId
                          ? products.find((p) => p.id === used.productId)
                          : null;
                        const avail = prod
                          ? getAvailableStock(prod.physicalStock, prod.reservedStock)
                          : 0;

                        return (
                          <div
                            key={`${used.name}-${idx}`}
                            className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] flex items-center gap-3.5"
                          >
                            {prod && (
                              <SafeImage
                                src={prod.image}
                                alt={prod.name}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-[var(--accent)] font-semibold">
                                {used.appliedArea || 'Aplicado no ritual'}
                              </p>
                              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                {used.name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
                                {used.usageNote}
                              </p>
                            </div>
                            {prod && avail > 0 && (
                              <div className="text-right shrink-0 space-y-1.5">
                                <p className="font-mono text-xs font-semibold tabular-nums text-[var(--text-primary)]">
                                  {formatBRL(prod.promoPriceCents ?? prod.priceCents)}
                                </p>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (await addToCart(prod.id, 1)) setCartOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors cursor-pointer"
                                >
                                  <ShoppingBag className="w-3 h-3" />
                                  Comprar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Care Manual Teaser + Action */}
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-[var(--text-muted)]">
                      Inclui <span className="text-[var(--text-primary)] font-medium">Manual NORDEN Care</span> revisado para as primeiras 24h e manutenção diária.
                    </p>
                    <button
                      type="button"
                      onClick={() => switchRole('client')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline shrink-0 cursor-pointer"
                    >
                      Abrir Minha Linha do Tempo
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* 5. FEATURED NORDEN STORE SHOWCASE */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-10">
          <div>
            <p className="text-xs tracking-[0.22em] text-[var(--accent)] font-semibold uppercase mb-2.5">
              NORDEN Store
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
              Leve o acabamento da cadeira para a sua rotina.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentView('store');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors shrink-0 cursor-pointer"
          >
            Explorar loja completa
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product, idx) => {
            const available = getAvailableStock(product.physicalStock, product.reservedStock);
            const activePrice = product.promoPriceCents ?? product.priceCents;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                className="group relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 shadow-[var(--shadow-card)]"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center z-20"
                />

                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('store');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="aspect-[4/3] w-full overflow-hidden bg-[#141417] cursor-pointer relative"
                >
                  <div
                    className="w-full h-full animate-cinemagraph"
                    style={{ animationDelay: `${idx * -2.2}s` }}
                  >
                    <SafeImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover cinemagraph-media transition-all duration-700 ease-out"
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-20 group-hover:opacity-65 transition-opacity duration-500"
                  >
                    <div
                      className="absolute -inset-6 bg-[radial-gradient(circle_at_70%_30%,rgba(181,142,101,0.32),transparent_60%)] animate-orbit-glow"
                      style={{ animationDelay: `${idx * -1.3}s` }}
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden opacity-25 group-hover:opacity-85 transition-opacity duration-300"
                  >
                    <div
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#E7E2DB]/20 to-transparent animate-light-sweep"
                      style={{ animationDelay: `${idx * -1.8}s` }}
                    />
                  </div>
                </button>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] tracking-wide">
                      {product.category} · {product.volume}
                    </p>
                    <h3 className="mt-1 font-display text-base font-semibold text-[var(--text-primary)] leading-snug">
                      {product.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {product.shortDescription}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <div className="font-mono tabular-nums">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatBRL(activePrice)}
                      </span>
                      {product.promoPriceCents && (
                        <span className="ml-2 text-xs text-[var(--text-muted)] line-through">
                          {formatBRL(product.priceCents)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={available === 0}
                      onClick={async () => {
                        if (await addToCart(product.id, 1)) {
                          setCartOpen(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface-alt)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Sacola
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 6. SPECIALISTS SECTION */}
      {professionals.length > 0 && <section className="border-t border-[var(--border-subtle)] bg-[var(--bg-band)] transition-colors duration-200">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="max-w-xl mb-12">
            <p className="text-xs tracking-[0.22em] text-[var(--accent)] font-semibold uppercase mb-2.5">
              Nossos Especialistas
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
              Quem cuida da sua imagem com método e calma.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {professionals.map((prof, idx) => (
              <motion.div
                key={prof.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="group grid grid-cols-1 sm:grid-cols-12 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-xl overflow-hidden transition-colors shadow-[var(--shadow-card)]"
              >
                <div className="sm:col-span-5 aspect-[3/4] sm:aspect-auto bg-[#121215] overflow-hidden">
                  <SafeImage
                    src={prof.image}
                    alt={`Retrato editorial de ${prof.name}`}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="sm:col-span-7 p-5 sm:p-7 flex flex-col justify-between gap-5">
                  <div>
                    <p className="text-xs font-medium text-[var(--accent)]">{prof.roleTitle}</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold text-[var(--text-primary)]">
                      {prof.name}
                    </h3>
                    <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
                      {prof.bio}
                    </p>
                    <p className="mt-4 text-xs text-[var(--text-secondary)] leading-relaxed">
                      {prof.specialties.join(' · ')}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    {prof.experienceYears !== undefined && <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                      {prof.experienceYears} anos de experiência
                    </span>}
                    <button
                      type="button"
                      onClick={() => startBookingWithService(null, prof.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline transition-colors cursor-pointer"
                    >
                      Agendar com {prof.name.split(' ')[0]}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>}

      {/* 7. FINAL CLIENT CONVERSION BANNER + FAQ */}
      <section className="max-w-[960px] mx-auto px-4 sm:px-8 pt-16 sm:pt-20 pb-8 space-y-16">
        <div className="p-7 sm:p-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--accent)]/40 text-center space-y-5 shadow-[var(--shadow-card)]">
          <p className="text-xs tracking-[0.22em] text-[var(--accent)] font-semibold uppercase">
            Pronto para sua próxima evolução?
          </p>
          <h2 className="font-display text-2xl sm:text-4xl font-semibold text-[var(--text-primary)] max-w-xl mx-auto">
            Reserve seu horário agora e comece sua linha do tempo NORDEN.
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Escolha serviço, especialista e produtos de preferência em menos de 1 minuto.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3.5">
            <button
              type="button"
              onClick={() => startBookingWithService(null, null)}
              className="min-h-[46px] inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors cursor-pointer"
            >
              Agendar Agora
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('store');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[46px] inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-lg transition-colors cursor-pointer"
            >
              Visitar NORDEN Store
            </button>
          </div>
        </div>

        <div>
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.2em] text-[var(--accent)] font-semibold uppercase mb-2">
              Perguntas Frequentes
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">
              Tudo o que você precisa saber antes da sua visita.
            </h2>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full py-5 flex items-center justify-between gap-4 text-left cursor-pointer group"
                  >
                    <span className="font-display text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[var(--accent)]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-5 text-sm text-[var(--text-muted)] leading-relaxed max-w-2xl">
                      {live && idx === 1
                        ? 'Quando um produto usado no atendimento estiver na loja, você pode adicioná-lo à sacola e consultar as opções de retirada ou entrega.'
                        : item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
