import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Coins,
  Percent,
  Calendar,
  Home,
  Users,
  User,
  Baby,
  FileText,
  Navigation,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// ==========================================
// 1. TYPE DEFINITIONS & CONSTANTS
// ==========================================

export interface PersonInputs {
  income: number; // in ten-thousand yen (万円)
  incomeTax: number; // in yen (円)
  residentTax: number; // in yen (円)
  hasChildcare: boolean;
  childcareStartYear: number;
  childcareEndYear: number;
  childcareSalaryRate: number; // 0% - 100%
  returnedSalaryRate: number; // 0% - 100%
  borrowRate: number; // 0% - 100%
  ownershipRate: number; // 0% - 100%
  taxableTotalIncome?: number; // in ten-thousand yen (万円) - optional
  customResidentTaxes?: { [year: number]: number }; // optional override

  // Added for TAX AUTO MODE
  taxInputMode?: 'AUTO' | 'MANUAL';
  socialInsuranceRate?: number;
  monthlyIdeco?: number;
  lifeInsuranceDeduction?: number;
  earthquakeInsuranceDeduction?: number;
  dependentCount?: number;
  hasDependentUnder23?: boolean;
  useSpouseDeduction?: boolean;
  taxableIncomeForResidentTax?: number;
}

export interface SimulationInputs {
  moveInYear: number;
  housingType: 'new' | 'used' | 'resale';
  housingPerformance: 'premium' | 'zeh' | 'standard' | 'other';
  isChildYoung: boolean;
  propertyPrice: number; // in ten-thousand yen (万円)
  loanAmount: number; // in ten-thousand yen (万円)
  interestRate: number; // in percentage (%)
  repaymentPeriod: number; // years
  loanType: 'single' | 'pair' | 'joint';
  husband: PersonInputs;
  wife: PersonInputs;
  floorArea?: number; // Floor area in m²
  residentialRatio?: number; // Residential ratio in %
  is災害RedZone?: boolean; // Disaster red zone
  isPost2028StandardUnderConstruction?: boolean; // Post-2028 Standard under construction
  useReconstructionTax?: boolean; // Option for reconstruction tax calculation
}

export interface TaxCapacity {
  income: number;
  incomeTax: number;
  residentTax: number;
  isChildcareActive: boolean;
  isReturnedActive: boolean;
  taxableIncomeForResidentTax?: number;
}

export interface HousingConfig {
  limit: number; // in yen
  duration: number; // in years
  isExcluded: boolean;
}

export interface YearSimulationResult {
  yearIndex: number;
  calendarYear: number;
  husband: {
    loanBalance: number;
    limit: number;
    propertyLimit: number;
    deductionLimit: number;
    capacity: TaxCapacity;
    incomeTaxDeduction: number;
    residentTaxDeduction: number;
    unusedDeduction: number;
    totalDeduction: number;
  };
  wife: {
    loanBalance: number;
    limit: number;
    propertyLimit: number;
    deductionLimit: number;
    capacity: TaxCapacity;
    incomeTaxDeduction: number;
    residentTaxDeduction: number;
    unusedDeduction: number;
    totalDeduction: number;
  };
  household: {
    deductionLimit: number;
    actualDeduction: number;
    unusedDeduction: number;
    incomeTaxDeduction: number;
    residentTaxDeduction: number;
  };
}

const DEFAULT_INPUTS: SimulationInputs = {
  moveInYear: 2026,
  housingType: 'new',
  housingPerformance: 'zeh',
  isChildYoung: true,
  propertyPrice: 7000,
  loanAmount: 6000,
  interestRate: 0.8,
  repaymentPeriod: 35,
  loanType: 'pair',
  floorArea: 70,
  residentialRatio: 100,
  is災害RedZone: false,
  isPost2028StandardUnderConstruction: false,
  useReconstructionTax: false,
  husband: {
    income: 700,
    incomeTax: 320000,
    residentTax: 420000,
    hasChildcare: false,
    childcareStartYear: 2027,
    childcareEndYear: 2028,
    childcareSalaryRate: 0,
    returnedSalaryRate: 100,
    borrowRate: 60,
    ownershipRate: 60,
    taxableTotalIncome: undefined,
    customResidentTaxes: {},
    taxInputMode: 'AUTO',
    socialInsuranceRate: 15,
    monthlyIdeco: 0,
    lifeInsuranceDeduction: 0,
    earthquakeInsuranceDeduction: 0,
    dependentCount: 0,
    hasDependentUnder23: false,
    useSpouseDeduction: false,
    taxableIncomeForResidentTax: 0,
  },
  wife: {
    income: 500,
    incomeTax: 170000,
    residentTax: 260000,
    hasChildcare: true,
    childcareStartYear: 2027,
    childcareEndYear: 2028,
    childcareSalaryRate: 0,
    returnedSalaryRate: 80,
    borrowRate: 40,
    ownershipRate: 40,
    taxableTotalIncome: undefined,
    customResidentTaxes: {},
    taxInputMode: 'AUTO',
    socialInsuranceRate: 15,
    monthlyIdeco: 0,
    lifeInsuranceDeduction: 0,
    earthquakeInsuranceDeduction: 0,
    dependentCount: 0,
    hasDependentUnder23: false,
    useSpouseDeduction: false,
    taxableIncomeForResidentTax: 0,
  },
};

// ==========================================
// 2. CORE CALCULATION FUNCTIONS
// ==========================================

export function getHousingConfig(
  type: 'new' | 'used' | 'resale',
  performance: 'premium' | 'zeh' | 'standard' | 'other',
  isChildYoung: boolean
): HousingConfig {
  if (type === 'new') {
    if (performance === 'premium') {
      return { limit: isChildYoung ? 50000000 : 45000000, duration: 13, isExcluded: false };
    } else if (performance === 'zeh') {
      return { limit: isChildYoung ? 45000000 : 35000000, duration: 13, isExcluded: false };
    } else if (performance === 'standard') {
      return { limit: isChildYoung ? 30000000 : 20000000, duration: 13, isExcluded: false };
    } else {
      return { limit: 0, duration: 0, isExcluded: true }; // 原則対象外
    }
  } else if (type === 'used') {
    if (performance === 'premium' || performance === 'zeh') {
      return { limit: isChildYoung ? 45000000 : 35000000, duration: 13, isExcluded: false };
    } else if (performance === 'standard') {
      return { limit: isChildYoung ? 30000000 : 20000000, duration: 13, isExcluded: false };
    } else {
      return { limit: 20000000, duration: 10, isExcluded: false };
    }
  } else {
    // 買取再販 (resale)
    if (performance === 'premium') {
      return { limit: isChildYoung ? 50000000 : 45000000, duration: 13, isExcluded: false };
    } else if (performance === 'zeh') {
      return { limit: isChildYoung ? 45000000 : 35000000, duration: 13, isExcluded: false };
    } else if (performance === 'standard') {
      return { limit: isChildYoung ? 30000000 : 20000000, duration: 13, isExcluded: false };
    } else {
      return { limit: 20000000, duration: 10, isExcluded: false };
    }
  }
}

export function calculateLoanBalance(loanAmount: number, annualRate: number, termYears: number, targetYear: number): number {
  if (loanAmount <= 0) return 0;
  if (targetYear <= 0) return loanAmount;
  const totalMonths = termYears * 12;
  const targetMonth = targetYear * 12;
  if (targetMonth >= totalMonths) return 0;

  if (annualRate <= 0) {
    const monthlyPayment = loanAmount / totalMonths;
    return Math.max(0, loanAmount - targetMonth * monthlyPayment);
  }

  const monthlyRate = annualRate / 100 / 12;
  const power = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyPayment = loanAmount * (monthlyRate * power) / (power - 1);

  const mPower = Math.pow(1 + monthlyRate, targetMonth);
  const remaining = loanAmount * mPower - (monthlyPayment * (mPower - 1)) / monthlyRate;
  return Math.max(0, remaining);
}

export function calculateSalaryIncome(grossSalary: number): number {
  if (grossSalary <= 650000) return 0;
  if (grossSalary <= 1900000) return Math.max(0, grossSalary - 650000);
  if (grossSalary <= 3600000) return grossSalary - (grossSalary * 0.3 + 80000);
  if (grossSalary <= 6600000) return grossSalary - (grossSalary * 0.2 + 440000);
  if (grossSalary <= 8500000) return grossSalary - (grossSalary * 0.1 + 1100000);
  return grossSalary - 1950000;
}

export function calculateIncomeTaxAmount(taxableIncome: number): number {
  const x = Math.max(0, Math.floor(taxableIncome / 1000) * 1000);
  if (x <= 1950000) return x * 0.05;
  if (x <= 3300000) return x * 0.10 - 97500;
  if (x <= 6950000) return x * 0.20 - 427500;
  if (x <= 9000000) return x * 0.23 - 636000;
  if (x <= 18000000) return x * 0.33 - 1536000;
  if (x <= 40000000) return x * 0.40 - 2796000;
  return x * 0.45 - 4796000;
}

export function calculateApproxTax(
  person: PersonInputs,
  year: number,
  currentIncomeRatio: number,
  useReconstructionTax: boolean = false
) {
  const currentGrossYen = (person.income * 10000) * currentIncomeRatio;

  let prevFactor = 1.0;
  if (person.hasChildcare) {
    const prevYear = year - 1;
    if (prevYear >= person.childcareStartYear && prevYear <= person.childcareEndYear) {
      prevFactor = (person.childcareSalaryRate ?? 0) / 100;
    } else if (prevYear > person.childcareEndYear) {
      prevFactor = (person.returnedSalaryRate ?? 100) / 100;
    }
  }
  const prevGrossYen = (person.income * 10000) * prevFactor;

  const currentSalaryIncome = Math.floor(calculateSalaryIncome(currentGrossYen));
  const prevSalaryIncome = Math.floor(calculateSalaryIncome(prevGrossYen));

  const socialInsuranceDeduction = Math.floor(currentGrossYen * ((person.socialInsuranceRate ?? 15) / 100));
  const prevSocialInsuranceDeduction = Math.floor(prevGrossYen * ((person.socialInsuranceRate ?? 15) / 100));

  const idecoDeduction = (person.monthlyIdeco ?? 0) * 12;
  const lifeDeduction = person.lifeInsuranceDeduction ?? 0;
  const earthquakeDeduction = person.earthquakeInsuranceDeduction ?? 0;

  let dependentDeduction = (person.dependentCount ?? 0) * 380000;
  if (person.hasDependentUnder23) {
    dependentDeduction += 250000;
  }

  const spouseDeduction = person.useSpouseDeduction ? 380000 : 0;

  let basicDeductionIncomeTax = 580000;
  if (currentSalaryIncome > 25000000) {
    basicDeductionIncomeTax = 0;
  } else if (currentSalaryIncome > 24500000) {
    basicDeductionIncomeTax = 160000;
  } else if (currentSalaryIncome > 24000000) {
    basicDeductionIncomeTax = 320000;
  } else if (currentSalaryIncome > 23500000) {
    basicDeductionIncomeTax = 480000;
  }

  const estimatedTaxableIncome = Math.max(
    0,
    currentSalaryIncome -
      socialInsuranceDeduction -
      idecoDeduction -
      lifeDeduction -
      earthquakeDeduction -
      dependentDeduction -
      spouseDeduction -
      basicDeductionIncomeTax
  );

  let incomeTaxAmount = calculateIncomeTaxAmount(estimatedTaxableIncome);
  if (useReconstructionTax) {
    incomeTaxAmount = Math.round(incomeTaxAmount * 1.021);
  } else {
    incomeTaxAmount = Math.round(incomeTaxAmount);
  }

  const estimatedResidentTaxableIncome = Math.max(
    0,
    prevSalaryIncome -
      prevSocialInsuranceDeduction -
      idecoDeduction -
      lifeDeduction -
      earthquakeDeduction -
      dependentDeduction -
      spouseDeduction -
      430000
  );

  const estimatedResidentTax = Math.round(estimatedResidentTaxableIncome * 0.10);

  return {
    estimatedIncomeTax: incomeTaxAmount,
    estimatedResidentTax,
    estimatedTaxableIncome,
    estimatedResidentTaxableIncome,
    salaryIncome: currentSalaryIncome,
    socialInsuranceDeduction,
  };
}

export function getTaxCapacity(
  person: PersonInputs,
  calendarYear: number,
  useReconstructionTax: boolean = false
): TaxCapacity {
  let currentFactor = 1.0;
  let isChildcareActive = false;
  let isReturnedActive = false;

  if (person.hasChildcare) {
    if (calendarYear >= person.childcareStartYear && calendarYear <= person.childcareEndYear) {
      currentFactor = (person.childcareSalaryRate ?? 0) / 100;
      isChildcareActive = true;
    } else if (calendarYear > person.childcareEndYear) {
      currentFactor = (person.returnedSalaryRate ?? 100) / 100;
      isReturnedActive = true;
    }
  }

  const mode = person.taxInputMode ?? 'AUTO';

  if (mode === 'AUTO') {
    const approx = calculateApproxTax(person, calendarYear, currentFactor, useReconstructionTax);
    return {
      income: person.income * currentFactor,
      incomeTax: approx.estimatedIncomeTax,
      residentTax: approx.estimatedResidentTax,
      isChildcareActive,
      isReturnedActive,
      taxableIncomeForResidentTax: approx.estimatedResidentTaxableIncome,
    };
  } else {
    let prevFactor = 1.0;
    if (person.hasChildcare) {
      const prevYear = calendarYear - 1;
      if (prevYear >= person.childcareStartYear && prevYear <= person.childcareEndYear) {
        prevFactor = (person.childcareSalaryRate ?? 0) / 100;
      } else if (prevYear > person.childcareEndYear) {
        prevFactor = (person.returnedSalaryRate ?? 100) / 100;
      }
    }

    let finalResidentTax = (person.residentTax ?? 0) * prevFactor;
    if (person.customResidentTaxes && person.customResidentTaxes[calendarYear] !== undefined) {
      finalResidentTax = person.customResidentTaxes[calendarYear];
    }

    let rawTaxable = 0;
    if (person.taxableIncomeForResidentTax !== undefined && person.taxableIncomeForResidentTax !== 0) {
      rawTaxable = person.taxableIncomeForResidentTax < 10000
        ? person.taxableIncomeForResidentTax * 10000
        : person.taxableIncomeForResidentTax;
    } else if (person.taxableTotalIncome !== undefined) {
      rawTaxable = person.taxableTotalIncome * 10000;
    }
    const scaledTaxable = rawTaxable * prevFactor;

    return {
      income: person.income * currentFactor,
      incomeTax: (person.incomeTax ?? 0) * currentFactor,
      residentTax: finalResidentTax,
      isChildcareActive,
      isReturnedActive,
      taxableIncomeForResidentTax: scaledTaxable,
    };
  }
}

export function estimateTaxes(incomeManYen: number): { incomeTax: number; residentTax: number } {
  const income = incomeManYen * 10000;
  let employmentIncomeDeduction = 0;
  if (income <= 1625000) {
    employmentIncomeDeduction = 550000;
  } else if (income <= 1800000) {
    employmentIncomeDeduction = income * 0.4 - 100000;
  } else if (income <= 3600000) {
    employmentIncomeDeduction = income * 0.3 + 80000;
  } else if (income <= 6600000) {
    employmentIncomeDeduction = income * 0.2 + 440000;
  } else if (income <= 8500000) {
    employmentIncomeDeduction = income * 0.1 + 1100000;
  } else {
    employmentIncomeDeduction = 1950000;
  }

  const socialInsurance = income * 0.14;
  const otherDeductions = 480000 + 380000;
  const taxableIncome = Math.max(0, income - employmentIncomeDeduction - socialInsurance - otherDeductions);

  let incomeTax = 0;
  if (taxableIncome <= 1950000) {
    incomeTax = taxableIncome * 0.05;
  } else if (taxableIncome <= 3300000) {
    incomeTax = taxableIncome * 0.10 - 97500;
  } else if (taxableIncome <= 6950000) {
    incomeTax = taxableIncome * 0.20 - 427500;
  } else if (taxableIncome <= 9000000) {
    incomeTax = taxableIncome * 0.23 - 636000;
  } else if (taxableIncome <= 18000000) {
    incomeTax = taxableIncome * 0.33 - 1536000;
  } else {
    incomeTax = taxableIncome * 0.40 - 2796000;
  }
  incomeTax *= 1.021;

  const taxableIncomeResident = Math.max(0, income - employmentIncomeDeduction - socialInsurance - (430000 + 330000));
  const residentTax = taxableIncomeResident * 0.10;

  return {
    incomeTax: Math.round(incomeTax),
    residentTax: Math.round(residentTax),
  };
}

export function runSimulation(inputs: SimulationInputs) {
  const config = getHousingConfig(inputs.housingType, inputs.housingPerformance, inputs.isChildYoung);
  const duration = config.duration;

  const hBorrowRate = inputs.loanType === 'single' ? 100 : inputs.husband.borrowRate;
  const wBorrowRate = inputs.loanType === 'single' ? 0 : (100 - hBorrowRate);

  const hOwnershipRate = inputs.loanType === 'single' ? 100 : inputs.husband.ownershipRate;
  const wOwnershipRate = inputs.loanType === 'single' ? 0 : (100 - hOwnershipRate);

  const hLoanAmount = (inputs.loanAmount * 10000) * (hBorrowRate / 100);
  const wLoanAmount = (inputs.loanAmount * 10000) * (wBorrowRate / 100);
  const propertyYen = inputs.propertyPrice * 10000;

  const results: YearSimulationResult[] = [];

  const rRatio = inputs.residentialRatio ?? 100;
  let ratioFactor = 1.0;
  if (rRatio < 50) {
    ratioFactor = 0.0;
  } else if (rRatio < 90) {
    ratioFactor = rRatio / 100;
  }

  // 1. Calculate actual results with childcare leave active
  for (let t = 1; t <= duration; t++) {
    const calendarYear = inputs.moveInYear + t - 1;

    const hBalance = calculateLoanBalance(hLoanAmount, inputs.interestRate, inputs.repaymentPeriod, t) * ratioFactor;
    const wBalance = calculateLoanBalance(wLoanAmount, inputs.interestRate, inputs.repaymentPeriod, t) * ratioFactor;

    const hPropLimit = propertyYen * (hOwnershipRate / 100);
    const wPropLimit = propertyYen * (wOwnershipRate / 100);

    const hLimit = config.limit * (hBorrowRate / 100);
    const wLimit = config.limit * (wBorrowRate / 100);

    const hDeductionLimit = Math.min(hBalance, hPropLimit, hLimit) * 0.007;
    const wDeductionLimit = Math.min(wBalance, wPropLimit, wLimit) * 0.007;

    const hCapacity = getTaxCapacity(inputs.husband, calendarYear, inputs.useReconstructionTax);
    const wCapacity = getTaxCapacity(inputs.wife, calendarYear, inputs.useReconstructionTax);

    const hTaxableTotalYear = hCapacity.taxableIncomeForResidentTax ?? 0;
    const hResidentLimitYear = hTaxableTotalYear > 0 
      ? Math.min(Math.round(hTaxableTotalYear * 0.05), 97500) 
      : 97500;

    const wTaxableTotalYear = wCapacity.taxableIncomeForResidentTax ?? 0;
    const wResidentLimitYear = wTaxableTotalYear > 0 
      ? Math.min(Math.round(wTaxableTotalYear * 0.05), 97500) 
      : 97500;

    const hIncomeTaxDeduction = Math.min(hDeductionLimit, hCapacity.incomeTax);
    const wIncomeTaxDeduction = Math.min(wDeductionLimit, wCapacity.incomeTax);

    const hRemaining = hDeductionLimit - hIncomeTaxDeduction;
    const wRemaining = wDeductionLimit - wIncomeTaxDeduction;

    const hResidentTaxDeduction = Math.min(hRemaining, hCapacity.residentTax, hResidentLimitYear);
    const wResidentTaxDeduction = Math.min(wRemaining, wCapacity.residentTax, wResidentLimitYear);

    const hTotalDeduction = hIncomeTaxDeduction + hResidentTaxDeduction;
    const hUnusedDeduction = hDeductionLimit - hTotalDeduction;

    const wTotalDeduction = wIncomeTaxDeduction + wResidentTaxDeduction;
    const wUnusedDeduction = wDeductionLimit - wTotalDeduction;

    results.push({
      yearIndex: t,
      calendarYear,
      husband: {
        loanBalance: hBalance,
        limit: hLimit,
        propertyLimit: hPropLimit,
        deductionLimit: hDeductionLimit,
        capacity: hCapacity,
        incomeTaxDeduction: hIncomeTaxDeduction,
        residentTaxDeduction: hResidentTaxDeduction,
        unusedDeduction: hUnusedDeduction,
        totalDeduction: hTotalDeduction,
      },
      wife: {
        loanBalance: wBalance,
        limit: wLimit,
        propertyLimit: wPropLimit,
        deductionLimit: wDeductionLimit,
        capacity: wCapacity,
        incomeTaxDeduction: wIncomeTaxDeduction,
        residentTaxDeduction: wResidentTaxDeduction,
        unusedDeduction: wUnusedDeduction,
        totalDeduction: wTotalDeduction,
      },
      household: {
        deductionLimit: hDeductionLimit + wDeductionLimit,
        actualDeduction: hTotalDeduction + wTotalDeduction,
        unusedDeduction: hUnusedDeduction + wUnusedDeduction,
        incomeTaxDeduction: hIncomeTaxDeduction + wIncomeTaxDeduction,
        residentTaxDeduction: hResidentTaxDeduction + wResidentTaxDeduction,
      },
    });
  }

  // 2. Calculate normal results (without childcare leave active) to find childcare loss
  let normalActualDeduction = 0;
  for (let t = 1; t <= duration; t++) {
    const calendarYear = inputs.moveInYear + t - 1;

    const hBal = calculateLoanBalance(hLoanAmount, inputs.interestRate, inputs.repaymentPeriod, t) * ratioFactor;
    const wBal = calculateLoanBalance(wLoanAmount, inputs.interestRate, inputs.repaymentPeriod, t) * ratioFactor;

    const hPropLim = propertyYen * (hOwnershipRate / 100);
    const wPropLim = propertyYen * (wOwnershipRate / 100);

    const hLim = config.limit * (hBorrowRate / 100);
    const wLim = config.limit * (wBorrowRate / 100);

    const hDeductionLim = Math.min(hBal, hPropLim, hLim) * 0.007;
    const wDeductionLim = Math.min(wBal, wPropLim, wLim) * 0.007;

    const hCapacityNormal = getTaxCapacity({ ...inputs.husband, hasChildcare: false }, calendarYear, inputs.useReconstructionTax);
    const wCapacityNormal = getTaxCapacity({ ...inputs.wife, hasChildcare: false }, calendarYear, inputs.useReconstructionTax);

    const hTaxableTotalNormalYear = hCapacityNormal.taxableIncomeForResidentTax ?? 0;
    const hResidentLimitNormalYear = hTaxableTotalNormalYear > 0
      ? Math.min(Math.round(hTaxableTotalNormalYear * 0.05), 97500)
      : 97500;

    const wTaxableTotalNormalYear = wCapacityNormal.taxableIncomeForResidentTax ?? 0;
    const wResidentLimitNormalYear = wTaxableTotalNormalYear > 0
      ? Math.min(Math.round(wTaxableTotalNormalYear * 0.05), 97500)
      : 97500;

    const hIncomeTaxDeductionNormal = Math.min(hDeductionLim, hCapacityNormal.incomeTax);
    const wIncomeTaxDeductionNormal = Math.min(wDeductionLim, wCapacityNormal.incomeTax);

    const hRemainingNormal = hDeductionLim - hIncomeTaxDeductionNormal;
    const wRemainingNormal = wDeductionLim - wIncomeTaxDeductionNormal;

    const hResidentTaxDeductionNormal = Math.min(hRemainingNormal, hCapacityNormal.residentTax, hResidentLimitNormalYear);
    const wResidentTaxDeductionNormal = Math.min(wRemainingNormal, wCapacityNormal.residentTax, wResidentLimitNormalYear);

    normalActualDeduction += (hIncomeTaxDeductionNormal + hResidentTaxDeductionNormal + wIncomeTaxDeductionNormal + wResidentTaxDeductionNormal);
  }

  const actualTotalDeduction = results.reduce((acc, r) => acc + r.household.actualDeduction, 0);
  const childcareLoss = Math.max(0, normalActualDeduction - actualTotalDeduction);

  const totals = {
    eligibleDeduction: results.reduce((acc, r) => acc + r.household.deductionLimit, 0),
    actualDeduction: actualTotalDeduction,
    unusedDeduction: results.reduce((acc, r) => acc + r.household.unusedDeduction, 0),
    childcareLoss: childcareLoss,
    husbandActualDeduction: results.reduce((acc, r) => acc + r.husband.totalDeduction, 0),
    wifeActualDeduction: results.reduce((acc, r) => acc + r.wife.totalDeduction, 0),
  };

  return { results, totals };
}

export default function App() {
  const [inputs, setInputs] = useState<SimulationInputs>(() => {
    try {
      const saved = localStorage.getItem('mortgage-compass-inputs');
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergePerson = (defaults: PersonInputs, savedPerson: any): PersonInputs => {
          if (!savedPerson) return { ...defaults };
          return {
            ...defaults,
            ...savedPerson,
            taxInputMode: savedPerson.taxInputMode ?? defaults.taxInputMode,
            socialInsuranceRate: savedPerson.socialInsuranceRate ?? defaults.socialInsuranceRate,
            monthlyIdeco: savedPerson.monthlyIdeco ?? defaults.monthlyIdeco,
            lifeInsuranceDeduction: savedPerson.lifeInsuranceDeduction ?? defaults.lifeInsuranceDeduction,
            earthquakeInsuranceDeduction: savedPerson.earthquakeInsuranceDeduction ?? defaults.earthquakeInsuranceDeduction,
            dependentCount: savedPerson.dependentCount ?? defaults.dependentCount,
            hasDependentUnder23: savedPerson.hasDependentUnder23 ?? defaults.hasDependentUnder23,
            useSpouseDeduction: savedPerson.useSpouseDeduction ?? defaults.useSpouseDeduction,
            taxableIncomeForResidentTax: savedPerson.taxableIncomeForResidentTax ?? defaults.taxableIncomeForResidentTax,
            taxableTotalIncome: savedPerson.taxableTotalIncome !== undefined ? savedPerson.taxableTotalIncome : defaults.taxableTotalIncome,
            customResidentTaxes: savedPerson.customResidentTaxes ?? defaults.customResidentTaxes,
          };
        };

        return {
          ...DEFAULT_INPUTS,
          ...parsed,
          husband: mergePerson(DEFAULT_INPUTS.husband, parsed.husband),
          wife: mergePerson(DEFAULT_INPUTS.wife, parsed.wife),
        };
      }
    } catch (e) {
      console.error('Failed to load inputs from localStorage', e);
    }
    return DEFAULT_INPUTS;
  });

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('mortgage-compass-inputs', JSON.stringify(inputs));
    } catch (e) {
      console.error('Failed to save inputs to localStorage', e);
    }
  }, [inputs]);
  const [yearlyGraphFilter, setYearlyGraphFilter] = useState<'total' | 'husband' | 'wife'>('total');
  const [activeSpouseTab, setActiveSpouseTab] = useState<'husband' | 'wife'>('husband');
  const [activeChartTab, setActiveChartTab] = useState<'yearly' | 'comparison' | 'cumulative'>('yearly');
  const [isTableOpen, setIsTableOpen] = useState(false);

  const [syncShares, setSyncShares] = useState<boolean>(() => {
    return inputs.husband.borrowRate === inputs.husband.ownershipRate;
  });

  const handleCustomSharesToggle = (checked: boolean) => {
    setSyncShares(!checked);
    if (!checked) {
      setInputs((prev) => ({
        ...prev,
        husband: {
          ...prev.husband,
          ownershipRate: prev.husband.borrowRate,
        },
        wife: {
          ...prev.wife,
          ownershipRate: prev.wife.borrowRate,
        },
      }));
      triggerToast('持分割合をローン比率に同期しました。');
    } else {
      triggerToast('持分割合を個別に設定できるようになりました。');
    }
  };

  const { results, totals } = useMemo(() => runSimulation(inputs), [inputs]);

  const activeShares = useMemo(() => {
    const hBorrow = inputs.loanType === 'single' ? 100 : inputs.husband.borrowRate;
    const wBorrow = inputs.loanType === 'single' ? 0 : (100 - hBorrow);
    const hOwnership = inputs.loanType === 'single' ? 100 : inputs.husband.ownershipRate;
    const wOwnership = inputs.loanType === 'single' ? 0 : (100 - hOwnership);
    return {
      husbandBorrow: hBorrow,
      wifeBorrow: wBorrow,
      husbandOwnership: hOwnership,
      wifeOwnership: wOwnership,
    };
  }, [inputs]);

  const warningsList = useMemo(() => {
    const list: string[] = [];
    const rRatio = inputs.residentialRatio ?? 100;
    const floorArea = inputs.floorArea ?? 0;
    if (rRatio < 50) {
      list.push('居住用割合が50％未満の場合、住宅ローン控除の対象外となる可能性があります。');
    }

    // 床面積 (floorArea)
    if (floorArea < 40) {
      list.push('登記簿上の床面積が40㎡未満の場合、住宅ローン控除の適用対象外（0円）となる可能性があります。');
    } else if (floorArea < 50) {
      list.push('登記簿上の床面積が50㎡未満（40㎡以上）の場合、合計所得金額が1,000万円を超える年は所得制限により住宅ローン控除の対象外（0円）となる可能性があります。');
    }

    // 返済期間 (repaymentPeriod)
    if (inputs.repaymentPeriod < 10) {
      list.push('返済期間が10年未満の場合、住宅ローン控除の適用対象外（0円）となる可能性があります。');
    }

    // 合計所得金額 (income)
    const hasIncomeOverLimit = inputs.husband.income > 2000 || (inputs.loanType !== 'single' && inputs.wife.income > 2000);
    if (hasIncomeOverLimit) {
      list.push('合計所得金額（見込年収等）が2,000万円を超える年は、所得制限により住宅ローン控除の対象外（0円）となる可能性があります。');
    }

    // 新築その他住宅
    if (inputs.housingType === 'new' && inputs.housingPerformance === 'other') {
      list.push('新築の「その他住宅（省エネ基準に適合しない住宅）」は、原則として住宅ローン控除の対象外となる可能性があります。');
    }

    // 令和10年以降の建築確認
    if (inputs.isPost2028StandardUnderConstruction && inputs.housingPerformance === 'standard') {
      list.push('令和10年（2028年）以降に建築確認を受ける新築の省エネ基準適合住宅は、原則として住宅ローン控除の対象外となる可能性があります。');
    }

    // 災害レッドゾーン
    if (inputs.is災害RedZone) {
      list.push('災害レッドゾーン（災害危険区域等）内の新築住宅は、原則として住宅ローン控除の対象外となるか、控除が受けられないリスクがあります。');
    }

    // 借入割合と持分割合の10%以上の差
    if (Math.abs(activeShares.husbandBorrow - activeShares.husbandOwnership) >= 10) {
      list.push('借入返済負担割合と持分割合に10％以上の差（不一致）があります。贈与とみなされるリスク（贈与税課税リスク）や、住宅ローン控除の借入限度額が制限される可能性があります。');
    }

    // 育休
    if (inputs.husband.hasChildcare || inputs.wife.hasChildcare) {
      list.push('育休期間中は所得税・住民税が下がるため、住宅ローン控除を使い切れない可能性があります。');
    }

    return list;
  }, [inputs, activeShares]);

  // Generate FP Comments
  function generateFPMemoList(): string[] {
    const config = getHousingConfig(inputs.housingType, inputs.housingPerformance, inputs.isChildYoung);
    const utilizationRate = totals.eligibleDeduction > 0 ? (totals.actualDeduction / totals.eligibleDeduction) * 100 : 0;
    const comments: string[] = [];

    const isAnyAuto = (inputs.husband.taxInputMode ?? 'AUTO') === 'AUTO' || (inputs.loanType !== 'single' && (inputs.wife.taxInputMode ?? 'AUTO') === 'AUTO');
    const isAnyManual = (inputs.husband.taxInputMode ?? 'AUTO') === 'MANUAL' || (inputs.loanType !== 'single' && (inputs.wife.taxInputMode ?? 'AUTO') === 'MANUAL');

    if (isAnyAuto) {
      comments.push("所得税・住民税は年収からの概算です。源泉徴収票や住民税決定通知書を確認すると、より実態に近い試算になります。");
    }
    if (isAnyManual) {
      comments.push("所得税・住民税を直接入力しているため、年収からの概算より実態に近い試算になりやすいです。ただし、実際の控除額は年末調整・確定申告で確認が必要です。");
    }

    if (config.isExcluded) {
      comments.push("2026年以降の新築その他住宅は、税制改正等により原則として住宅ローン控除の対象外（0円）となる可能性があります。省エネ基準への適合を証明する書類がないか確認してください。");
    } else {
      if (utilizationRate >= 95) {
        comments.push("この条件では、現在の所得税・住民税の想定額に対して、住宅ローン控除枠をほぼ最大限（95%以上）使い切れる可能性があります。夫婦それぞれの負担バランスの目安にしてください。");
      } else if (utilizationRate >= 80) {
        comments.push(`この条件では、住宅ローン控除をおおむね使い切れる可能性があります（消化見込約${Math.round(utilizationRate)}%）。一部使い切れない可能性がありますが、一定の節税効果が得られる可能性があります。`);
      } else {
        comments.push(`この条件では、実際に使える控除額が約${Math.round(utilizationRate)}%にとどまる可能性があります。夫婦の納税想定額に対して控除上限が上回っており、一部を使い切れない可能性があります。`);
      }

      const hasChildcareActive = inputs.husband.hasChildcare || inputs.wife.hasChildcare;
      if (hasChildcareActive && totals.childcareLoss > 0) {
        comments.push(`育休期間中は課税所得が下がるため、控除の一部を使い切れない「育休控除ロス」が累計約${Math.round(totals.childcareLoss / 10000)}万円発生する可能性があります。`);
      }

      if (inputs.loanType === 'pair' || inputs.loanType === 'joint') {
        comments.push("ペアローンにより控除枠は広がりますが、将来的にどちらかの税額が不足する年（育休、退職、時短等）は、控除を使い切れない可能性があります。");
      }
    }

    if (inputs.is災害RedZone) {
      comments.push("災害レッドゾーン内の新築住宅は、原則として住宅ローン控除の対象外となるリスク（控除額0円）があるため、購入契約前に都市計画法の指定等について再度確認してください。");
    }

    if (inputs.isPost2028StandardUnderConstruction && inputs.housingPerformance === 'standard') {
      comments.push("令和10年（2028年）以降に建築確認を受ける新築の省エネ基準適合住宅は、原則として住宅ローン控除が対象外（0円）となる予定です。設計・建築確認スケジュールをハウスメーカー等に再点検・確認してください。");
    }

    if (Math.abs(activeShares.husbandBorrow - activeShares.husbandOwnership) >= 10) {
      comments.push("借入返済負担割合と持分割合に10%以上の不一致があるため、贈与税課税リスクのほか、夫婦それぞれの借入限度額に対して住宅ローン控除対象額が不当に制限される実務上のデメリットが発生する可能性があります。");
    }

    if (inputs.husband.income > 2000 || (inputs.loanType !== 'single' && inputs.wife.income > 2000)) {
      comments.push("見込年収に基づく合計所得金額が2,000万円を超える年がある場合、その年は所得制限により住宅ローン控除の対象外（0円）となるため、所得要件を考慮したマネープランが必要です。");
    }

    comments.push("控除額のみで借入割合や持分割合を決めるのではなく、将来の返済負担、団体信用生命保険（団信）のカバー範囲、万一の離婚・相続時の持分トラブルの回避も含めて比較検討の余地があります。");
    comments.push("住宅性能によって借入限度額が異なります。購入契約前に、適合証明書や長期優良住宅などの認定書類の交付予定を事前にハウスメーカー等に確認されることを推奨します（参考目安）。");

    return comments;
  }

  const handleCopyConditions = () => {
    const memoList = generateFPMemoList().map(comment => `- ${comment}`).join('\n');
    const navList = generateCompassNavList().map(nav => `- ${nav}`).join('\n');
    const disclaimer = [
      `本アプリによる試算結果は、入力された条件に基づく概算の目安であり、実際の控除額や税額を保証するものではありません。`,
      `住宅ローン控除の実際の適用にあたっては、所得要件、床面積要件、耐震・省エネ基準の適合、各種証明書類の提出、およびその他の詳細な税制上の規定を満たす必要があります。また、今後の税制改正等により異なり得るため、具体的なお手続きや個別の税務判断については、管轄の税務署または税理士等の専門家にご相談ください。`
    ].join('\n');

    const text = [
      `【試算条件】`,
      `住宅タイプ: ${inputs.housingType === 'new' ? '新築' : '中古'}`,
      `住宅性能: ${inputs.housingPerformance === 'premium' ? '認定住宅' : inputs.housingPerformance === 'zeh' ? 'ZEH水準省エネ住宅' : inputs.housingPerformance === 'standard' ? '省エネ基準適合住宅' : 'その他の住宅'}`,
      `物件価格: ${inputs.propertyPrice}万円`,
      `借入金額: ${inputs.loanAmount}万円`,
      `金利: ${inputs.interestRate}%`,
      `返済期間: ${inputs.repaymentPeriod}年`,
      `ローンタイプ: ${inputs.loanType === 'single' ? '夫単独' : inputs.loanType === 'pair' ? 'ペアローン' : '連帯債務（主債務者: 夫）'}`,
      `夫の税額入力方式: ${inputs.husband.taxInputMode === 'MANUAL' ? '所得税・住民税を直接入力' : '年収から概算'}`,
      `妻の税額入力方式: ${inputs.wife.taxInputMode === 'MANUAL' ? '所得税・住民税を直接入力' : '年収から概算'}`,
      `復興特別所得税の計算: ${inputs.useReconstructionTax ? '含める（+2.1%）' : '含めない'}`,
      ``,
      `【FPアドバイス（FPメモ）】`,
      memoList,
      ``,
      `【COMPASSナビ（ネクストアクション）】`,
      navList,
      ``,
      `【免責事項・注意事項】`,
      disclaimer,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setToastMessage('試算条件（FPアドバイス・免責等含む）をコピーしました。');
  };

  const handleCopySummary = () => {
    const memoList = generateFPMemoList().map(comment => `- ${comment}`).join('\n');
    const navList = generateCompassNavList().map(nav => `- ${nav}`).join('\n');
    const disclaimer = [
      `本アプリによる試算結果は、入力された条件に基づく概算の目安であり、実際の控除額や税額を保証するものではありません。`,
      `住宅ローン控除の実際の適用にあたっては、所得要件、床面積要件、耐震・省エネ基準の適合、各種証明書類の提出、およびその他の詳細な税制上の規定を満たす必要があります。また、今後の税制改正等により異なり得るため、具体的なお手続きや個別の税務判断については、管轄の税務署または税理士等の専門家にご相談ください。`
    ].join('\n');

    const text = [
      `【試算結果サマリー】`,
      `世帯合計 控除可能額: ${((totals.eligibleDeduction || 0) / 10000).toFixed(1)}万円`,
      `実際に使える控除額: ${((totals.actualDeduction || 0) / 10000).toFixed(1)}万円`,
      `使い切れない控除額: ${((totals.unusedDeduction || 0) / 10000).toFixed(1)}万円`,
      `育休控除ロス: ${((totals.childcareLoss || 0) / 10000).toFixed(1)}万円`,
      ``,
      `【FPアドバイス（FPメモ）】`,
      memoList,
      ``,
      `【COMPASSナビ（ネクストアクション）】`,
      navList,
      ``,
      `【免責事項・注意事項】`,
      disclaimer,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setToastMessage('結果サマリー（FPアドバイス・免責等含む）をコピーしました。');
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS);
    setSyncShares(true);
    setToastMessage('入力を初期状態にリセットしました。');
  };

  const triggerToast = (message: string) => {
    setToastMessage(message);
  };

  const formatYenValue = (value: number) => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return '0円';
    return `${Math.round(value).toLocaleString()}円`;
  };

  const formatManYenValue = (value: number) => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) return '0.0万円';
    return `${(value / 10000).toFixed(1)}万円`;
  };

  // Generate COMPASS steps
  function generateCompassNavList(): string[] {
    const navs: string[] = [];

    const isAnyAuto = (inputs.husband.taxInputMode ?? 'AUTO') === 'AUTO' || (inputs.loanType !== 'single' && (inputs.wife.taxInputMode ?? 'AUTO') === 'AUTO');
    const isAnyManual = (inputs.husband.taxInputMode ?? 'AUTO') === 'MANUAL' || (inputs.loanType !== 'single' && (inputs.wife.taxInputMode ?? 'AUTO') === 'MANUAL');

    if (isAnyAuto) {
      navs.push("源泉徴収票で所得税額を確認する");
      navs.push("住民税決定通知書で住民税所得割額を確認する");
      navs.push("社会保険料控除、iDeCo、生命保険料控除、扶養控除を確認する");
    }

    if (isAnyManual) {
      navs.push("入力した所得税額・住民税所得割額が最新年度のものか確認する");
      navs.push("育休・時短勤務がある場合は、年別の税額見込にズレがないか確認する");
    }
    
    if (!isAnyAuto) {
      navs.push("源泉徴収票で、実際の所得税額（課税額）を確認してください。");
      navs.push("住民税決定通知書で、住民税所得割額を確認してください。");
    }
    navs.push("住宅ローン年末残高証明書で、実際の年末残高を確認してください。");

    if (inputs.housingPerformance !== 'other') {
      navs.push("住宅性能証明書、長期優良住宅認定通知書、ZEH水準証明書類等が確実に交付される予定か確認してください。");
    }

    navs.push("登記事項証明書等で、床面積、居住用割合、登記上の持分を確認してください。");
    navs.push("建築確認日、登記日、入居日の具体的なスケジュールを確認してください。");

    if (inputs.husband.hasChildcare || inputs.wife.hasChildcare) {
      navs.push("育休・産休の開始・終了スケジュール、時短勤務による復職後の年収見込を確認してください。");
    }

    if (inputs.loanType === 'pair' || inputs.loanType === 'joint') {
      navs.push("ペアローン（または連帯債務）の場合、夫婦どちらか一方の死亡時、離婚時、相続時におけるローンの取り扱いや、団体信用生命保険（団信）のカバー内容を確認してください。");
    }

    if (Math.abs(activeShares.husbandBorrow - activeShares.husbandOwnership) >= 1) {
      navs.push("借入返済負担割合と登記上の持分割合に差（不一致）がある場合、贈与と認定されるリスク（贈与認定リスク）について税理士や税務署に確認してください。");
    }

    navs.push("住宅ローン控除枠の追求のみならず、将来の教育費・老後資金を含めたライフプラン全体の返済余力を確認してください。");

    return navs;
  }

  // Recharts Data Formatter
  const yearlyChartData = useMemo(() => {
    return results.map((r) => {
      let incomeTaxVal = 0;
      let residentTaxVal = 0;
      let unusedVal = 0;

      if (yearlyGraphFilter === 'total') {
        incomeTaxVal = r.household.incomeTaxDeduction;
        residentTaxVal = r.household.residentTaxDeduction;
        unusedVal = r.household.unusedDeduction;
      } else if (yearlyGraphFilter === 'husband') {
        incomeTaxVal = r.husband.incomeTaxDeduction;
        residentTaxVal = r.husband.residentTaxDeduction;
        unusedVal = r.husband.unusedDeduction;
      } else {
        incomeTaxVal = r.wife.incomeTaxDeduction;
        residentTaxVal = r.wife.residentTaxDeduction;
        unusedVal = r.wife.unusedDeduction;
      }

      return {
        name: `${r.calendarYear}年\n(${r.yearIndex}年目)`,
        '所得税控除額 (円)': incomeTaxVal,
        '住民税控除額 (円)': residentTaxVal,
        '使い切れない控除額 (円)': unusedVal,
      };
    });
  }, [results, yearlyGraphFilter]);

  const comparisonChartData = useMemo(() => {
    // Total eligible base vs actually usable vs unused
    let hEligible = 0;
    let hActual = 0;
    let hUnused = 0;

    let wEligible = 0;
    let wActual = 0;
    let wUnused = 0;

    results.forEach((r) => {
      hEligible += r.husband.deductionLimit;
      hActual += r.husband.totalDeduction;
      hUnused += r.husband.unusedDeduction;

      wEligible += r.wife.deductionLimit;
      wActual += r.wife.totalDeduction;
      wUnused += r.wife.unusedDeduction;
    });

    return [
      {
        name: '夫 (HUSBAND)',
        '制度上の控除可能額 (円)': hEligible,
        '実際に使える控除額 (円)': hActual,
        '使い切れない控除額 (円)': hUnused,
      },
      {
        name: '妻 (WIFE)',
        '制度上の控除可能額 (円)': wEligible,
        '実際に使える控除額 (円)': wActual,
        '使い切れない控除額 (円)': wUnused,
      },
    ];
  }, [results]);

  const cumulativeChartData = useMemo(() => {
    let accEligible = 0;
    let accActual = 0;
    let accUnused = 0;

    return results.map((r) => {
      accEligible += r.household.deductionLimit;
      accActual += r.household.actualDeduction;
      accUnused += r.household.unusedDeduction;

      return {
        name: `${r.calendarYear}年\n(${r.yearIndex}年目)`,
        '累計控除可能額 (円)': accEligible,
        '累計実際の控除額 (円)': accActual,
        '累計使い切れない額 (円)': accUnused,
      };
    });
  }, [results]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-lg text-sm">
          <p className="font-semibold text-slate-800 mb-2 whitespace-pre-line">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-6 items-center mb-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-mono font-medium text-slate-900">
                {entry.value.toLocaleString('ja-JP')}円
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ==========================================
          HEADER SECTION
          ========================================== */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-bold text-xl select-none shrink-0">C</div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 id="app-title" className="text-lg font-bold text-blue-900 leading-none">住宅ローン控除COMPASS</h1>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">概算シミュレーション</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">ペアローン・育休・住宅性能による控除の使い切れなさを見える化</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReset}
            id="btn-reset"
            className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-medium"
          >
            初期値に戻す
          </button>
          <button
            onClick={handleCopyConditions}
            id="btn-copy-cond"
            className="px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-medium"
          >
            試算条件コピー
          </button>
          <button
            onClick={handleCopySummary}
            id="btn-copy-sum"
            className="px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-800 transition-colors cursor-pointer"
          >
            結果サマリーコピー
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 md:right-8 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-800"
          >
            <CheckCircle size={16} className="text-green-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4">
        {/* ==========================================
            WARNINGS BLOCK (Conditional Alerts)
            ========================================== */}
        {warningsList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={18} className="shrink-0" />
              <span className="font-semibold text-sm">シミュレーション上の重要注意項目 ({warningsList.length}件)</span>
            </div>
            <ul className="list-disc pl-5 text-amber-900 text-xs space-y-1">
              {warningsList.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* ==========================================
            KPI OVERVIEW CARDS
            ========================================== */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-white border border-slate-200 rounded-xl shrink-0">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">世帯合計 控除可能額</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatManYenValue(totals.eligibleDeduction)}
              </p>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">制度上の控除枠合計</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">実際に使える控除額</p>
              <p className="text-xl font-bold text-blue-700 mt-1">
                {formatManYenValue(totals.actualDeduction)}
              </p>
            </div>
            <p className="text-[9px] text-blue-500 mt-1">所得税・住民税からの補填額</p>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-orange-600 font-bold uppercase tracking-tight">使い切れない控除額</p>
              <p className="text-xl font-bold text-orange-600 mt-1">
                {formatManYenValue(totals.unusedDeduction)}
              </p>
            </div>
            <p className="text-[9px] text-orange-400 mt-1">税額不足で使い切れない金額</p>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">育休期間中の控除ロス</p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {formatManYenValue(totals.childcareLoss)}
              </p>
            </div>
            <p className="text-[9px] text-red-500 mt-1">無給育休による控除減少幅</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">夫の利用見込</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatManYenValue(totals.husbandActualDeduction)}
              </p>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">夫側の控除還元額累計</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">妻の利用見込</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatManYenValue(totals.wifeActualDeduction)}
              </p>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">妻側の控除還元額累計</p>
          </div>
        </section>

        {/* ==========================================
            MAIN CONTENT WORKSPACE
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: CONTROL PANEL */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* 1. PROPERTY & LOAN SETTINGS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Home size={16} className="text-blue-700" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">基本情報・ローン設定</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">入居年</label>
                  <select
                    value={inputs.moveInYear}
                    onChange={(e) => setInputs({ ...inputs, moveInYear: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded text-xs px-2.5 py-1.5 focus:border-blue-600 focus:outline-none focus:ring-0"
                  >
                    {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <option key={yr} value={yr}>{yr}年</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">住宅区分</label>
                  <select
                    value={inputs.housingType}
                    onChange={(e) => setInputs({ ...inputs, housingType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded text-xs px-2.5 py-1.5 focus:border-blue-600 focus:outline-none focus:ring-0"
                  >
                    <option value="new">新築住宅</option>
                    <option value="used">中古・既存住宅</option>
                    <option value="resale">買取再販住宅</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">住宅性能区分</label>
                  <select
                    value={inputs.housingPerformance}
                    onChange={(e) => setInputs({ ...inputs, housingPerformance: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded text-xs px-2.5 py-1.5 focus:border-blue-600 focus:outline-none focus:ring-0"
                  >
                    <option value="premium">認定長期優良住宅・認定低炭素住宅</option>
                    <option value="zeh">ZEH水準省エネ住宅</option>
                    <option value="standard">省エネ基準適合住宅</option>
                    <option value="other">その他一般住宅</option>
                  </select>
                </div>

                <div className="col-span-2 flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded">
                  <div className="pr-2">
                    <label className="block font-bold text-blue-800 text-[11px] leading-tight">子育て・若者夫婦世帯</label>
                    <p className="text-[9px] text-blue-600/90 leading-tight mt-0.5">2026年入居の場合、借入限度額が上乗せされます。</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={inputs.isChildYoung}
                    onChange={(e) => setInputs({ ...inputs, isChildYoung: e.target.checked })}
                    className="w-4 h-4 text-blue-700 bg-slate-50 rounded border-slate-200 focus:ring-0"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">住宅価格</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                    <input
                      type="number"
                      value={inputs.propertyPrice}
                      onChange={(e) => setInputs({ ...inputs, propertyPrice: Number(e.target.value) })}
                      className="bg-transparent text-right font-bold w-full text-xs outline-none"
                    />
                    <span className="text-[10px] text-slate-500 ml-1 shrink-0">万円</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">借入総額</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                    <input
                      type="number"
                      value={inputs.loanAmount}
                      onChange={(e) => setInputs({ ...inputs, loanAmount: Number(e.target.value) })}
                      className="bg-transparent text-right font-bold w-full text-xs outline-none"
                    />
                    <span className="text-[10px] text-slate-500 ml-1 shrink-0">万円</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">金利 (%)</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                    <input
                      type="number"
                      step="0.05"
                      value={inputs.interestRate}
                      onChange={(e) => setInputs({ ...inputs, interestRate: Number(e.target.value) })}
                      className="bg-transparent text-right font-bold w-full text-xs outline-none"
                    />
                    <span className="text-[10px] text-slate-500 ml-1 shrink-0">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">返済期間 (年)</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                    <input
                      type="number"
                      value={inputs.repaymentPeriod}
                      onChange={(e) => setInputs({ ...inputs, repaymentPeriod: Number(e.target.value) })}
                      className="bg-transparent text-right font-bold w-full text-xs outline-none"
                    />
                    <span className="text-[10px] text-slate-500 ml-1 shrink-0">年</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ローン形態</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'single', label: '単独' },
                      { key: 'pair', label: 'ペア' },
                      { key: 'joint', label: '連帯' }
                    ].map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setInputs({ ...inputs, loanType: mode.key as any })}
                        className={`py-1.5 rounded border text-center text-xs font-bold transition-colors cursor-pointer ${
                          inputs.loanType === mode.key
                            ? 'bg-navy border-navy text-white shadow-sm ring-2 ring-[#BBD7FF]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 border-t border-slate-100 pt-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">登記簿上の床面積</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                        <input
                          type="number"
                          value={inputs.floorArea ?? 70}
                          onChange={(e) => setInputs({ ...inputs, floorArea: Number(e.target.value) })}
                          className="bg-transparent text-right font-bold w-full text-xs outline-none"
                        />
                        <span className="text-[10px] text-slate-500 ml-1 shrink-0">㎡</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">居住用割合</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={inputs.residentialRatio ?? 100}
                          onChange={(e) => setInputs({ ...inputs, residentialRatio: Number(e.target.value) })}
                          className="bg-transparent text-right font-bold w-full text-xs outline-none"
                        />
                        <span className="text-[10px] text-slate-500 ml-1 shrink-0">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-500">令和10年以降の建築確認（省エネ）</span>
                      <input
                        type="checkbox"
                        checked={inputs.isPost2028StandardUnderConstruction ?? false}
                        onChange={(e) => setInputs({ ...inputs, isPost2028StandardUnderConstruction: e.target.checked })}
                        className="w-4 h-4 text-blue-700 bg-slate-50 rounded border-slate-200 focus:ring-0"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate-500">災害レッドゾーン区域内に入居</span>
                      <input
                        type="checkbox"
                        checked={inputs.is災害RedZone ?? false}
                        onChange={(e) => setInputs({ ...inputs, is災害RedZone: e.target.checked })}
                        className="w-4 h-4 text-blue-700 bg-slate-50 rounded border-slate-200 focus:ring-0"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] font-medium text-slate-500">復興特別所得税 (+2.1%) を加算する</span>
                      <input
                        type="checkbox"
                        checked={inputs.useReconstructionTax ?? false}
                        onChange={(e) => setInputs({ ...inputs, useReconstructionTax: e.target.checked })}
                        className="w-4 h-4 text-blue-700 bg-slate-50 rounded border-slate-200 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SPOUSES INDIVIDUAL INFO (TABBED PANEL) */}
            <div className="bg-white rounded-xl border border-slate-200 flex flex-col shrink-0 overflow-hidden">
              <div className="flex border-b border-slate-200">
                <div className="px-3 py-3 text-[10px] font-bold text-slate-400 bg-slate-50/40 select-none border-r border-slate-100 flex items-center justify-center shrink-0 uppercase tracking-tight">
                  基本情報
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSpouseTab('husband')}
                  className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer text-center ${
                    activeSpouseTab === 'husband'
                      ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  夫 ({activeShares.husbandBorrow}%)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSpouseTab('wife')}
                  className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer text-center ${
                    activeSpouseTab === 'wife'
                      ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  妻 ({activeShares.wifeBorrow}%)
                </button>
              </div>

              {inputs.loanType === 'single' && activeSpouseTab === 'wife' ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                  <Info size={18} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    ※ローン形態が「単独ローン」に設定されているため、妻側の控除申請・借入負担は発生しません。
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Husband Form / Wife Form Dynamic Toggle */}
                  {activeSpouseTab === 'husband' ? (
                    <div className="space-y-4">
                      {/* Segmented Control for Tax Input Mode */}
                      <div className="flex bg-slate-100 p-1 rounded-lg gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => setInputs({
                            ...inputs,
                            husband: { ...inputs.husband, taxInputMode: 'AUTO' }
                          })}
                          className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                            (inputs.husband.taxInputMode ?? 'AUTO') === 'AUTO'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          年収から概算 (推奨)
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputs({
                            ...inputs,
                            husband: { ...inputs.husband, taxInputMode: 'MANUAL' }
                          })}
                          className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                            (inputs.husband.taxInputMode ?? 'AUTO') === 'MANUAL'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          所得税・住民税を直接入力
                        </button>
                      </div>

                      {(inputs.husband.taxInputMode ?? 'AUTO') === 'AUTO' ? (
                        <div className="space-y-3.5">
                          <div>
                            <label className="block text-slate-500 font-medium mb-1">年収 (万円)</label>
                            <input
                              type="number"
                              value={inputs.husband.income}
                              onChange={(e) => setInputs({
                                ...inputs,
                                husband: { ...inputs.husband, income: Number(e.target.value) }
                              })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-bold"
                            />
                          </div>

                          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 space-y-3">
                            <span className="font-bold text-slate-700 text-[11px] block">各種控除・概算条件設定</span>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">社会保険料率</span>
                                <span className="font-semibold text-slate-800">{(inputs.husband.socialInsuranceRate ?? 15)}%</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="20"
                                step="0.5"
                                value={inputs.husband.socialInsuranceRate ?? 15}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, socialInsuranceRate: Number(e.target.value) }
                                })}
                                className="w-full accent-blue-600 cursor-pointer"
                              />
                              <p className="text-[9px] text-slate-400">一般的には14〜15%程度（厚生年金・健康保険・雇用保険）</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <label className="block text-slate-500 font-medium mb-1">iDeCo掛金 (円/月)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={inputs.husband.monthlyIdeco ?? ''}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    husband: { ...inputs.husband, monthlyIdeco: e.target.value === '' ? 0 : Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-medium mb-1">生命保険料控除 (円/年)</label>
                                <input
                                  type="number"
                                  placeholder="最大 120,000円"
                                  max={120000}
                                  value={inputs.husband.lifeInsuranceDeduction ?? ''}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    husband: { ...inputs.husband, lifeInsuranceDeduction: e.target.value === '' ? 0 : Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-medium mb-1">地震保険料控除 (円/年)</label>
                                <input
                                  type="number"
                                  placeholder="最大 50,000円"
                                  max={50000}
                                  value={inputs.husband.earthquakeInsuranceDeduction ?? ''}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    husband: { ...inputs.husband, earthquakeInsuranceDeduction: e.target.value === '' ? 0 : Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-medium mb-1">一般扶養親族の人数 (人)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={inputs.husband.dependentCount ?? 0}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    husband: { ...inputs.husband, dependentCount: Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 font-medium">特定扶養親族（23歳未満の子供など）</span>
                                <input
                                  type="checkbox"
                                  checked={inputs.husband.hasDependentUnder23 ?? false}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    husband: { ...inputs.husband, hasDependentUnder23: e.target.checked }
                                  })}
                                  className="w-4 h-4 text-blue-600 bg-slate-50 rounded border-slate-200 focus:ring-0 cursor-pointer"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 font-medium">配偶者控除・配偶者特別控除の適用</span>
                                <input
                                  type="checkbox"
                                  checked={inputs.husband.useSpouseDeduction ?? false}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    husband: { ...inputs.husband, useSpouseDeduction: e.target.checked }
                                  })}
                                  className="w-4 h-4 text-blue-600 bg-slate-50 rounded border-slate-200 focus:ring-0 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Output estimated taxes info */}
                          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                            <div className="text-[10px] text-slate-500 font-bold">初年度の概算税額</div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400">概算所得税:</span>{' '}
                                <span className="font-mono font-bold text-slate-700">
                                  {formatYenValue(calculateApproxTax(inputs.husband, inputs.moveInYear, 1.0, inputs.useReconstructionTax).estimatedIncomeTax)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">概算住民税所得割:</span>{' '}
                                <span className="font-mono font-bold text-slate-700">
                                  {formatYenValue(calculateApproxTax(inputs.husband, inputs.moveInYear, 1.0, inputs.useReconstructionTax).estimatedResidentTax)}
                                </span>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-tight">
                              ※上記は社会保険料率{(inputs.husband.socialInsuranceRate ?? 15)}%や、入力された控除項目を反映した概算の計算結果です。
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-slate-500 font-medium">年収 (万円)</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const tax = estimateTaxes(inputs.husband.income);
                                    setInputs({
                                      ...inputs,
                                      husband: { ...inputs.husband, incomeTax: tax.incomeTax, residentTax: tax.residentTax }
                                    });
                                    triggerToast('年収から夫の税金を概算入力しました。');
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline"
                                >
                                  税額を概算入力
                                </button>
                              </div>
                              <input
                                type="number"
                                value={inputs.husband.income}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, income: Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-500 font-medium mb-1">所得税見込額 (円)</label>
                              <input
                                type="number"
                                value={inputs.husband.incomeTax}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, incomeTax: Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-mono"
                              />
                            </div>

                            <div className="col-span-2 text-xs">
                              <label className="block text-slate-500 font-medium mb-1">住民税所得割見込額 (円)</label>
                              <input
                                type="number"
                                value={inputs.husband.residentTax}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, residentTax: Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-mono"
                              />
                            </div>

                            <div className="col-span-2 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-slate-500 font-medium">課税総所得金額等 (万円 - 任意)</label>
                                <span className="text-[10px] text-slate-400">住民税控除上限計算用</span>
                              </div>
                              <input
                                type="number"
                                placeholder="未入力時は97,500円として仮置き"
                                value={inputs.husband.taxableTotalIncome ?? ''}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, taxableTotalIncome: e.target.value === '' ? undefined : Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-mono"
                              />
                              <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                                {inputs.husband.taxableTotalIncome 
                                  ? `住民税からの控除上限見込: 累計最大 ${Math.min(Math.round(inputs.husband.taxableTotalIncome * 10000 * 0.05), 97500).toLocaleString()} 円 / 年（課税総所得金額等の5%・上限97,500円）`
                                  : '※未入力の場合は便宜上97,500円を上限として仮置きし、判定警告にて注意書きを促します（実際の控除上限は課税総所得金額等の5％、最大97,500円）。'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Advanced custom resident tax year-by-year overrides */}
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <details className="group">
                              <summary className="flex items-center justify-between font-bold text-slate-700 cursor-pointer list-none text-[11px] select-none">
                                <span>年別の住民税所得割を直接入力 (任意・優先適用)</span>
                                <span className="text-blue-600 group-open:rotate-180 transition-transform text-[9px]">▼</span>
                              </summary>
                              <div className="mt-2.5 space-y-2 text-[10px]">
                                <p className="text-slate-400 leading-tight">育休等による住民税所得割見込額の変化を年別に直接入力できます。入力値は自動計算に優先して適用されます。</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3, 4, 5].map((idx) => {
                                    const targetYear = inputs.moveInYear + idx - 1;
                                    const currentVal = inputs.husband.customResidentTaxes?.[targetYear];
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <label className="text-slate-500 font-mono font-medium block">{targetYear}年 (円)</label>
                                        <input
                                          type="number"
                                          placeholder="未指定"
                                          value={currentVal ?? ''}
                                          onChange={(e) => {
                                            const updatedTaxes = { ...(inputs.husband.customResidentTaxes || {}) };
                                            if (e.target.value === '') {
                                              delete updatedTaxes[targetYear];
                                            } else {
                                              updatedTaxes[targetYear] = Number(e.target.value);
                                            }
                                            setInputs({
                                              ...inputs,
                                              husband: { ...inputs.husband, customResidentTaxes: updatedTaxes }
                                            });
                                          }}
                                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-blue-600 text-right font-mono"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </details>
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Baby size={15} className="text-blue-600" />
                            <span className="font-semibold text-slate-700">育休・産休シミュレーション</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={inputs.husband.hasChildcare}
                            onChange={(e) => setInputs({
                              ...inputs,
                              husband: { ...inputs.husband, hasChildcare: e.target.checked }
                            })}
                            className="w-4.5 h-4.5 text-blue-600 bg-slate-100 rounded focus:ring-blue-500 border-slate-300"
                          />
                        </div>

                        {inputs.husband.hasChildcare && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/55">
                            <div>
                              <label className="block text-slate-500 font-medium mb-1">育休開始年</label>
                              <select
                                value={inputs.husband.childcareStartYear}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, childcareStartYear: Number(e.target.value) }
                                })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-blue-600"
                              >
                                {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                                  <option key={yr} value={yr}>{yr}年</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-500 font-medium mb-1">育休終了年</label>
                              <select
                                value={inputs.husband.childcareEndYear}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, childcareEndYear: Number(e.target.value) }
                                })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-blue-600"
                              >
                                {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                                  <option key={yr} value={yr}>{yr}年</option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">育休期間中の課税給与割合</span>
                                <span className="font-semibold text-slate-800">{inputs.husband.childcareSalaryRate}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={inputs.husband.childcareSalaryRate}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, childcareSalaryRate: Number(e.target.value) }
                                })}
                                className="w-full accent-blue-600"
                              />
                              <p className="text-[9px] text-slate-400">※育児休業給付金は非課税所得となるため0%を推奨します</p>
                            </div>

                            <div className="col-span-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">復職後の年収・税額割合</span>
                                <span className="font-semibold text-slate-800">{inputs.husband.returnedSalaryRate}%</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="100"
                                step="5"
                                value={inputs.husband.returnedSalaryRate}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  husband: { ...inputs.husband, returnedSalaryRate: Number(e.target.value) }
                                })}
                                className="w-full accent-blue-600"
                              />
                              <p className="text-[9px] text-slate-400">※復帰後の時短勤務等での収入増減を指定します</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Segmented Control for Tax Input Mode */}
                      <div className="flex bg-slate-100 p-1 rounded-lg gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => setInputs({
                            ...inputs,
                            wife: { ...inputs.wife, taxInputMode: 'AUTO' }
                          })}
                          className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                            (inputs.wife.taxInputMode ?? 'AUTO') === 'AUTO'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          年収から概算 (推奨)
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputs({
                            ...inputs,
                            wife: { ...inputs.wife, taxInputMode: 'MANUAL' }
                          })}
                          className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                            (inputs.wife.taxInputMode ?? 'AUTO') === 'MANUAL'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          所得税・住民税を直接入力
                        </button>
                      </div>

                      {(inputs.wife.taxInputMode ?? 'AUTO') === 'AUTO' ? (
                        <div className="space-y-3.5">
                          <div>
                            <label className="block text-slate-500 font-medium mb-1">年収 (万円)</label>
                            <input
                              type="number"
                              value={inputs.wife.income}
                              onChange={(e) => setInputs({
                                ...inputs,
                                wife: { ...inputs.wife, income: Number(e.target.value) }
                              })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-bold"
                            />
                          </div>

                          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 space-y-3">
                            <span className="font-bold text-slate-700 text-[11px] block">各種控除・概算条件設定</span>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-500 font-medium">社会保険料率</span>
                                <span className="font-semibold text-slate-800">{(inputs.wife.socialInsuranceRate ?? 15)}%</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="20"
                                step="0.5"
                                value={inputs.wife.socialInsuranceRate ?? 15}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, socialInsuranceRate: Number(e.target.value) }
                                })}
                                className="w-full accent-blue-600 cursor-pointer"
                              />
                              <p className="text-[9px] text-slate-400">一般的には14〜15%程度（厚生年金・健康保険・雇用保険）</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <label className="block text-slate-500 font-medium mb-1">iDeCo掛金 (円/月)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={inputs.wife.monthlyIdeco ?? ''}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    wife: { ...inputs.wife, monthlyIdeco: e.target.value === '' ? 0 : Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-medium mb-1">生命保険料控除 (円/年)</label>
                                <input
                                  type="number"
                                  placeholder="最大 120,000円"
                                  max={120000}
                                  value={inputs.wife.lifeInsuranceDeduction ?? ''}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    wife: { ...inputs.wife, lifeInsuranceDeduction: e.target.value === '' ? 0 : Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-medium mb-1">地震保険料控除 (円/年)</label>
                                <input
                                  type="number"
                                  placeholder="最大 50,000円"
                                  max={50000}
                                  value={inputs.wife.earthquakeInsuranceDeduction ?? ''}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    wife: { ...inputs.wife, earthquakeInsuranceDeduction: e.target.value === '' ? 0 : Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 font-medium mb-1">一般扶養親族の人数 (人)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  value={inputs.wife.dependentCount ?? 0}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    wife: { ...inputs.wife, dependentCount: Number(e.target.value) }
                                  })}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 focus:outline-blue-600 font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 font-medium">特定扶養親族（23歳未満の子供など）</span>
                                <input
                                  type="checkbox"
                                  checked={inputs.wife.hasDependentUnder23 ?? false}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    wife: { ...inputs.wife, hasDependentUnder23: e.target.checked }
                                  })}
                                  className="w-4 h-4 text-blue-600 bg-slate-50 rounded border-slate-200 focus:ring-0 cursor-pointer"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-600 font-medium">配偶者控除・配偶者特別控除の適用</span>
                                <input
                                  type="checkbox"
                                  checked={inputs.wife.useSpouseDeduction ?? false}
                                  onChange={(e) => setInputs({
                                    ...inputs,
                                    wife: { ...inputs.wife, useSpouseDeduction: e.target.checked }
                                  })}
                                  className="w-4 h-4 text-blue-600 bg-slate-50 rounded border-slate-200 focus:ring-0 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Output estimated taxes info */}
                          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                            <div className="text-[10px] text-slate-500 font-bold">初年度の概算税額</div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400">概算所得税:</span>{' '}
                                <span className="font-mono font-bold text-slate-700">
                                  {formatYenValue(calculateApproxTax(inputs.wife, inputs.moveInYear, 1.0, inputs.useReconstructionTax).estimatedIncomeTax)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">概算住民税所得割:</span>{' '}
                                <span className="font-mono font-bold text-slate-700">
                                  {formatYenValue(calculateApproxTax(inputs.wife, inputs.moveInYear, 1.0, inputs.useReconstructionTax).estimatedResidentTax)}
                                </span>
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-tight">
                              ※上記は社会保険料率{(inputs.wife.socialInsuranceRate ?? 15)}%や、入力された控除項目を反映した概算の計算結果です。
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-slate-500 font-medium">年収 (万円)</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const tax = estimateTaxes(inputs.wife.income);
                                    setInputs({
                                      ...inputs,
                                      wife: { ...inputs.wife, incomeTax: tax.incomeTax, residentTax: tax.residentTax }
                                    });
                                    triggerToast('年収から妻の税金を概算入力しました。');
                                  }}
                                  className="text-[10px] text-blue-600 hover:underline"
                                >
                                  税額を概算入力
                                </button>
                              </div>
                              <input
                                type="number"
                                value={inputs.wife.income}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, income: Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-500 font-medium mb-1">所得税見込額 (円)</label>
                              <input
                                type="number"
                                value={inputs.wife.incomeTax}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, incomeTax: Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-mono"
                              />
                            </div>

                            <div className="col-span-2 text-xs">
                              <label className="block text-slate-500 font-medium mb-1">住民税所得割見込額 (円)</label>
                              <input
                                type="number"
                                value={inputs.wife.residentTax}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, residentTax: Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-mono"
                              />
                            </div>

                            <div className="col-span-2 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-slate-500 font-medium">課税総所得金額等 (万円 - 任意)</label>
                                <span className="text-[10px] text-slate-400">住民税控除上限計算用</span>
                              </div>
                              <input
                                type="number"
                                placeholder="未入力時は97,500円として仮置き"
                                value={inputs.wife.taxableTotalIncome ?? ''}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, taxableTotalIncome: e.target.value === '' ? undefined : Number(e.target.value) }
                                })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-blue-600 font-mono"
                              />
                              <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                                {inputs.wife.taxableTotalIncome 
                                  ? `住民税からの控除上限見込: 累計最大 ${Math.min(Math.round(inputs.wife.taxableTotalIncome * 10000 * 0.05), 97500).toLocaleString()} 円 / 年（課税総所得金額等の5%・上限97,500円）`
                                  : '※未入力の場合は便宜上97,500円を上限として仮置きし、判定警告にて注意書きを促します（実際の控除上限は課税総所得金額等の5％、最大97,500円）。'
                                }
                              </p>
                            </div>
                          </div>

                          {/* Advanced custom resident tax year-by-year overrides */}
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <details className="group">
                              <summary className="flex items-center justify-between font-bold text-slate-700 cursor-pointer list-none text-[11px] select-none">
                                <span>年別の住民税所得割を直接入力 (任意・優先適用)</span>
                                <span className="text-blue-600 group-open:rotate-180 transition-transform text-[9px]">▼</span>
                              </summary>
                              <div className="mt-2.5 space-y-2 text-[10px]">
                                <p className="text-slate-400 leading-tight">育休等による住民税所得割見込額の変化を年別に直接入力できます。入力値は自動計算に優先して適用されます。</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {[1, 2, 3, 4, 5].map((idx) => {
                                    const targetYear = inputs.moveInYear + idx - 1;
                                    const currentVal = inputs.wife.customResidentTaxes?.[targetYear];
                                    return (
                                      <div key={idx} className="space-y-1">
                                        <label className="text-slate-500 font-mono font-medium block">{targetYear}年 (円)</label>
                                        <input
                                          type="number"
                                          placeholder="未指定"
                                          value={currentVal ?? ''}
                                          onChange={(e) => {
                                            const updatedTaxes = { ...(inputs.wife.customResidentTaxes || {}) };
                                            if (e.target.value === '') {
                                              delete updatedTaxes[targetYear];
                                            } else {
                                              updatedTaxes[targetYear] = Number(e.target.value);
                                            }
                                            setInputs({
                                              ...inputs,
                                              wife: { ...inputs.wife, customResidentTaxes: updatedTaxes }
                                            });
                                          }}
                                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-blue-600 text-right font-mono"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </details>
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Baby size={15} className="text-blue-600" />
                            <span className="font-semibold text-slate-700">育休・産休シミュレーション</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={inputs.wife.hasChildcare}
                            onChange={(e) => setInputs({
                              ...inputs,
                              wife: { ...inputs.wife, hasChildcare: e.target.checked }
                            })}
                            className="w-4.5 h-4.5 text-blue-600 bg-slate-100 rounded focus:ring-blue-500 border-slate-300"
                          />
                        </div>

                        {inputs.wife.hasChildcare && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/55">
                            <div>
                              <label className="block text-slate-500 font-medium mb-1">育休開始年</label>
                              <select
                                value={inputs.wife.childcareStartYear}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, childcareStartYear: Number(e.target.value) }
                                })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-blue-600"
                              >
                                {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                                  <option key={yr} value={yr}>{yr}年</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-500 font-medium mb-1">育休終了年</label>
                              <select
                                value={inputs.wife.childcareEndYear}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, childcareEndYear: Number(e.target.value) }
                                })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-blue-600"
                              >
                                {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                                  <option key={yr} value={yr}>{yr}年</option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">育休期間中の課税給与割合</span>
                                <span className="font-semibold text-slate-800">{inputs.wife.childcareSalaryRate}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={inputs.wife.childcareSalaryRate}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, childcareSalaryRate: Number(e.target.value) }
                                })}
                                className="w-full accent-blue-600"
                              />
                              <p className="text-[9px] text-slate-400">※育児休業給付金は非課税所得となるため0%を推奨します</p>
                            </div>

                            <div className="col-span-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-500">復職後の年収・税額割合</span>
                                <span className="font-semibold text-slate-800">{inputs.wife.returnedSalaryRate}%</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="100"
                                step="5"
                                value={inputs.wife.returnedSalaryRate}
                                onChange={(e) => setInputs({
                                  ...inputs,
                                  wife: { ...inputs.wife, returnedSalaryRate: Number(e.target.value) }
                                })}
                                className="w-full accent-blue-600"
                              />
                              <p className="text-[9px] text-slate-400">※復帰後の時短勤務等での収入増減を指定します</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note/Disclaimer Banner */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <Info size={12} className="shrink-0 text-slate-600" />
                <span>【免責事項・注意事項】</span>
              </div>
              <p>
                本アプリによる試算結果は、入力された条件に基づく概算の目安であり、実際の控除額や税額を保証するものではありません。
              </p>
              <p>
                住宅ローン控除の実際の適用にあたっては、所得要件、床面積要件、耐震・省エネ基準の適合、各種証明書類の提出、およびその他の詳細な税制上の規定を満たす必要があります。また、今後の税制改正等により異なり得るため、具体的なお手続きや個別の税務判断については、管轄の税務署または税理士等の専門家にご相談ください。
              </p>
            </div>

          </div>

          {/* RIGHT COLUMN: GRAPHS, SLIDERS & OUTPUT ANALYSIS */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* 1. REAL-TIME PAIR LOAN SLIDERS SECTION */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Percent size={16} className="text-blue-700" />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">持分・借入割合 リアルタイム調整</h3>
              </div>

              {inputs.loanType === 'single' ? (
                <div className="bg-slate-50 p-4 rounded border border-slate-200 flex items-center gap-3">
                  <Info size={18} className="text-blue-600 shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ※単独ローンに設定されているため、持分比率および借入負担割合は自動的に<strong>夫 100% / 妻 0% 固定</strong>となります。
                    夫婦での控除最適割合を比較する場合は、左側のローン形態から「ペアローン」または「連帯債務」を選択してください。
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Borrow rate slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-tight text-[10px]">借入総額の負担割合 (夫割合を指定)</span>
                      <span className="font-bold text-blue-700">
                        夫 {activeShares.husbandBorrow}% : 妻 {activeShares.wifeBorrow}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold text-slate-400">夫 0%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={inputs.husband.borrowRate}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setInputs({
                            ...inputs,
                            husband: {
                              ...inputs.husband,
                              borrowRate: val,
                              ownershipRate: syncShares ? val : inputs.husband.ownershipRate
                            },
                            wife: {
                              ...inputs.wife,
                              borrowRate: 100 - val,
                              ownershipRate: syncShares ? 100 - val : inputs.wife.ownershipRate
                            }
                          });
                        }}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-400">夫 100%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 text-center">
                        <span className="text-slate-500 font-medium">夫の借入額: </span>
                        <strong className="text-slate-800 text-xs">
                          {((inputs.loanAmount * (activeShares.husbandBorrow / 100))).toLocaleString('ja-JP')}万円
                        </strong>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-200 text-center">
                        <span className="text-slate-500 font-medium">妻の借入額: </span>
                        <strong className="text-slate-800 text-xs">
                          {((inputs.loanAmount * (activeShares.wifeBorrow / 100))).toLocaleString('ja-JP')}万円
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Custom shares toggle option */}
                  <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg border border-slate-150">
                    <input
                      type="checkbox"
                      id="custom-shares-checkbox"
                      checked={!syncShares}
                      onChange={(e) => handleCustomSharesToggle(e.target.checked)}
                      className="w-4 h-4 text-blue-700 bg-slate-50 rounded border-slate-200 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="custom-shares-checkbox" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                      持分割合をローン比率と個別に指定する（レアケース・特殊な事例のみ）
                    </label>
                  </div>

                  {!syncShares ? (
                    /* Ownership rate slider (Only shown in rare case when checkbox is checked) */
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700 uppercase tracking-tight text-[10px]">不動産の持分（登記）割合</span>
                          {Math.abs(activeShares.husbandBorrow - activeShares.husbandOwnership) >= 10 && (
                            <span className="bg-orange-50 text-orange-700 text-[9px] font-bold px-2 py-0.5 rounded border border-orange-200 flex items-center gap-0.5">
                              <AlertTriangle size={10} />
                              資金・持分不一致
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-indigo-700">
                          夫 {activeShares.husbandOwnership}% : 妻 {activeShares.wifeOwnership}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-slate-400">夫 0%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={inputs.husband.ownershipRate}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setInputs({
                              ...inputs,
                              husband: { ...inputs.husband, ownershipRate: val },
                              wife: { ...inputs.wife, ownershipRate: 100 - val }
                            });
                          }}
                          className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-400">夫 100%</span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal">
                        ※持分割合と借入返済負担割合に不合理なズレがある場合、税務署から贈与税を課税されるリスクがあります。一般的にはローン比率と同じ割合で登記します。
                      </p>
                    </div>
                  ) : (
                    /* Informational line showing they are synced */
                    <div className="text-[11px] text-slate-500 bg-blue-50/40 p-2.5 rounded-lg border border-blue-100/50 leading-relaxed">
                      <span className="font-semibold text-blue-800">持分比率はローン比率に自動同期中:</span>{' '}
                      夫 {activeShares.husbandOwnership}% : 妻 {activeShares.wifeOwnership}%
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        ※資金負担（ローン割合）と所有権登記（持分割合）を同一にすることで、税務上の贈与税課税リスクを回避できます（一般的な標準実務）。
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. DYNAMIC VISUALIZATION CHARTS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-700" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">シミュレーション分析グラフ</h3>
                </div>

                {/* Main Graph View Toggle Tabs */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                  <button
                    onClick={() => setActiveChartTab('yearly')}
                    className={`px-3 py-1 rounded-md font-bold cursor-pointer transition-all ${
                      activeChartTab === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    年別推移
                  </button>
                  <button
                    onClick={() => setActiveChartTab('comparison')}
                    className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-all ${
                      activeChartTab === 'comparison' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    夫婦別比較
                  </button>
                  <button
                    onClick={() => setActiveChartTab('cumulative')}
                    className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-all ${
                      activeChartTab === 'cumulative' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    累計推移
                  </button>
                </div>
              </div>

              {/* Sub-filters for Yearly graph */}
              {activeChartTab === 'yearly' && (
                <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 p-1.5 rounded-lg w-fit">
                  <span className="text-slate-400 font-medium px-1">表示対象:</span>
                  {[
                    { key: 'total', label: '夫婦世帯合計' },
                    { key: 'husband', label: '夫のみ' },
                    { key: 'wife', label: '妻のみ' }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setYearlyGraphFilter(filter.key as any)}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer font-semibold ${
                        yearlyGraphFilter === filter.key
                          ? 'bg-navy text-white shadow-sm ring-2 ring-[#BBD7FF]'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Graph Container */}
              <div className="h-[280px] w-full font-sans text-xs">
                {activeChartTab === 'yearly' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={yearlyChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={9}
                      />
                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={9}
                        tickFormatter={(v) => `${v / 10000}万`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend iconSize={10} iconType="circle" />
                      <Bar dataKey="所得税控除額 (円)" stackId="a" fill="#1d4ed8" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="住民税控除額 (円)" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="使い切れない控除額 (円)" stackId="a" fill="#fdba74" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {activeChartTab === 'comparison' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                      />
                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={9}
                        tickFormatter={(v) => `${v / 10000}万`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend iconSize={10} iconType="circle" />
                      <Bar dataKey="制度上の控除可能額 (円)" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="実際に使える控除額 (円)" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="使い切れない控除額 (円)" fill="#fdba74" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {activeChartTab === 'cumulative' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={cumulativeChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={9}
                      />
                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={9}
                        tickFormatter={(v) => `${v / 10000}万`}
                      />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Legend iconSize={10} iconType="circle" />
                      <Line
                        type="monotone"
                        dataKey="累計控除可能額 (円)"
                        stroke="#cbd5e1"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="累計実際の控除額 (円)"
                        stroke="#1d4ed8"
                        strokeWidth={2.5}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="累計使い切れない額 (円)"
                        stroke="#fdba74"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 3. FP MEMO & COMPASS NAVIGATOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* FP MEMO */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileText size={16} className="text-blue-700" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">FPメモ (自動診断アドバイス)</h3>
                </div>
                <div className="space-y-2 text-[11px] leading-relaxed text-slate-600">
                  {generateFPMemoList().map((comment, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="text-blue-700 font-bold mt-0.5 shrink-0">•</span>
                      <p>{comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* COMPASS NAVIGATION */}
              <div className="bg-slate-800 p-4 rounded-xl text-white space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                  <Navigation size={16} className="text-blue-300" />
                  <h3 className="font-bold text-white text-xs uppercase tracking-tight">COMPASSナビ (実務チェック)</h3>
                </div>
                <div className="space-y-2 text-[10px] leading-relaxed text-slate-300">
                  {generateCompassNavList().map((nav, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                      <p>{nav}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ==========================================
                4. COLLAPSIBLE DETAILED ANNUAL TABLE
                ========================================== */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setIsTableOpen(!isTableOpen)}
                id="btn-toggle-table"
                className="w-full px-4 py-3 flex items-center justify-between font-bold text-slate-800 text-xs bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all border-b border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-700" />
                  <span className="uppercase tracking-tight text-[10px] font-bold text-slate-700">年別シミュレーション詳細明細テーブル</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-blue-700 font-bold uppercase tracking-tight">
                  <span>{isTableOpen ? '閉じる' : '詳細推移を表示'}</span>
                  {isTableOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              <AnimatePresence>
                {isTableOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-x-auto"
                  >
                    <table className="w-full text-left border-collapse text-[10px] min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-tight">
                          <th className="py-2.5 px-3 sticky left-0 bg-slate-50 border-r border-slate-100">年度 (目)</th>
                          <th className="py-2.5 px-3">夫 ローン残高</th>
                          <th className="py-2.5 px-3">妻 ローン残高</th>
                          <th className="py-2.5 px-3 border-l border-slate-100">夫 控限度額</th>
                          <th className="py-2.5 px-3">妻 控限度額</th>
                          <th className="py-2.5 px-3 border-l border-slate-100">夫 所得税控</th>
                          <th className="py-2.5 px-3">妻 所得税控</th>
                          <th className="py-2.5 px-3 border-l border-slate-100">夫 住民税控</th>
                          <th className="py-2.5 px-3">妻 住民税控</th>
                          <th className="py-2.5 px-3 border-l border-slate-100">夫 未使用枠</th>
                          <th className="py-2.5 px-3">妻 未使用枠</th>
                          <th className="py-2.5 px-3 border-l border-slate-100 bg-blue-50/50 font-bold text-blue-800">世帯合計還元</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50/70 transition-all font-mono"
                          >
                            <td className="py-2 px-3 font-sans font-medium text-slate-800 sticky left-0 bg-white border-r border-slate-100">
                              {r.calendarYear}年 ({r.yearIndex}年目)
                              {(r.husband.capacity.isChildcareActive || r.wife.capacity.isChildcareActive) && (
                                <span className="ml-1.5 inline-block bg-amber-50 text-amber-700 text-[9px] px-1 py-0.2 rounded border border-amber-100 font-sans">
                                  育休
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {formatYenValue(r.husband.loanBalance)}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {formatYenValue(r.wife.loanBalance)}
                            </td>
                            <td className="py-2 px-3 border-l border-slate-100 text-slate-600">
                              {formatYenValue(r.husband.deductionLimit)}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {formatYenValue(r.wife.deductionLimit)}
                            </td>
                            <td className="py-2 px-3 border-l border-slate-100 text-blue-600 font-medium">
                              {formatYenValue(r.husband.incomeTaxDeduction)}
                            </td>
                            <td className="py-2 px-3 text-blue-600 font-medium">
                              {formatYenValue(r.wife.incomeTaxDeduction)}
                            </td>
                            <td className="py-2 px-3 border-l border-slate-100 text-blue-500">
                              {formatYenValue(r.husband.residentTaxDeduction)}
                            </td>
                            <td className="py-2 px-3 text-blue-500">
                              {formatYenValue(r.wife.residentTaxDeduction)}
                            </td>
                            <td className="py-2 px-3 border-l border-slate-100 text-orange-500">
                              {formatYenValue(r.husband.unusedDeduction)}
                            </td>
                            <td className="py-2 px-3 text-orange-500">
                              {formatYenValue(r.wife.unusedDeduction)}
                            </td>
                            <td className="py-2 px-3 border-l border-slate-100 bg-blue-50/30 font-bold text-blue-700">
                              {formatYenValue(r.household.actualDeduction)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </main>

      {/* ==========================================
          FOOTER SECTION
          ========================================== */}
      <footer className="bg-slate-100 px-6 py-8 border-t border-slate-200 mt-8 text-xs">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white/80 p-5 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed space-y-2">
            <p className="font-bold text-slate-700 text-xs">【免責事項・注意事項】</p>
            <p>
              本アプリによる試算結果は、入力された条件に基づく概算の目安であり、実際の控除額や税額を保証するものではありません。
            </p>
            <p>
              住宅ローン控除の実際の適用にあたっては、所得要件、床面積要件、耐震・省エネ基準の適合、各種証明書類の提出、およびその他の詳細な税制上の規定を満たす必要があります。
            </p>
            <p>
              また、今後の税制改正等により、シミュレーション結果と異なる場合があります。具体的なお手続きや個別の税務判断については、管轄の税務署または税理士等の専門家にご相談ください。（LIFE COMPASS LAB 提供）
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-4 border-t border-slate-200/50">
            <div className="space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-700 rounded-full"></span>
                住宅ローン控除COMPASS — LIFE COMPASS LAB Family Application
              </p>
              <p className="text-[10px] text-slate-400">
                © 2026 LIFE COMPASS LAB. All rights reserved.
              </p>
            </div>
            <div className="shrink-0">
              <span className="px-3 py-1.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-600 block shadow-sm select-none font-sans">
                FP相談現場実務・ライフプラン作成対応
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
