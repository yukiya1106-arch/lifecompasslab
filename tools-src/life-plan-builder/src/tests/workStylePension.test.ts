import { describe, it, expect } from 'vitest';
import { getInitialPensionTypeForWorkStyle, normalizeLifePlanInput } from '../engine/normalization';
import { LifePlanInput } from '../types/lifeplan';

describe('働き方と年金加入区分の連動・旧JSON補完テスト', () => {
  it('1. 会社員では厚生年金加入が初期選択される', () => {
    expect(getInitialPensionTypeForWorkStyle('employee')).toBe('employees_pension');
  });

  it('2. 自営業では国民年金のみが初期選択される', () => {
    expect(getInitialPensionTypeForWorkStyle('self_employed')).toBe('national_pension_only');
  });

  it('3. パート・アルバイトでは「分からない」が初期選択される', () => {
    expect(getInitialPensionTypeForWorkStyle('part_time')).toBe('unknown');
  });

  it('4. 旧JSONへ新項目（働き方：会社員、年金加入区分：厚生年金に加入）が安全に補完される', () => {
    // 旧JSONスキーマ（workStyle, pensionTypeを含まない状態）を模倣
    const oldJson: any = {
      schemaVersion: 1,
      personIncome: {
        currentGrossIncome: 500,
      },
      spouseIncome: {
        currentGrossIncome: 300,
      },
    };

    const normalized: LifePlanInput = normalizeLifePlanInput(oldJson);

    // 本人の補完値確認
    expect(normalized.personIncome.workStyle).toBe('employee');
    expect(normalized.personIncome.pensionType).toBe('employees_pension');

    // 配偶者の補完値確認
    expect(normalized.spouseIncome.workStyle).toBe('employee');
    expect(normalized.spouseIncome.pensionType).toBe('employees_pension');
  });
});
