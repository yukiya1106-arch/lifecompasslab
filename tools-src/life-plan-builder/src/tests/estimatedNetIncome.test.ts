import { describe, it, expect } from 'vitest';
import { getEstimatedNetIncome, getEstimatedNetRatio, calculateAnnualPersonIncome } from '../engine/income';
import { PersonIncomeInput } from '../types/lifeplan';

describe('働き方に応じた手取り概算と優先順位テスト', () => {
  it('1. 会社員の概算手取りが額面年収の78％になる', () => {
    expect(getEstimatedNetRatio('employee')).toBe(0.78);
    expect(getEstimatedNetIncome(500, 'employee')).toBe(390);

    const input: PersonIncomeInput = {
      workStyle: 'employee',
      currentGrossIncome: 500,
      currentNetIncome: undefined,
      pensionType: 'employees_pension',
      retirementAge: 65,
      retirementAllowance: 0,
      retirementAllowanceAge: 65,
      otherIncome: 0,
      annualGrowthRate: 0,
      incomeChangeEvents: [],
      pensionStartAge: 65,
      pensionEstimate: 150,
    };
    const res = calculateAnnualPersonIncome(input, 35, 35);
    expect(res.netSalary).toBe(390);
  });

  it('2. 自営業の概算手取りが事業所得の70％になる', () => {
    expect(getEstimatedNetRatio('self_employed')).toBe(0.70);
    expect(getEstimatedNetIncome(500, 'self_employed')).toBe(350);

    const input: PersonIncomeInput = {
      workStyle: 'self_employed',
      currentGrossIncome: 500,
      currentNetIncome: undefined,
      pensionType: 'national_pension_only',
      retirementAge: 65,
      retirementAllowance: 0,
      retirementAllowanceAge: 65,
      otherIncome: 0,
      annualGrowthRate: 0,
      incomeChangeEvents: [],
      pensionStartAge: 65,
      pensionEstimate: 80,
    };
    const res = calculateAnnualPersonIncome(input, 35, 35);
    expect(res.netSalary).toBe(350);
  });

  it('3. 手取り入力済みの場合は入力値を優先する', () => {
    const input: PersonIncomeInput = {
      workStyle: 'employee',
      currentGrossIncome: 500,
      currentNetIncome: 420, // 入力済み手取りを優先
      pensionType: 'employees_pension',
      retirementAge: 65,
      retirementAllowance: 0,
      retirementAllowanceAge: 65,
      otherIncome: 0,
      annualGrowthRate: 0,
      incomeChangeEvents: [],
      pensionStartAge: 65,
      pensionEstimate: 150,
    };
    const res = calculateAnnualPersonIncome(input, 35, 35);
    expect(res.netSalary).toBe(420);
  });

  it('4. 無職・専業で収入0円の場合は0円になる', () => {
    expect(getEstimatedNetIncome(0, 'not_working')).toBe(0);

    const input: PersonIncomeInput = {
      workStyle: 'not_working',
      currentGrossIncome: 0,
      currentNetIncome: undefined,
      pensionType: 'national_pension_only',
      retirementAge: 65,
      retirementAllowance: 0,
      retirementAllowanceAge: 65,
      otherIncome: 0,
      annualGrowthRate: 0,
      incomeChangeEvents: [],
      pensionStartAge: 65,
      pensionEstimate: 80,
    };
    const res = calculateAnnualPersonIncome(input, 35, 35);
    expect(res.netSalary).toBe(0);
  });
});
