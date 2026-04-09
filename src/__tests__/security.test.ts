/**
 * Tests for security-critical utility functions.
 * These cover the race condition guard logic, HTML escaping (XSS prevention),
 * and the booking payment status machine.
 */

import { describe, it, expect } from 'vitest';

// ─── 1. escapeHtml — Issue 9 (XSS in email templates) ────────────────────────
// We replicate the escapeHtml function here to test it in isolation.
// If the implementation changes in mailer.ts, update this copy too.
function escapeHtml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

describe('escapeHtml — XSS prevention in email templates', () => {
  it('escapes a basic script tag injection', () => {
    expect(escapeHtml('<script>alert(1)</script>'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes HTML attribute injection with double quotes', () => {
    expect(escapeHtml('" onmouseover="alert(1)"'))
      .toBe('&quot; onmouseover=&quot;alert(1)&quot;');
  });

  it('escapes ampersands to prevent entity abuse', () => {
    expect(escapeHtml('John & Jane')).toBe('John &amp; Jane');
  });

  it('passes through safe plain text unchanged (modulo entity encoding)', () => {
    expect(escapeHtml('John Smith')).toBe('John Smith');
  });

  it('handles null and undefined gracefully without throwing', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces non-string types (e.g. numbers) to string before escaping', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});


// ─── 2. Booking payment status machine — Issue 2 (race condition guard) ───────
// We test the guard logic in isolation: only when paymentStatus is exactly
// "REQUIRES_CAPTURE" should a capture attempt proceed.

type PaymentStatus = 'PENDING' | 'REQUIRES_CAPTURE' | 'CAPTURING' | 'CAPTURED' | 'CANCELED' | 'REFUNDED' | 'FAILED';

/**
 * Simulates the DB-level optimistic lock.
 * Returns true if the lock was acquired (i.e., status was REQUIRES_CAPTURE).
 * In the real code this is a Prisma updateMany with count === 1 check.
 */
function tryAcquireCaptureLock(currentStatus: PaymentStatus): { acquired: boolean; newStatus: PaymentStatus } {
  if (currentStatus === 'REQUIRES_CAPTURE') {
    return { acquired: true, newStatus: 'CAPTURING' };
  }
  return { acquired: false, newStatus: currentStatus };
}

describe('tryAcquireCaptureLock — race condition guard (Issue 2)', () => {
  it('grants the lock when status is REQUIRES_CAPTURE', () => {
    const result = tryAcquireCaptureLock('REQUIRES_CAPTURE');
    expect(result.acquired).toBe(true);
    expect(result.newStatus).toBe('CAPTURING');
  });

  it('denies the lock when already CAPTURING (concurrent request)', () => {
    const result = tryAcquireCaptureLock('CAPTURING');
    expect(result.acquired).toBe(false);
  });

  it('denies the lock when already CAPTURED', () => {
    const result = tryAcquireCaptureLock('CAPTURED');
    expect(result.acquired).toBe(false);
  });

  it('denies the lock when status is PENDING (no payment intent yet)', () => {
    const result = tryAcquireCaptureLock('PENDING');
    expect(result.acquired).toBe(false);
  });

  it('denies the lock when status is CANCELED', () => {
    const result = tryAcquireCaptureLock('CANCELED');
    expect(result.acquired).toBe(false);
  });
});


// ─── 3. Refund trigger logic — Issue 10 (no refund on post-capture cancel) ────
// Tests the decision logic: when should a refund be issued vs. a void/cancel?

type BookingState = { paymentStatus: PaymentStatus; stripePaymentIntentId: string | null };

function determinePaymentAction(booking: BookingState): 'refund' | 'void' | 'none' {
  if (!booking.stripePaymentIntentId) return 'none';
  if (booking.paymentStatus === 'CAPTURED') return 'refund';
  if (booking.paymentStatus === 'REQUIRES_CAPTURE') return 'void';
  return 'none';
}

describe('determinePaymentAction — refund routing (Issue 10)', () => {
  it('returns "refund" when payment was already captured', () => {
    expect(determinePaymentAction({ paymentStatus: 'CAPTURED', stripePaymentIntentId: 'pi_123' }))
      .toBe('refund');
  });

  it('returns "void" when payment is held but not yet captured', () => {
    expect(determinePaymentAction({ paymentStatus: 'REQUIRES_CAPTURE', stripePaymentIntentId: 'pi_123' }))
      .toBe('void');
  });

  it('returns "none" when there is no Stripe payment intent (cash booking)', () => {
    expect(determinePaymentAction({ paymentStatus: 'PENDING', stripePaymentIntentId: null }))
      .toBe('none');
  });

  it('returns "none" when payment is already canceled/refunded', () => {
    expect(determinePaymentAction({ paymentStatus: 'CANCELED', stripePaymentIntentId: 'pi_123' }))
      .toBe('none');
    expect(determinePaymentAction({ paymentStatus: 'REFUNDED', stripePaymentIntentId: 'pi_123' }))
      .toBe('none');
  });
});
