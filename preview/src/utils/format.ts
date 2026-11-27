import type { StorefrontProduct } from '../types';

export function storefrontStock(product: StorefrontProduct): number {
  return 'availableStock' in product ? product.availableStock :
    getAvailableStock(product.physicalStock, product.reservedStock);
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDateBR(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(hhmm: string, deltaMin: number): string {
  return minutesToTime(timeToMinutes(hhmm) + deltaMin);
}

export function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  // Semi-open intervals [start, end)
  return startA < endB && startB < endA;
}

export function getAvailableStock(physical: number, reserved: number): number {
  return Math.max(0, physical - reserved);
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function bookingDates() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const dates = [];

  while (dates.length < 5) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() >= 2) {
      dates.push({ iso: localDateKey(date), label: formatter.format(date) });
    }
  }
  return dates;
}
