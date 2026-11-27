import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Menu, Moon, ShoppingBag, Sun } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { NordenLogo } from './components/NordenLogo';
import { ASSETS } from './data/seedData';
import type { AppView, StorefrontProduct, Professional, ServiceItem } from './types';
import './index.css';

const LandingContent = lazy(() => import('./views/LandingView').then(({ LandingContent }) => ({ default: LandingContent })));
const StoreContent = lazy(() => import('./views/StoreView').then(({ StoreContent }) => ({ default: StoreContent })));

type Catalog = {
  services: { id: string; name: string; category: string; description: string; price: number; duration: number; padding: number; active: number }[];
  products: { id: string; sku: string; name: string; brand: string; category: string; size: string; price: number; promo: number | null; description: string; usage: string; ingredients: string; image: string; available: number; active: number }[];
  professionals: { id: string; name: string; specialty: string; description: string; image: string; active: number }[];
  serviceProducts: { service_id: string; product_id: string }[];
  compatibility: { service_id: string; professional_id: string }[];
};
type Cart = { items: { id: string; quantity: number }[] };
type Boot = { user: { role: 'cliente' | 'profissional' | 'gestor' } | null; catalog: Catalog; cart?: Cart };

const paths: Record<AppView, string> = { home: '/', store: '/loja', booking: '/usuario/agendar', client: '/usuario', manager: '/gerencia' };
const isStore = location.pathname.replace(/\/$/, '') === '/loja';
const creators = 'Douglas Anderson, Davi Alexandre, Waldemar Roberto e Cristian Pereira';
const cartKey = 'norden-cart';
const themeKey = 'norden_theme';
const primary = 'inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]';
const utility = 'inline-flex size-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--accent)]';

async function api<T>(path: string, body?: object): Promise<T> {
  const signal = AbortSignal.timeout(12000);
  const response = await fetch('/api/' + path, body ? {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'X-Norden-Request': '1' },
    body: JSON.stringify(body),
  } : { cache: 'no-store', signal });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Não foi possível acessar a NORDEN.'), { status: response.status });
  return data;
}

function guestCart(): Record<string, number> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(cartKey) ?? '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      return Object.fromEntries(Object.entries(saved).filter(([, qty]) => Number.isInteger(qty) && qty > 0 && qty <= 99));
    }
  } catch { /* An invalid saved cart is treated as empty. */ }
  return {};
}

function storefront(catalog?: Catalog) {
  if (!catalog) return { services: [], products: [], professionals: [] };
  const services: ServiceItem[] = catalog.services.filter((item) => item.active).map((item) => ({
    ...item, slug: item.id, active: true, priceCents: item.price, durationMin: item.duration,
    bufferMin: item.padding, careTemplateId: '',
    image: item.category.toLowerCase().includes('barba') ? ASSETS.ritualHotTowel : ASSETS.ritualPrecisionCut,
    compatibleProductIds: catalog.serviceProducts.filter((link) => link.service_id === item.id).map((link) => link.product_id),
  }));
  const products: StorefrontProduct[] = catalog.products.filter((item) => item.active).map((item, index) => ({
    ...item, slug: item.id, active: true, volume: item.size, priceCents: item.price, promoPriceCents: item.promo ?? undefined,
    shortDescription: item.description, usageInstructions: item.usage,
    compatibleServiceIds: catalog.serviceProducts.filter((link) => link.product_id === item.id).map((link) => link.service_id),
    availableStock: item.available, featured: index < 4,
  }));
  const professionals: Professional[] = catalog.professionals.filter((item) => item.active).map((item) => ({
    ...item, active: true, roleTitle: item.specialty, bio: item.description, specialties: [],
    serviceIds: catalog.compatibility.filter((link) => link.professional_id === item.id).map((link) => link.service_id),
  }));
  return { services, products, professionals };
}

function go(view: AppView) { location.assign(paths[view]); }
function startBookingWithService(serviceId?: string | null, professionalId?: string | null) {
  const query = new URLSearchParams();
  if (serviceId) query.set('servico', serviceId);
  if (professionalId) query.set('profissional', professionalId);
  location.assign(paths.booking + (query.size ? '?' + query.toString() : ''));
}

function LiveApp() {
  const [boot, setBoot] = useState<Boot>();
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [cart, setCart] = useState(guestCart);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(themeKey) === 'dark'; } catch { return false; }
  });
  const menuButton = useRef<HTMLButtonElement>(null);
  const adding = useRef(false);
  const noticeTimer = useRef<number | undefined>(undefined);
  const data = useMemo(() => storefront(boot?.catalog), [boot?.catalog]);
  const cartCount = Object.values(cart).reduce((total, qty) => total + qty, 0);

  useEffect(() => {
    let current = true;
    api<Boot>('boot?view=storefront').then((result) => {
      if (!current) return;
      setCart(result.cart ? Object.fromEntries(result.cart.items.map(({ id, quantity }) => [id, quantity])) : guestCart());
      setBoot(result);
    }).catch(() => { if (current) setLoadError(true); });
    return () => { current = false; };
  }, [refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch { /* Theme still applies. */ }
  }, [dark]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  function notify(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 4500);
  }

  async function addToCart(id: string, quantity = 1) {
    if (!boot || adding.current) return false;
    notify('');
    if (boot.user && boot.user.role !== 'cliente') {
      notify('Entre com uma conta de cliente para comprar.');
      return false;
    }
    adding.current = true;
    setAddingId(id);
    try {
      if (boot.user) {
        const updated = await api<Cart>('action/cartItem', { productId: id, delta: quantity });
        setCart(Object.fromEntries(updated.items.map((item) => [item.id, item.quantity])));
      } else {
        const stored = guestCart();
        const nextQuantity = (Object.hasOwn(stored, id) ? stored[id] : 0) + quantity;
        const product = data.products.find((item) => item.id === id);
        const available = product && 'availableStock' in product ? product.availableStock : 0;
        if (nextQuantity > Math.min(available, 99)) throw new Error('Quantidade indisponível em estoque.');
        const updated = { ...stored, [id]: nextQuantity };
        try { localStorage.setItem(cartKey, JSON.stringify(updated)); }
        catch { throw new Error('A sacola de visitante precisa de armazenamento. Entre na sua conta para comprar.'); }
        setCart(updated);
      }
      notify('Produto adicionado à sacola.');
      return true;
    } catch (error) {
      if (error instanceof Error && 'status' in error && [401, 404, 409].includes(Number(error.status))) {
        setRefresh((current) => current + 1);
      }
      notify(error instanceof Error && 'status' in error ? error.message :
        (error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')) ? 'Falha de conexão. Confira a sacola antes de tentar novamente.' :
        error instanceof Error ? error.message : 'Não foi possível adicionar o produto.');
      return false;
    } finally {
      adding.current = false;
      setAddingId(null);
    }
  }

  const accountLinks = [
    ['/','Início'], ['/loja','NORDEN Store'], ['/usuario','Área do cliente'], ['/gerencia','Gerência'],
    ...(!boot?.user ? [['/usuario/entrar','Entrar'], ['/usuario/cadastro','Criar conta']] : []),
  ];
  const links = accountLinks.map(([href, label]) => <a key={href} href={href} className="rounded-lg px-2 py-2 text-sm hover:text-[var(--accent)]" aria-current={location.pathname === href ? 'page' : undefined}>{label}</a>);
  const setCartOpen = (open: boolean) => { if (open) location.assign('/usuario/carrinho'); };
  return (
    <MotionConfig reducedMotion="user">
      <a href="#conteudo" className="sr-only focus:not-sr-only">Ir para o conteúdo</a>
      <header onKeyDown={(event) => {
        if (event.key === 'Escape' && menu) {
          setMenu(false);
          menuButton.current?.focus();
        }
      }} className="sticky top-0 z-[var(--layer-header)] border-b border-[var(--border-subtle)] bg-[var(--bg-header)] backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-[1240px] items-center justify-between gap-1.5 px-3 sm:gap-2 sm:px-8">
          <a href="/" aria-label="NORDEN, página inicial"><NordenLogo /></a>
          <nav className="hidden items-center lg:flex" aria-label="Navegação principal">{links}</nav>
          <div className="flex items-center gap-1 min-[375px]:gap-2">
            <button type="button" className={utility + ' max-[374px]:hidden'} onClick={() => setDark(!dark)} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
            <a href="/usuario/carrinho" className={utility + ' relative'} aria-label={`Sacola, ${cartCount} itens`}><ShoppingBag size={17} />{cartCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[var(--accent)] px-1 text-[10px] text-[var(--accent-fg)]">{cartCount}</span>}</a>
            <a href={paths.booking} className={primary + ' max-[374px]:px-2.5'}>Agendar</a>
            <button type="button" className={utility + ' lg:hidden'} ref={menuButton} onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-controls={menu ? "mobile-navigation" : undefined} aria-expanded={menu}><Menu size={19} /></button>
          </div>
        </div>
        {menu && <nav id="mobile-navigation" className="grid gap-1 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 lg:hidden" aria-label="Menu principal">
          {links}
          <button type="button" className="px-2 py-2 text-left text-sm min-[375px]:hidden" onClick={() => setDark(!dark)}>{dark ? 'Ativar modo claro' : 'Ativar modo escuro'}</button>
        </nav>}
      </header>
      <main id="conteudo" tabIndex={-1} className="min-h-[calc(100svh-4rem)]">
        {!boot && (loadError ? (
          <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-8" role="alert">
            Não foi possível carregar o catálogo. <button type="button" className="underline" onClick={() => { setLoadError(false); setRefresh(refresh + 1); }}>Tentar novamente</button>
          </div>
        ) : <p className="sr-only" role="status">Carregando catálogo…</p>)}
        <Suspense fallback={<p className="mx-auto max-w-[1240px] px-4 py-5 sm:px-8" role="status">Carregando página…</p>}>
          {isStore ? <StoreContent {...data} keepFiltersInUrl cartNotice={notice} loading={!boot} {...{ addToCart, addingId, cartCount, setCartOpen, startBookingWithService }} /> :
            <LandingContent {...data} {...{ addToCart, addingId, setCartOpen, startBookingWithService }} live setCurrentView={go} switchRole={() => go('client')} />}
        </Suspense>
      </main>
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-footer)]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-5 px-4 py-8 text-sm text-[var(--text-muted)] sm:px-8">
          <a href="/" aria-label="NORDEN, página inicial"><NordenLogo /></a>
          <p>Criação de {creators}.</p>
          <div className="flex gap-4"><a href="/privacidade" className="hover:underline">Privacidade</a><a href="/termos" className="hover:underline">Termos</a></div>
        </div>
      </footer>
      <div role="status" aria-live="polite" className={notice ? 'fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[var(--layer-toast)] max-w-[calc(100%-2rem)] rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-3 text-sm shadow-lg' : 'sr-only'}>{notice}</div>
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')!).render(<LiveApp />);
