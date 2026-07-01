export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  familyId?: string | null;
  createdAt?: any;
}

export interface FamilyGroup {
  id: string;
  name: string;
  createdBy: string;
  members: string[]; // List of user uids
  createdAt?: any;
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  familyName: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  senderName: string;
  createdAt?: any;
}

export type AccountType = 'savings' | 'credit_card';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number; // For savings: current balance. For credit_card: remaining limit.
  limit?: number; // Only for credit card: total credit limit
  interestRate?: number; // Only for credit card: interest rate %
  statementDate?: number; // Only for credit card: day of month (e.g. 15)
  createdAt: any;
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
}

export interface Budget {
  id: string;
  familyId: string;
  category: string;
  amount: number;
  month: string; // YYYY-MM
  items?: BudgetItem[];
  createdAt?: any;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  familyId?: string | null;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  accountId: string; // Associated savings account or credit card
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringId?: string;
  createdAt: any;
}

export interface RecurringExpense {
  id: string;
  userId: string;
  familyId?: string | null;
  amount: number;
  name: string;
  category: string;
  paymentMethod: 'cash' | 'card';
  accountId: string; // Cash savings account OR Credit Card account ID
  isInstallment?: boolean;
  installmentMonths?: number; // e.g. 10
  installmentInterest?: number; // interest % or 0%
  nextDueDate: string; // YYYY-MM-DD (payment day of every month)
  createdAt: any;
}

export interface RecurringIncome {
  id: string;
  userId: string;
  familyId?: string | null;
  name: string;
  baseSalary: number;
  ot: number;
  commission: number;
  incentive: number;
  otherIncome: number;
  freelanceIncome: number;
  totalAmount: number;
  dayOfMonth: number; // 1-31
  accountId: string; // Savings account where income is credited
  lastTriggeredMonth?: string; // YYYY-MM
  createdAt: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  isRead: boolean;
  createdAt: any;
}

export interface CustomCategory {
  id: string;
  userId: string;
  familyId?: string | null;
  name: string;
  type: 'income' | 'expense';
  createdAt: any;
}

export const CATEGORIES = {
  income: ['เงินเดือน (Salary)', 'ธุรกิจส่วนตัว (Business)', 'การลงทุน (Investment)', 'รายรับอื่นๆ (Others)'],
  expense: [
    'อาหารและเครื่องดื่ม (Food & Drinks)',
    'ช้อปปิ้ง (Shopping)',
    'การเดินทางและยานพาหนะ (Transport)',
    'บิลและสาธารณูปโภค (Bills & Utilities)',
    'ที่อยู่อาศัย (Housing)',
    'สุขภาพและการแพทย์ (Health & Medical)',
    'ความบันเทิง (Entertainment)',
    'การศึกษา (Education)',
    'รายจ่ายอื่นๆ (Others)',
  ],
};
