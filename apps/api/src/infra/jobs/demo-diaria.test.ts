import { describe, expect, it } from 'vitest';
import { demoDesatualizada } from './demo-diaria';

// Instantes em UTC; a demo vive em America/Sao_Paulo (UTC-3, sem horário de verão).
const em = (iso: string) => new Date(iso);

describe('demoDesatualizada', () => {
  it('sem demo, precisa semear', () => {
    expect(demoDesatualizada(null, em('2026-11-23T15:00:00Z').getTime())).toBe(true);
  });

  it('semeada hoje, não refaz', () => {
    expect(
      demoDesatualizada(em('2026-11-23T10:00:00Z'), em('2026-11-23T22:00:00Z').getTime()),
    ).toBe(false);
  });

  it('semeada ontem, refaz', () => {
    expect(
      demoDesatualizada(em('2026-11-22T15:00:00Z'), em('2026-11-23T15:00:00Z').getTime()),
    ).toBe(true);
  });

  it('o dia é o de São Paulo, não o de UTC', () => {
    // 23/11 01:00 UTC ainda é 22/11 22:00 em São Paulo: mesmo dia de uma semeadura às 12:00 de 22/11.
    expect(
      demoDesatualizada(em('2026-11-22T15:00:00Z'), em('2026-11-23T01:00:00Z').getTime()),
    ).toBe(false);
    // 23/11 03:30 UTC já é 23/11 00:30 em São Paulo: virou o dia.
    expect(
      demoDesatualizada(em('2026-11-22T15:00:00Z'), em('2026-11-23T03:30:00Z').getTime()),
    ).toBe(true);
  });
});
