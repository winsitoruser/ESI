#!/usr/bin/env node
/**
 * Payroll fiscal golden cases — PTKP + progressive PPh21 (mirrors lib/hris/pph21-calc.ts).
 * Usage: node scripts/smoke-test-saas-payroll-fiscal.js
 *
 * Note: numbers are engine-acceptance fixtures, not DJP e-Bupot certification.
 * Finance sign-off still required before treating as fiscal GA.
 */
const PTKP = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
};

function getPTKP(status) {
  return PTKP[status] || PTKP['TK/0'];
}

function calculatePPh21Annual(pkp) {
  if (pkp <= 0) return 0;
  const brackets = [
    { limit: 60_000_000, rate: 0.05 },
    { limit: 250_000_000, rate: 0.15 },
    { limit: 500_000_000, rate: 0.25 },
    { limit: 5_000_000_000, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ];
  let tax = 0;
  let remaining = pkp;
  let prev = 0;
  for (const b of brackets) {
    const band = Math.min(remaining, b.limit - prev);
    if (band <= 0) break;
    tax += band * b.rate;
    remaining -= band;
    prev = b.limit;
    if (remaining <= 0) break;
  }
  return Math.round(tax);
}

function monthlyTax(monthlyGross, status) {
  const annual = monthlyGross * 12;
  const pkp = Math.max(0, annual - getPTKP(status));
  return Math.round(calculatePPh21Annual(pkp) / 12);
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', d ? `${m} — ${d}` : m); failed++; };

function assertEq(label, actual, expected) {
  if (actual === expected) ok(`${label} = ${expected}`);
  else fail(label, `got ${actual}, expected ${expected}`);
}

console.log('Payroll fiscal golden (PTKP + PPh21)');

// PTKP table
assertEq('PTKP TK/0', getPTKP('TK/0'), 54_000_000);
assertEq('PTKP K/1', getPTKP('K/1'), 63_000_000);
assertEq('PTKP unknown→TK/0', getPTKP('XX'), 54_000_000);

// PKP below PTKP → 0 tax
assertEq('tax below PTKP', calculatePPh21Annual(0), 0);
assertEq('annual gross 50M TK/0 → 0', calculatePPh21Annual(50_000_000 - 54_000_000), 0);

// First bracket only: PKP 40M → 5% = 2_000_000
assertEq('PKP 40M @5%', calculatePPh21Annual(40_000_000), 2_000_000);

// Cross brackets: PKP 100M → 60M*5% + 40M*15% = 3M + 6M = 9_000_000
assertEq('PKP 100M progressive', calculatePPh21Annual(100_000_000), 9_000_000);

// Realistic monthly: 9M/mo TK/0 → annual 108M, PKP 54M → 5% of 54M = 2.7M /12 = 225_000
assertEq('9M/mo TK/0 monthly', monthlyTax(9_000_000, 'TK/0'), 225_000);

// 18M/mo K/1 → annual 216M, PTKP 63M, PKP 153M → 60M*5% + 93M*15% = 3M + 13.95M = 16.95M /12 = 1_412_500
assertEq('18M/mo K/1 monthly', monthlyTax(18_000_000, 'K/1'), 1_412_500);

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
