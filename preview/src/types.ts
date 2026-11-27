export type UserRole = 'visitor' | 'client' | 'manager';

export type AppView = 'home' | 'store' | 'booking' | 'client' | 'manager';

export type AllergyStatus = 'SIM' | 'NAO' | 'NAO_SEI' | 'PREFIRO_INFORMAR';

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  stylePreferences: string;
  beardPreferences: string;
  allergyStatus: AllergyStatus;
  allergyDetails: string;
  consentUpdatedAt: string;
}

export interface Professional {
  id: string;
  name: string;
  roleTitle: string;
  bio: string;
  specialties: string[];
  serviceIds: string[];
  image: string;
  experienceYears?: number;
  active: boolean;
}

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  clientBenefit?: string;
  image?: string;
  priceCents: number;
  durationMin: number;
  bufferMin: number;
  compatibleProductIds: string[];
  careTemplateId: string;
  active: boolean;
  featured?: boolean;
}

export type ProductCategory = 'Cabelo' | 'Barba' | 'Pele' | 'Acessórios';

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  volume: string;
  priceCents: number;
  promoPriceCents?: number;
  shortDescription: string;
  description: string;
  usageInstructions: string;
  ingredients: string;
  compatibleServiceIds: string[];
  image: string;
  physicalStock: number;
  reservedStock: number;
  minStockAlert: number;
  active: boolean;
  featured?: boolean;
}

export type BookingStatus =
  | 'PENDENTE'
  | 'CONFIRMADO'
  | 'EM_ATENDIMENTO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMin: number;
  priceCents: number;
  status: BookingStatus;
  preferredProductIds: string[];
  notes?: string;
  createdAt: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export type RescheduleOfferStatus =
  | 'SUGERIDA'
  | 'OFERTADA'
  | 'ACEITA'
  | 'RECUSADA'
  | 'EXPIRADA'
  | 'EFETIVADA'
  | 'INVALIDADA';

export interface RescheduleOffer {
  id: string;
  sourceCancelledBookingId: string;
  targetBookingId: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  serviceDurationMin: number;
  professionalId: string;
  professionalName: string;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  freedWindowMin: number;
  reason: string;
  status: RescheduleOfferStatus;
  expiresAt?: number;
  createdAt: string;
}

export interface CareManualSection {
  title: string;
  items: string[];
}

export interface CareManualSnapshot {
  templateId: string;
  title: string;
  version: string;
  reviewedBy: string;
  reviewedAt: string;
  first24Hours: string[];
  avoidList: string[];
  dailyMaintenance: string[];
  suggestedReturnDays: number;
}

export interface UsedProductRecord {
  productId?: string;
  name: string;
  appliedArea?: 'No cabelo' | 'Na barba' | 'Na pele' | 'Finalização';
  usageNote: string;
}

export interface RecommendedProductRecord {
  productId: string;
  name: string;
  reason: string;
}

export interface CompletedAppointment {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  date: string;
  durationMin: number;
  priceCents: number;
  summary: string;
  clientVisibleNotes: string;
  internalNotes: string; // Never exposed to client views
  beforeImage?: string;
  afterImage?: string;
  usedProducts: UsedProductRecord[];
  recommendedProducts: RecommendedProductRecord[];
  careManual: CareManualSnapshot;
  completedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type DeliveryMode = 'RETIRADA' | 'ENTREGA';

export type OrderStatus =
  | 'RECEBIDO'
  | 'EM_PREPARACAO'
  | 'PRONTO_RETIRADA'
  | 'SAIU_ENTREGA'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface DeliveryAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface OrderEvent {
  status: OrderStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface Order {
  id: string;
  code: string;
  clientId: string;
  clientName: string;
  modality: DeliveryMode;
  status: OrderStatus;
  financialStatus: 'SIMULADO' | 'NAO_PAGO';
  items: OrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  distanceKm?: number;
  totalCents: number;
  address?: DeliveryAddress;
  stockDeducted: boolean;
  createdAt: string;
  events: OrderEvent[];
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'ENTRADA' | 'AJUSTE' | 'RESERVA' | 'LIBERACAO' | 'SAIDA_VENDA';
  quantityDelta: number;
  actor: string;
  reason: string;
  timestamp: string;
}

export interface MonthlyFinancialPoint {
  monthKey: string;
  label: string;
  serviceRevenueCents: number;
  storeDemoRevenueCents: number;
  operatingCostCents: number;
  completedServicesCount: number;
  storeOrdersCount: number;
  occupancyPct: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'warning';
}

export interface DeliverySettings {
  rateCentsPerKm: number;
  baseFeeCents: number;
  minFeeCents: number;
  maxRadiusKm: number;
  pickupLocation: string;
  pickupInstructions: string;
}
