import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Plus, Minus, X, ArrowRight, ShoppingBag } from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { SafeImage } from '../components/SafeImage';
import { formatBRL, getAvailableStock } from '../utils/format';
import type { Product } from '../types';

type StoreProps = Pick<ReturnType<typeof useNorden>, 'products' | 'services' | 'setCartOpen' | 'cartCount' | 'startBookingWithService'> & {
  addToCart: (id: string, quantity?: number) => boolean | Promise<boolean>;
  deliverySettings?: ReturnType<typeof useNorden>['deliverySettings'];
  loading?: boolean;
};

export const StoreView: React.FC = () => <StoreContent {...useNorden()} />;

export const StoreContent: React.FC<StoreProps> = (props) => {
  const {
    products,
    services,
    addToCart,
    setCartOpen,
    cartCount,
    startBookingWithService,
    deliverySettings,
    loading,
  } = props;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState(1);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      if (!p.active) return false;
      if (category !== 'Todos' && p.category !== category) return false;
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const priceA = a.promoPriceCents ?? a.priceCents;
      const priceB = b.promoPriceCents ?? b.priceCents;
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }, [products, search, category, sortBy]);

  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setModalQty(1);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-10 sm:py-16">
      {/* Storefront Editorial Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 sm:pb-10 border-b border-[var(--border-subtle)]">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.22em] text-[var(--accent)] font-semibold uppercase mb-2.5">
            NORDEN Store{deliverySettings ? ' · Demonstração' : ''}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text-primary)]">
            Fórmulas de precisão e objetos de bancada.
          </h1>
          <p className="mt-3.5 text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
            Retire no salão ou consulte o valor da entrega na sacola.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="inline-flex items-center gap-2.5 px-5 min-h-[44px] py-2.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] hover:border-[var(--accent)] border border-[var(--border-strong)] rounded-lg transition-colors self-start lg:self-auto shrink-0 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[var(--accent)]" />
          <span className="tabular-nums">
            Abrir Sacola {cartCount > 0 ? `(${cartCount})` : ''}
          </span>
        </button>
      </div>

      {/* Infinite GIF-like Living Storefront Showcase Strip */}
      <div className="mt-6 mb-2 overflow-hidden marquee-group border border-[var(--border-subtle)] py-4 bg-[var(--bg-surface-alt)] rounded-xl">
        <div className="flex animate-marquee-slow whitespace-nowrap">
          {[...products, ...products].map((item, idx) => (
            <button
              key={`${item.id}-ribbon-${idx}`}
              type="button"
              onClick={() => openDetail(item)}
              className="group/ribbon inline-flex items-center gap-3.5 px-5 shrink-0 text-left cursor-pointer border-r border-[var(--border-subtle)] last:border-r-0"
            >
              <div className="w-11 h-11 rounded-md overflow-hidden bg-[var(--bg-surface)] shrink-0 relative">
                <SafeImage
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover animate-cinemagraph"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)] group-hover/ribbon:text-[var(--accent)] transition-colors">
                  {item.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                  {item.category} · {formatBRL(item.promoPriceCents ?? item.priceCents)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['Todos', ...new Set(products.filter((product) => product.active).map((product) => product.category))].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[38px] px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                category === cat
                  ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-fg)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto ou SKU..."
              aria-label="Buscar produtos"
              className="w-full sm:w-64 min-h-[42px] pl-9 pr-3.5 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Ordenar produtos"
            className="min-h-[42px] px-3.5 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            <option value="featured">Destaques</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
      </div>

      {/* Product Grid with Cinemagraph Hover & Infinite Living Studio Motion */}
      {loading ? null : filteredProducts.length === 0 ? (
        <div className="py-20 text-center border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)]">
          <p className="font-display text-lg text-[var(--text-primary)]">
            Nenhum produto encontrado
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Tente limpar a busca ou selecionar outra categoria.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategory('Todos');
            }}
            className="mt-5 px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] rounded-lg cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 mt-2">
          {filteredProducts.map((product, idx) => {
            const available = getAvailableStock(product.physicalStock, product.reservedStock);
            const isLowStock = available > 0 && available <= product.minStockAlert;
            const activePrice = product.promoPriceCents ?? product.priceCents;

            return (
              <motion.article
                key={product.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: idx * 0.04 }}
                className="group relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent)] rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 shadow-[var(--shadow-card)]"
              >
                {/* Top animated bronze hairline accent on hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center z-20"
                />

                <button
                  type="button"
                  onClick={() => openDetail(product)}
                  className="aspect-[4/3] w-full overflow-hidden bg-[#141417] text-left cursor-pointer relative"
                >
                  {/* Living cinemagraph image layer */}
                  <div
                    className="w-full h-full animate-cinemagraph"
                    style={{ animationDelay: `${idx * -2.1}s` }}
                  >
                    <SafeImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover cinemagraph-media transition-all duration-700 ease-out"
                    />
                  </div>

                  {/* Ambient breathing bronze studio rim light */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-20 group-hover:opacity-65 transition-opacity duration-500"
                  >
                    <div
                      className="absolute -inset-6 bg-[radial-gradient(circle_at_72%_28%,rgba(181,142,101,0.34),transparent_58%)] animate-orbit-glow"
                      style={{ animationDelay: `${idx * -1.4}s` }}
                    />
                  </div>

                  {/* Continuous subtle diagonal studio light reflection sweep */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden opacity-25 group-hover:opacity-85 transition-opacity duration-300"
                  >
                    <div
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#E7E2DB]/20 to-transparent animate-light-sweep"
                      style={{ animationDelay: `${idx * -1.7}s` }}
                    />
                  </div>

                  {/* Photographic dark scrim & sliding quick-peek bar */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0B0D]/85 via-[#0B0B0D]/30 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-4 bottom-3.5 flex items-center justify-between text-xs text-[#E7E2DB] translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 ease-out">
                    <span className="font-medium tracking-wide">Ver fórmula e modo de uso</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#B58E65]" />
                  </div>
                </button>

                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <span>
                        {product.brand} · {product.category} · {product.volume}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDetail(product)}
                      className="mt-1.5 text-left font-display text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors cursor-pointer"
                    >
                      {product.name}
                    </button>

                    <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                      {product.shortDescription}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div className="font-mono tabular-nums">
                        <span className="text-base font-semibold text-[var(--text-primary)]">
                          {formatBRL(activePrice)}
                        </span>
                        {product.promoPriceCents && (
                          <span className="ml-2 text-xs text-[var(--text-muted)] line-through">
                            {formatBRL(product.priceCents)}
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-xs font-mono tabular-nums ${
                          available === 0
                            ? 'text-[var(--status-danger)]'
                            : isLowStock
                              ? 'text-[var(--status-warn)]'
                              : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {available === 0
                          ? 'Esgotado'
                          : isLowStock
                            ? `Últimas ${available} un.`
                            : `${available} em estoque`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => openDetail(product)}
                        className="min-h-[40px] py-2 px-3 text-xs font-medium text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-lg transition-colors cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        type="button"
                        disabled={available === 0}
                        onClick={() => addToCart(product.id, 1)}
                        className="relative overflow-hidden min-h-[40px] py-2 px-3 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="relative z-10">Adicionar</span>
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-sheen"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct &&
          (() => {
            const liveProduct =
              products.find((p) => p.id === selectedProduct.id) ?? selectedProduct;
            const available = getAvailableStock(
              liveProduct.physicalStock,
              liveProduct.reservedStock,
            );
            const unitPrice = liveProduct.promoPriceCents ?? liveProduct.priceCents;
            const relatedServices = services.filter((s) =>
              liveProduct.compatibleServiceIds.includes(s.id),
            );

            return (
              <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pdp-title"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedProduct(null)}
                  className="fixed inset-0 bg-black/75 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 w-full sm:max-w-4xl max-h-[92dvh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-t-2xl sm:rounded-2xl shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    aria-label="Fechar detalhes do produto"
                    className="absolute top-3.5 right-3.5 z-20 min-w-[40px] min-h-[40px] flex items-center justify-center bg-[#0B0B0D]/80 text-[#E7E2DB] hover:text-[#B58E65] rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-12">
                    {/* Left Living Cinemagraph Studio Media */}
                    <div className="md:col-span-6 bg-[#141417] relative overflow-hidden flex items-center justify-center">
                      <div className="w-full h-full min-h-[240px] sm:min-h-[280px] animate-cinemagraph">
                        <SafeImage
                          src={liveProduct.image}
                          alt={liveProduct.name}
                          className="w-full h-full min-h-[240px] sm:min-h-[280px] object-cover"
                        />
                      </div>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 overflow-hidden opacity-45"
                      >
                        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#E7E2DB]/20 to-transparent animate-light-sweep" />
                      </div>
                    </div>

                    {/* Right Contiguous Purchase Module */}
                    <div className="md:col-span-6 p-5 sm:p-8 flex flex-col justify-between gap-6">
                      <div className="space-y-4">
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          {liveProduct.brand} · {liveProduct.category} · SKU {liveProduct.sku}
                        </p>

                        <h2
                          id="pdp-title"
                          className="font-display text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]"
                        >
                          {liveProduct.name}
                        </h2>

                        <div className="flex items-baseline gap-3 font-mono tabular-nums">
                          <span className="text-2xl font-semibold text-[var(--accent)]">
                            {formatBRL(unitPrice)}
                          </span>
                          {liveProduct.promoPriceCents && (
                            <span className="text-sm text-[var(--text-muted)] line-through">
                              {formatBRL(liveProduct.priceCents)}
                            </span>
                          )}
                          <span className="text-xs text-[var(--text-muted)]">
                            · {liveProduct.volume}
                          </span>
                        </div>

                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {liveProduct.description}
                        </p>

                        {/* Quantity + Primary Add to Bag */}
                        <div className="pt-2 flex items-center gap-3">
                          <div className="inline-flex items-center border border-[var(--border-strong)] rounded-lg bg-[var(--bg-input)]">
                            <button
                              type="button"
                              onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                              aria-label="Diminuir quantidade"
                              className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-sm font-mono tabular-nums text-[var(--text-primary)]">
                              {modalQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setModalQty((q) => Math.min(available, q + 1))}
                              disabled={modalQty >= available}
                              aria-label="Aumentar quantidade"
                              className="px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] disabled:opacity-35 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={available === 0}
                            onClick={async () => {
                              if (await addToCart(liveProduct.id, modalQty)) {
                                setSelectedProduct(null);
                                setCartOpen(true);
                              }
                            }}
                            className="flex-1 min-h-[44px] py-2.5 px-4 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                          >
                            {available > 0 ? 'Adicionar à Sacola' : 'Indisponível'}
                          </button>
                        </div>

                        <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                          Disponível agora: {available} un. (Físico: {liveProduct.physicalStock} ·
                          Reservado: {liveProduct.reservedStock})
                        </p>

                        <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3 text-xs">
                          <div>
                            <p className="font-semibold text-[var(--text-primary)] mb-1">
                              Modo de uso revisado
                            </p>
                            <p className="text-[var(--text-muted)] leading-relaxed">
                              {liveProduct.usageInstructions}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--text-primary)] mb-1">
                              Composição informada
                            </p>
                            <p className="text-[var(--text-muted)] leading-relaxed">
                              {liveProduct.ingredients}
                            </p>
                          </div>
                          {relatedServices.length > 0 && (
                            <div>
                              <p className="font-semibold text-[var(--text-primary)] mb-1.5">
                                Compatível com procedimentos
                              </p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {relatedServices.map((srv) => (
                                  <button
                                    key={srv.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedProduct(null);
                                      startBookingWithService(srv.id, null);
                                    }}
                                    className="text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    {srv.name}
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
};
