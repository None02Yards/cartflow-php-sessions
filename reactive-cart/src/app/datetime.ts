import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DateTimeService {
  parseUtc(input: string, fallbackNowIfBad = false): number {
    const isoLike = input.includes('T') ? input : input.replace(' ', 'T') + 'Z';
    let t = Date.parse(isoLike);
    if (Number.isNaN(t)) t = Date.parse(input);
    if (Number.isNaN(t)) {
      if (fallbackNowIfBad) return Date.now();
      throw new Error(`Unparseable date: ${input}`);
    }
    return t;
  }

  addDaysMs(baseMs: number, days: number): number {
    const whole = Math.floor(days);
    const frac = days - whole;
    const secs = Math.round(frac * 86400);
    return baseMs + whole * 86400_000 + secs * 1000;
  }

  diffAsString(fromMs: number, toMs: number): string {
    const sign = toMs >= fromMs ? '+' : '-';
    let delta = Math.abs(toMs - fromMs);
    const days = Math.floor(delta / 86400_000);
    delta -= days * 86400_000;
    const hours = Math.floor(delta / 3_600_000);
    delta -= hours * 3_600_000;
    const minutes = Math.floor(delta / 60_000);
    return `${sign}${days} days ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
  }

  formatInTz(utcMs: number, timeZone: string, pattern: Intl.DateTimeFormatOptions = {}): string {
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone, ...pattern
    };
    return new Intl.DateTimeFormat(undefined, opts).format(new Date(utcMs));
  }

  localizedHeader(utcMs: number, timeZone: string): string {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long', month: 'long', day: '2-digit', year: 'numeric', timeZone
    }).format(new Date(utcMs));
  }

  estimateDeliveryLocal(baseUtcMs: number, shippingDays: number, timeZone: string): number {
    const etaUtc = this.addDaysMs(baseUtcMs, shippingDays);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date(etaUtc));
    const y = Number(parts.find(p => p.type === 'year')?.value);
    const m = Number(parts.find(p => p.type === 'month')?.value);
    const d = Number(parts.find(p => p.type === 'day')?.value);
    const localNine = new Date(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T09:00:00`);
    return localNine.getTime();
  }

  isReturnWindowOpen(deliveredUtcMs: number | undefined, days = 14, nowUtcMs = Date.now()): boolean {
    if (!deliveredUtcMs) return true;
    const deadline = this.addDaysMs(deliveredUtcMs, days);
    return nowUtcMs <= deadline;
  }
}
