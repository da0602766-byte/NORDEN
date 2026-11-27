import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Modal } from '../components/Modal';
import { Search, Plus, Minus, X, ArrowRight, ShoppingBag } from 'lucide-react';
import { useNorden } from '../context/NordenContext';
import { SafeImage } from '../components/SafeImage';
import { formatBRL, storefrontStock } from '../utils/format';
import type { StorefrontProduct } from '../types';

const normalizeSearch = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type StoreProps = Pick<ReturnType<typeof useNorden>, 'services' | 'setCartOpen' | 'cartCount' | 'startBookingWithService'> & {
  products: StorefrontProduct[];
  addingId?: string | null;
  cartNotice?: string;
  keepFiltersInUrl?: boolean;
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
    addingId,
    cartNotice,
    keepFiltersInUrl,
    setCartOpen,
    cartCount,
    startBookingWithService,
    deliverySettings,
    loading,
  } = props;

  const initialFilters = new URLSearchParams(keepFiltersInUrl ? location.search : '');
  const [search, setSearch] = useState(() => initialFilters.get('busca') ?? '');
  const [category, setCategory] = useState(() => initialFilters.get('categoria') || 'Todos');
  const [sortBy, setSortBy] = useState(() => {
    const order = initialFilters.get('ordem');
    return order === 'price-asc' || order === 'price-desc' ? order : 'featured';
  });
  useEffect(() => {
    if (!keepFiltersInUrl) return;
    const url = new URL(location.href);
    for (const [key, value] of [['busca', search.trim()], ['categoria', category === 'Todos' ? '' : category],
      ['ordem', sortBy === 'featured' ? '' : sortBy]]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (url.href !== location.href) history.replaceState(history.state, '', url);
  }, [search, category, sortBy, keepFiltersInUrl]);
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [modalQty, setModalQty] = useState(1);

  const filteredProducts = useMemo(() => {
    const q = normalizeSearch(search.trim());
    const list = products.filter((p) => {
      if (!p.active) return false;
      if (category !== 'Todos' && p.category !== category) return false;
      if (q) {
        return [p.name, p.shortDescription, p.sku, p.brand, p.category]
          .some((text) => normalizeSearch(text).includes(q));
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

  const openDetail = (product: StorefrontProduct) => {
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

      {/* Compact, manually scrollable product shortcuts */}
      {products.some((item) => item.active) && (
      <div className="mt-6 mb-2 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] py-3" role="region" aria-label="Atalhos de produtos">
        <div className="flex w-max">
          {products.filter((item) => item.active).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openDetail(item)}
              className="group/ribbon inline-flex items-center gap-3.5 px-5 shrink-0 text-left cursor-pointer border-r border-[var(--border-subtle)] last:border-r-0"
            >
              <div className="w-11 h-11 rounded-md overflow-hidden bg-[var(--bg-surface)] shrink-0 relative">
                <SafeImage
                  src={item.image}
                  alt=""
                  className="w-full h-full object-cover"
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

      )}

      {/* Filter & Search Toolbar */}
      <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['Todos', ...new Set(products.filter((product) => product.active).map((product) => product.category))].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
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
            maxLength={100}
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
            const available = storefrontStock(product);
            const isLowStock = available > 0 && available <= ('minStockAlert' in product ? product.minStockAlert : 0);
            const activePrice = product.promoPriceCents ?? product.priceCents;

            return (
              <motion.article
                key={product.id}
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
                  aria-label={`Ver detalhes de ${product.name}`}
                  className="aspect-[4/3] w-full overflow-hidden bg-[#141417] text-left cursor-pointer relative"
                >
                  {/* Living cinemagraph image layer */}
                  <div
                    className="w-full h-full"
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
                      className="absolute -inset-6 bg-[radial-gradient(circle_at_72%_28%,rgba(181,142,101,0.34),transparent_58%)]"
                    />
                  </div>

                  {/* Continuous subtle diagonal studio light reflection sweep */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden opacity-25 group-hover:opacity-85 transition-opacity duration-300"
                  >
                    <div
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#E7E2DB]/20 to-transparent"
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
                        {product.promoPriceCents != null && (
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

                    <div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => openDetail(product)}
                        aria-label={`Ver detalhes de ${product.name}`}
                        className="min-h-[40px] py-2 px-3 text-xs font-medium text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent)] rounded-lg transition-colors cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        type="button"
                        disabled={available === 0 || Boolean(addingId)}
                        onClick={() => addToCart(product.id, 1)}
                        className="relative overflow-hidden min-h-[40px] py-2 px-3 text-xs font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="relative z-10">{addingId === product.id ? 'Adicionando…' : 'Adicionar'}</span>
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
      {selectedProduct &&
          (() => {
            const liveProduct =
              products.find((p) => p.id === selectedProduct.id) ?? selectedProduct;
            const available = products.some((p) => p.id === liveProduct.id && p.active) ? storefrontStock(liveProduct) : 0;
            const unitPrice = liveProduct.promoPriceCents ?? liveProduct.priceCents;
            const relatedServices = services.filter((s) =>
              liveProduct.compatibleServiceIds.includes(s.id),
            );

            return (
              <Modal
                open
                onDismiss={() => setSelectedProduct(null)}
                dismissBlocked={Boolean(addingId)}
                aria-labelledby="pdp-title"
                className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl backdrop:bg-black/75 sm:inset-0 sm:m-auto sm:w-[calc(100%-3rem)] sm:max-w-4xl sm:rounded-2xl"
              >
                <div className="sticky top-0 z-20 h-0">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    data-initial-focus
                    disabled={Boolean(addingId)}
                    aria-label="Fechar detalhes do produto"
                    className="absolute top-3.5 right-3.5 z-20 min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#0B0B0D]/85 text-[#E7E2DB] hover:text-[#B58E65] rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                </div>
                  <div className="grid grid-cols-1 md:grid-cols-12">
                    {/* Left Living Cinemagraph Studio Media */}
                    <div className="md:col-span-6 bg-[#141417] relative overflow-hidden flex items-center justify-center">
                      <div className="w-full h-full min-h-[160px] sm:min-h-[280px]">
                        <SafeImage
                          src={liveProduct.image}
                          alt={liveProduct.name}
                          className="w-full h-full min-h-[160px] sm:min-h-[280px] object-cover"
                        />
                      </div>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 overflow-hidden opacity-45"
                      >
                        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#E7E2DB]/20 to-transparent" />
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
                          {liveProduct.promoPriceCents != null && (
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
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center border border-[var(--border-strong)] rounded-lg bg-[var(--bg-input)]">
                            <button
                              type="button"
                              onClick={() => setModalQty((q) => Math.max(1, Math.min(q, available) - 1))}
                              disabled={modalQty <= 1 || available <= 1 || Boolean(addingId)}
                              aria-label="Diminuir quantidade"
                              className="min-h-11 px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-sm font-mono tabular-nums text-[var(--text-primary)]">
                              {Math.min(modalQty, Math.max(1, available))}
                            </span>
                            <button
                              type="button"
                              onClick={() => setModalQty((q) => Math.min(99, available, q + 1))}
                              disabled={modalQty >= Math.min(99, available) || Boolean(addingId)}
                              aria-label="Aumentar quantidade"
                              className="min-h-11 px-3 py-2.5 text-[var(--text-primary)] hover:text-[var(--accent)] disabled:opacity-35 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={available === 0 || Boolean(addingId)}
                            onClick={async () => {
                              if (await addToCart(liveProduct.id, Math.min(modalQty, available, 99))) {
                                setSelectedProduct(null);
                                setCartOpen(true);
                              }
                            }}
                            className="flex-1 min-h-[44px] py-2.5 px-4 text-sm font-semibold text-[var(--accent-fg)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                          >
                            {addingId === liveProduct.id ? 'Adicionando…' : available > 0 ? 'Adicionar à sacola' : 'Indisponível'}
                          </button>
                        </div>

                        <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                          Disponível para compra: {available} un.
                        </p>

                        {cartNotice && <p role="status" className="text-sm text-[var(--text-primary)]">{cartNotice}</p>}

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
              </Modal>
            );
          })()}
    </div>
  );
};
