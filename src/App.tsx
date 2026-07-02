import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  subscribeUserProfile,
  subscribeAccounts,
  subscribeTransactions,
  subscribeBudgets,
  subscribeRecurringExpenses,
  subscribeRecurringIncomes,
  addRecurringIncome,
  updateRecurringIncome,
  deleteRecurringIncome,
  subscribeNotifications,
  subscribeFamilyGroup,
  subscribeInvitations,
  addAccount,
  addTransaction,
  deleteTransaction,
  saveBudget,
  deleteBudget,
  addRecurringExpense,
  deleteRecurringExpense,
  updateRecurringExpense,
  createFamilyGroup,
  inviteFamilyMember,
  respondToInvitation,
  leaveFamily,
  addNotification,
  markNotificationAsRead,
  prePopulateMockData,
  isMockUser,
  saveUserProfile,
  subscribeCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  getUserProfile,
  updateAccount,
  updateTransaction,
  updateBudget,
  updateCustomCategory,
  createTransferTransactions,
  deleteAccount
} from './dbService';
import { Account, Transaction, Budget, BudgetItem, RecurringExpense, RecurringIncome, AppNotification, FamilyGroup, FamilyInvitation, UserProfile, CATEGORIES, CustomCategory } from './types';
import { formatCurrency, formatDate, getMonthLabel } from './utils';
import AuthScreen from './components/AuthScreen';
import ReceiptScanner from './components/ReceiptScanner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet, Plus, Trash2, Calendar, CreditCard, PiggyBank, Users, Bell, AlertTriangle, CheckCircle, PieChart, Info,
  TrendingDown, TrendingUp, LogOut, ArrowUpRight, ArrowDownRight, Settings, Sparkles, UserPlus, FileText, RefreshCw, Layers,
  Pencil, X, ArrowRightLeft
} from 'lucide-react';

interface BudgetCategoryItemProps {
  key?: string;
  category: string;
  budgets: Budget[];
  selectedMonth: string;
  user: any;
  profile: any;
  requestConfirm: (title: string, message: string, onConfirm: () => void, danger?: boolean) => void;
  onBudgetSaved: (category: string, amount: number, month: string, items: BudgetItem[]) => void;
  onBudgetDeleted: (id: string) => void;
}

function BudgetCategoryItem({ category, budgets, selectedMonth, user, profile, requestConfirm, onBudgetSaved, onBudgetDeleted }: BudgetCategoryItemProps) {
  const existingBudget = budgets.find(
    (b) => b.category === category && b.month === selectedMonth
  );

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editingItemAmount, setEditingItemAmount] = useState('');

  const [directAmount, setDirectAmount] = useState<string>('');

  useEffect(() => {
    if (existingBudget) {
      if (existingBudget.items && existingBudget.items.length > 0) {
        setItems(existingBudget.items);
        setDirectAmount('');
      } else {
        setItems([]);
        setDirectAmount(existingBudget.amount ? existingBudget.amount.toString() : '');
      }
    } else {
      setItems([]);
      setDirectAmount('');
    }
  }, [existingBudget]);

  const totalAmount = items.length > 0 
    ? items.reduce((sum, item) => sum + item.amount, 0)
    : (parseFloat(directAmount) || 0);

  const handleSaveDirect = async () => {
    const amt = parseFloat(directAmount);
    if (isNaN(amt) || amt < 0) {
      alert('กรุณากรอกจำนวนเงินงบประมาณที่ถูกต้อง');
      return;
    }
    await saveBudget(user.uid, profile?.familyId, category, amt, selectedMonth, []);
    onBudgetSaved(category, amt, selectedMonth, []);
    alert(`บันทึกงบประมาณ "${category}" ยอดเงิน ${formatCurrency(amt)} สำเร็จ!`);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemAmount) return;
    const amt = parseFloat(newItemAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newItem: BudgetItem = {
      id: 'item_' + Math.random().toString(36).substring(2, 9),
      name: newItemName.trim(),
      amount: amt
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setNewItemName('');
    setNewItemAmount('');

    const newTotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    await saveBudget(user.uid, profile?.familyId, category, newTotal, selectedMonth, updatedItems);
    onBudgetSaved(category, newTotal, selectedMonth, updatedItems);
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    requestConfirm(
      'ลบรายการงบประมาณ',
      `คุณต้องการลบรายการงบประมาณ "${itemName}" ใช่หรือไม่?`,
      async () => {
        const updatedItems = items.filter(item => item.id !== itemId);
        setItems(updatedItems);

        const newTotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
        await saveBudget(user.uid, profile?.familyId, category, newTotal, selectedMonth, updatedItems);
        onBudgetSaved(category, newTotal, selectedMonth, updatedItems);
      },
      true
    );
  };

  const handleStartEdit = (item: BudgetItem) => {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingItemAmount(item.amount.toString());
  };

  const handleDeleteBudget = () => {
    if (!existingBudget) return;
    requestConfirm(
      'ลบงบประมาณ',
      `ต้องการลบงบประมาณ "${category}" ของเดือนนี้ใช่หรือไม่?`,
      async () => {
        await deleteBudget(user.uid, existingBudget.id);
        setItems([]);
        setDirectAmount('');
        onBudgetDeleted(existingBudget.id);
      },
      true,
    );
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editingItemName.trim() || !editingItemAmount) return;
    const amt = parseFloat(editingItemAmount);
    if (isNaN(amt) || amt <= 0) return;

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return { ...item, name: editingItemName.trim(), amount: amt };
      }
      return item;
    });

    setItems(updatedItems);
    setEditingItemId(null);

    const newTotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    await saveBudget(user.uid, profile?.familyId, category, newTotal, selectedMonth, updatedItems);
    onBudgetSaved(category, newTotal, selectedMonth, updatedItems);
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-150/60 pb-2.5">
        <div>
          <span className="text-xs font-extrabold text-slate-800">{category}</span>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            งบประมาณรายเดือน
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-400 font-bold uppercase">ยอดรวมงบประมาณ</p>
          <p className="text-xs font-extrabold text-indigo-600">{formatCurrency(totalAmount)}</p>
        </div>
        {existingBudget && (
          <button
            type="button"
            onClick={handleDeleteBudget}
            className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border border-rose-100 transition-all active:scale-90"
            title="ลบงบประมาณ"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sub Items List */}
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="p-2 bg-white border border-slate-100 rounded-xl flex items-center justify-between text-xs transition-all hover:bg-slate-50">
              {editingItemId === item.id ? (
                <div className="flex flex-1 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingItemName}
                    onChange={(e) => setEditingItemName(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-850"
                  />
                  <input
                    type="number"
                    value={editingItemAmount}
                    onChange={(e) => setEditingItemAmount(e.target.value)}
                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-850"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(item.id)}
                    className="text-emerald-600 hover:text-emerald-700 font-extrabold px-1.5 py-1 bg-emerald-50 rounded-lg text-[10px]"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItemId(null)}
                    className="text-slate-400 hover:text-slate-600 font-extrabold px-1.5 py-1 bg-slate-100 rounded-lg text-[10px]"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-xs">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 text-xs">{formatCurrency(item.amount)}</span>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-slate-50 rounded-lg transition-all"
                      title="แก้ไขรายการ"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-50 rounded-lg transition-all"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form to add sub-item */}
      <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-1.5 pt-1.5 border-t border-slate-200/50">
        <div className="col-span-5">
          <input
            type="text"
            required
            placeholder="เช่น Netflix"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.8 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="col-span-4">
          <input
            type="number"
            step="any"
            min="0.01"
            required
            placeholder="ยอดเงิน"
            value={newItemAmount}
            onChange={(e) => setNewItemAmount(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.8 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="col-span-3">
          <button
            type="submit"
            className="w-full h-full py-1.8 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all active:scale-95 shadow-xs"
          >
            เพิ่ม
          </button>
        </div>
      </form>

      {/* Fallback Direct Amount input if no sub-items */}
      {items.length === 0 && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/50">
          <div className="flex-1">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="หรือ ตั้งงบตรงนี้ (ไม่ระบุรายการย่อย)"
              value={directAmount}
              onChange={(e) => setDirectAmount(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.8 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveDirect}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-1.8 px-3 rounded-xl shrink-0 transition-all active:scale-95 shadow-xs"
          >
            บันทึกตรง
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Custom confirmation modal state & helper
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const requestConfirm = (title: string, message: string, onConfirm: () => void, danger = true) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      },
      danger
    });
  };

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<{ [uid: string]: UserProfile }>({});
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'recurring' | 'family' | 'budgets'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'transactions' : 'dashboard';
  });

  // Custom Category form state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');

  // Form states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'savings' | 'credit_card'>('savings');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccLimit, setNewAccLimit] = useState('');
  const [newAccInterest, setNewAccInterest] = useState('16');
  const [newAccStatementDate, setNewAccStatementDate] = useState('15');

  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txCategory, setTxCategory] = useState(CATEGORIES.expense[0]);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState('');
  const [txAccountId, setTxAccountId] = useState('');

  const [showAddRecurringModal, setShowAddRecurringModal] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState<number>(0);
  const [recCategory, setRecCategory] = useState(CATEGORIES.expense[0]);
  const [recMethod, setRecMethod] = useState<'cash' | 'card'>('cash');
  const [recAccountId, setRecAccountId] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentMonths, setInstallmentMonths] = useState<number>(10);
  const [installmentInterest, setInstallmentInterest] = useState<number>(0);
  const [recDueDate, setRecDueDate] = useState(1); // day of month

  const [showAddRecIncomeModal, setShowAddRecIncomeModal] = useState(false);
  const [recIncName, setRecIncName] = useState('');
  const [recIncBaseSalary, setRecIncBaseSalary] = useState<number>(0);
  const [recIncOt, setRecIncOt] = useState<number>(0);
  const [recIncCommission, setRecIncCommission] = useState<number>(0);
  const [recIncIncentive, setRecIncIncentive] = useState<number>(0);
  const [recIncOther, setRecIncOther] = useState<number>(0);
  const [recIncFreelance, setRecIncFreelance] = useState<number>(0);
  const [recIncDayOfMonth, setRecIncDayOfMonth] = useState<number>(25);
  const [recIncAccountId, setRecIncAccountId] = useState('');

  const [familyJoinName, setFamilyJoinName] = useState('');
  const [familyInviteEmail, setFamilyInviteEmail] = useState('');

  // Selected Month filter
  const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g., "2026-06"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Notifications bell state
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Editing states
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<Account | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().substring(0, 10));
  const [transferNote, setTransferNote] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingRecurringExpense, setEditingRecurringExpense] = useState<RecurringExpense | null>(null);
  const [editingRecurringIncome, setEditingRecurringIncome] = useState<RecurringIncome | null>(null);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [chartViewMode, setChartViewMode] = useState<'day' | 'month' | 'year'>('month');

  // Daily Chart Data for the currently selected month (e.g., "2026-06")
  const getDailyChartData = () => {
    const year = parseInt(selectedMonth.split('-')[0]) || new Date().getFullYear();
    const month = parseInt(selectedMonth.split('-')[1]) || (new Date().getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d.toString().padStart(2, '0');
      const dateKey = `${year}-${month.toString().padStart(2, '0')}-${dayStr}`;

      const dailyTxs = transactions.filter(t => t.date === dateKey);
      const income = dailyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = dailyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      data.push({
        label: `${d}`,
        'รายรับ': income,
        'รายจ่าย': expense,
      });
    }
    return data;
  };

  // Monthly Chart Data for the currently selected year (e.g., "2026")
  const getMonthlyChartData = () => {
    const year = selectedMonth.split('-')[0] || new Date().getFullYear().toString();
    const monthsTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    return monthsTH.map((m, idx) => {
      const monthStr = (idx + 1).toString().padStart(2, '0');
      const monthPrefix = `${year}-${monthStr}`;

      const monthlyTxs = transactions.filter(t => t.date.startsWith(monthPrefix));
      const income = monthlyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthlyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      return {
        label: m,
        'รายรับ': income,
        'รายจ่าย': expense,
      };
    });
  };

  // Yearly Chart Data for 5 years
  const getYearlyChartData = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

    return years.map(yr => {
      const yrStr = yr.toString();
      const yearlyTxs = transactions.filter(t => t.date.startsWith(yrStr));
      const income = yearlyTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = yearlyTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      return {
        label: `${yr + 543}`, // Buddhist Era
        'รายรับ': income,
        'รายจ่าย': expense,
      };
    });
  };

  const getChartData = () => {
    switch (chartViewMode) {
      case 'day':
        return getDailyChartData();
      case 'year':
        return getYearlyChartData();
      case 'month':
      default:
        return getMonthlyChartData();
    }
  };

  // Helpers for categories merging custom categories
  const getIncomeCategories = () => {
    return [...CATEGORIES.income, ...customCategories.filter(c => c.type === 'income').map(c => c.name)];
  };

  const getExpenseCategories = () => {
    return [...CATEGORIES.expense, ...customCategories.filter(c => c.type === 'expense').map(c => c.name)];
  };

  const withCurrentCategory = (categories: string[], current?: string) => {
    return Array.from(new Set(current ? [current, ...categories] : categories));
  };

  const getBudgetCategories = () => {
    const currentBudgetCategories = budgets
      .filter((budget) => budget.month === selectedMonth)
      .map((budget) => budget.category);
    return Array.from(new Set([...getExpenseCategories(), ...currentBudgetCategories]));
  };

  const applyDeletedAccount = (accountId: string) => {
    setAccounts((prev) => prev.filter((account) => account.id !== accountId));
    setSelectedAccountDetails((current) => (current?.id === accountId ? null : current));
    setEditingAccount((current) => (current?.id === accountId ? null : current));
  };

  const applyDeletedTransaction = (tx: Transaction, balanceAfterDelete?: number) => {
    const balanceDiff = tx.type === 'income' ? -tx.amount : tx.amount;
    setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === tx.accountId
          ? { ...account, balance: balanceAfterDelete == null ? account.balance + balanceDiff : balanceAfterDelete }
          : account,
      ),
    );
    setEditingTransaction((current) => (current?.id === tx.id ? null : current));
  };

  const applyDeletedRecurringExpense = (id: string) => {
    setRecurring((prev) => prev.filter((item) => item.id !== id));
    setEditingRecurringExpense((current) => (current?.id === id ? null : current));
  };

  const applyDeletedRecurringIncome = (id: string) => {
    setRecurringIncomes((prev) => prev.filter((item) => item.id !== id));
    setEditingRecurringIncome((current) => (current?.id === id ? null : current));
  };

  const applyDeletedCustomCategory = (id: string) => {
    setCustomCategories((prev) => prev.filter((category) => category.id !== id));
    setEditingCategory((current) => (current?.id === id ? null : current));
  };

  const applySavedBudget = (category: string, amount: number, month: string, items: BudgetItem[]) => {
    const targetId = profile?.familyId || user?.uid || '';
    setBudgets((prev) => {
      const existing = prev.find((budget) => budget.category === category && budget.month === month && budget.familyId === targetId);
      if (existing) {
        return prev.map((budget) => (budget.id === existing.id ? { ...budget, amount, items } : budget));
      }
      return [
        ...prev,
        {
          id: `optimistic_${targetId}_${category}_${month}`,
          familyId: targetId,
          category,
          amount,
          month,
          items,
          createdAt: new Date().toISOString(),
        },
      ];
    });
  };

  const applyDeletedBudget = (id: string) => {
    setBudgets((prev) => prev.filter((budget) => budget.id !== id));
  };

  // Auth Listener
  useEffect(() => {
    const handleSupabaseUser = async (supabaseUser: any | null) => {
      if (supabaseUser) {
        const metadata = supabaseUser.user_metadata || {};
        const profileData: UserProfile = {
          uid: supabaseUser.id,
          email: supabaseUser.email || '',
          displayName: metadata.full_name || metadata.name || supabaseUser.email || 'ผู้ใช้ Google',
          photoURL: metadata.avatar_url || metadata.picture || undefined,
        };
        setUser(profileData);
        await saveUserProfile(profileData);
      } else {
        // If not logged in and not in local mock mode, set user to null
        const localUid = localStorage.getItem('active_mock_uid');
        if (localUid) {
          setUser({ uid: localUid, email: localUid === 'mock_alone' ? 'tajiro.solo@gmail.com' : 'tajiro.family@gmail.com', displayName: 'Mock User' });
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      handleSupabaseUser(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSupabaseUser(session?.user || null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Sync profile and data based on Active User (Mock or Real)
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAccounts([]);
      setTransactions([]);
      setBudgets([]);
      setRecurring([]);
      setRecurringIncomes([]);
      setNotifications([]);
      setFamily(null);
      setInvitations([]);
      return;
    }

    const uid = user.uid;

    // 1. Subscribe to User Profile
    const unsubProfile = subscribeUserProfile(uid, (prof) => {
      setProfile(prof);
    });

    return () => {
      unsubProfile();
    };
  }, [user]);

  // Sync data once we have a profile with a familyId (or lack thereof)
  useEffect(() => {
    if (!user || !profile) return;

    const uid = user.uid;
    const familyId = profile.familyId;

    // 2. Subscribe to Accounts
    const unsubAccounts = subscribeAccounts(uid, familyId, (accs) => {
      setAccounts(accs);
      if (accs.length > 0) {
        if (!txAccountId) setTxAccountId(accs[0].id);
        if (!recAccountId) setRecAccountId(accs[0].id);
        if (!recIncAccountId) setRecIncAccountId(accs[0].id);
      }
    });

    // 3. Subscribe to Transactions
    const unsubTx = subscribeTransactions(uid, familyId, (txs) => {
      setTransactions(txs);
    });

    // 4. Subscribe to Budgets
    const unsubBudgets = subscribeBudgets(uid, familyId, (buds) => {
      setBudgets(buds);
    });

    // 5. Subscribe to Recurring
    const unsubRec = subscribeRecurringExpenses(uid, familyId, (recs) => {
      setRecurring(recs);
    });

    const unsubRecInc = subscribeRecurringIncomes(uid, familyId, (recsIncs) => {
      setRecurringIncomes(recsIncs);
    });

    // 6. Subscribe to Notifications
    const unsubNotif = subscribeNotifications(uid, (notifs) => {
      setNotifications(notifs);
    });

    // 7. Subscribe to Family Group
    let unsubFamily = () => {};
    if (familyId) {
      unsubFamily = subscribeFamilyGroup(familyId, (fam) => {
        setFamily(fam);
      });
    } else {
      setFamily(null);
    }

    // 8. Subscribe to Family Invitations
    const unsubInvites = subscribeInvitations(profile.email, (invs) => {
      setInvitations(invs);
    });

    // 9. Subscribe to Custom Categories
    const unsubCustomCategories = subscribeCustomCategories(uid, familyId, (cats) => {
      setCustomCategories(cats);
    });

    return () => {
      unsubAccounts();
      unsubTx();
      unsubBudgets();
      unsubRec();
      unsubRecInc();
      unsubNotif();
      unsubFamily();
      unsubInvites();
      unsubCustomCategories();
    };
  }, [user, profile]);

  // Fetch profiles for all family members
  useEffect(() => {
    if (!family || !family.members || family.members.length === 0) {
      setMemberProfiles({});
      return;
    }

    const fetchProfiles = async () => {
      const profiles: { [uid: string]: UserProfile } = {};
      await Promise.all(
        family.members.map(async (mUid) => {
          try {
            const prof = await getUserProfile(mUid);
            if (prof) {
              profiles[mUid] = prof;
            }
          } catch (err) {
            console.error('Error fetching member profile:', mUid, err);
          }
        })
      );
      setMemberProfiles(profiles);
    };

    fetchProfiles();
  }, [family]);

  // Auto-trigger recurring incomes when they are due
  useEffect(() => {
    if (!user || !profile || recurringIncomes.length === 0 || accounts.length === 0) return;

    const checkAndTriggerIncomes = async () => {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonthStr = today.toISOString().substring(0, 7); // "YYYY-MM"
      const currentDateStr = today.toISOString().split('T')[0]; // "YYYY-MM-DD"

      // Helper to check if it's the end of the month
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const isEndOfMonth = currentDay === daysInMonth;

      for (const inc of recurringIncomes) {
        // Condition: current day >= dayOfMonth OR (end of month and dayOfMonth is out of bounds for this month)
        const isDayDue = currentDay >= inc.dayOfMonth || (isEndOfMonth && inc.dayOfMonth > daysInMonth);
        const hasNotTriggeredThisMonth = inc.lastTriggeredMonth !== currentMonthStr;

        if (isDayDue && hasNotTriggeredThisMonth) {
          const targetAccount = accounts.find(a => a.id === inc.accountId);
          if (!targetAccount) continue;

          try {
            // 1. Add Transaction
            await addTransaction(user.uid, {
              userId: user.uid,
              userName: profile?.displayName || user.displayName || 'ผู้ใช้ร่วม',
              familyId: profile?.familyId || null,
              amount: inc.totalAmount,
              type: 'income',
              category: 'เงินเดือน (Salary)',
              date: currentDateStr,
              description: `[รายรับอัตโนมัติ] ${inc.name} (ฐานเงินเดือน ${formatCurrency(inc.baseSalary)})`,
              accountId: inc.accountId,
              isRecurring: true,
              recurringId: inc.id,
              createdAt: new Date()
            } as any);

            // 2. Update last triggered month
            await updateRecurringIncome(user.uid, inc.id, {
              lastTriggeredMonth: currentMonthStr
            });

            // 3. Add Notification
            await addNotification(
              user.uid,
              `บันทึกรายรับอัตโนมัติ "${inc.name}" ยอดรวม ${formatCurrency(inc.totalAmount)} บาท เรียบร้อยแล้ว`,
              'success'
            );
          } catch (error) {
            console.error("Error triggering recurring income auto-log:", error);
          }
        }
      }
    };

    checkAndTriggerIncomes();
  }, [user, profile, recurringIncomes, accounts]);

  // Helper to advance due date to next month
  const advanceDueDate = (currentDueDateStr: string) => {
    const parts = currentDueDateStr.split('-');
    if (parts.length !== 3) return currentDueDateStr;
    let year = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let day = parseInt(parts[2]);

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    // Handle variable month lengths (e.g., Feb 30 -> Feb 28/29)
    const maxDays = new Date(year, month, 0).getDate();
    const finalDay = Math.min(day, maxDays);

    return `${year}-${month.toString().padStart(2, '0')}-${finalDay.toString().padStart(2, '0')}`;
  };

  // Auto-trigger recurring credit card expenses when they are due
  useEffect(() => {
    if (!user || !profile || recurring.length === 0 || accounts.length === 0) return;

    const checkAndTriggerExpenses = async () => {
      const today = new Date();
      const currentDateStr = today.toISOString().split('T')[0]; // "YYYY-MM-DD"

      for (const item of recurring) {
        // Only target items paid with credit card ("รายการประจำที่หักบัตรเครดิต")
        const targetAccount = accounts.find(a => a.id === item.accountId);
        const isCreditCard = targetAccount?.type === 'credit_card' || item.paymentMethod === 'card';

        if (!isCreditCard) continue;

        // Check if nextDueDate has arrived or passed
        const isDue = currentDateStr >= item.nextDueDate;

        if (isDue) {
          // Verify remaining limit
          if (targetAccount && targetAccount.type === 'credit_card' && targetAccount.balance < item.amount) {
            // Add notification warning about insufficient limit for auto pay
            await addNotification(
              user.uid,
              `⚠️ ไม่สามารถหักบัตรเครดิตอัตโนมัติสำหรับ "${item.name}" เนื่องจากวงเงินคงเหลือไม่พอ (ขาดอีก ${formatCurrency(item.amount - targetAccount.balance)} บาท)`,
              'warning'
            );
            continue;
          }

          try {
            // 1. Add Transaction
            await addTransaction(user.uid, {
              userId: user.uid,
              userName: profile?.displayName || user.displayName || 'ผู้ใช้ร่วม',
              familyId: profile?.familyId || null,
              amount: item.amount,
              type: 'expense',
              category: item.category,
              date: currentDateStr,
              description: `[รายจ่ายอัตโนมัติผ่านบัตร] ${item.name}` + (item.isInstallment ? ` (ผ่อน 0% งวดถัดไป)` : ''),
              accountId: item.accountId,
              isRecurring: true,
              recurringId: item.id,
              createdAt: new Date()
            } as any);

            // 2. Add Notification
            await addNotification(
              user.uid,
              `💳 หักชำระอัตโนมัติผ่านบัตรเครดิตสำหรับ "${item.name}" ยอดเงิน ${formatCurrency(item.amount)} บาท เรียบร้อยแล้ว`,
              'success'
            );

            // 3. Update or delete recurring expense
            if (item.isInstallment && item.installmentMonths !== undefined) {
              if (item.installmentMonths <= 1) {
                // Last installment paid, delete the recurring expense
                await deleteRecurringExpense(user.uid, item.id);
                applyDeletedRecurringExpense(item.id);
                await addNotification(
                  user.uid,
                  `🎉 การผ่อนชำระสำหรับ "${item.name}" ชำระครบกำหนดทั้งหมดเรียบร้อยแล้ว!`,
                  'success'
                );
              } else {
                // Decrement installment months and advance nextDueDate
                const nextDate = advanceDueDate(item.nextDueDate);
                await updateRecurringExpense(user.uid, item.id, {
                  installmentMonths: item.installmentMonths - 1,
                  nextDueDate: nextDate
                });
              }
            } else {
              // Regular monthly recurring, just advance nextDueDate
              const nextDate = advanceDueDate(item.nextDueDate);
              await updateRecurringExpense(user.uid, item.id, {
                nextDueDate: nextDate
              });
            }
          } catch (error) {
            console.error("Error triggering recurring expense auto-pay:", error);
          }
        }
      }
    };

    checkAndTriggerExpenses();
  }, [user, profile, recurring, accounts]);

  // Handle Mock Sign-in
  const handleMockSignIn = (mode: 'alone' | 'family') => {
    const mockUid = mode === 'alone' ? 'mock_alone' : 'mock_family';
    localStorage.setItem('active_mock_uid', mockUid);
    prePopulateMockData(mockUid, mode);
    setUser({
      uid: mockUid,
      email: mode === 'alone' ? 'tajiro.solo@gmail.com' : 'tajiro.family@gmail.com',
      displayName: mode === 'alone' ? 'Tajiro (ส่วนตัว)' : 'Tajiro (ครอบครัว)'
    });
  };

  // Handle Sign out
  const handleSignOut = async () => {
    if (user && isMockUser(user.uid)) {
      localStorage.removeItem('active_mock_uid');
      setUser(null);
    } else {
      await supabase.auth.signOut();
    }
    setActiveTab('dashboard');
  };

  // Check budgets and limits to trigger notifications dynamically
  useEffect(() => {
    if (!user || accounts.length === 0) return;

    // 1. Check Savings Account Balances (Low Balance Notification)
    accounts.forEach((acc) => {
      if (acc.type === 'savings' && acc.balance < 1500) {
        addNotification(
          user.uid,
          `แจ้งเตือน: ยอดเงินคงเหลือในบัญชี "${acc.name}" ต่ำกว่า ฿1,500 (ปัจจุบันคือ ${formatCurrency(acc.balance)})`,
          'warning'
        );
      } else if (acc.type === 'credit_card') {
        const remainingLimit = acc.balance; // Remaining limit for cards
        const totalLimit = acc.limit || 0;
        if (remainingLimit < totalLimit * 0.1) {
          addNotification(
            user.uid,
            `แจ้งเตือน: วงเงินคงเหลือในบัตรเครดิต "${acc.name}" ต่ำกว่า 10% (เหลือ ${formatCurrency(remainingLimit)} จาก ${formatCurrency(totalLimit)})`,
            'warning'
          );
        }
      }
    });

    // 2. Check Category Budget Limit Exceeded for Selected Month
    const expenseTxs = transactions.filter(
      (t) => t.type === 'expense' && t.date.substring(0, 7) === selectedMonth
    );

    budgets.forEach((bud) => {
      if (bud.month === selectedMonth) {
        const spent = expenseTxs
          .filter((t) => t.category === bud.category)
          .reduce((sum, t) => sum + t.amount, 0);

        if (spent > bud.amount) {
          addNotification(
            user.uid,
            `แจ้งเตือน: ค่าใช้จ่ายประเภท "${bud.category}" มียอดใช้จ่ายรวม (${formatCurrency(spent)}) เกินกว่างบประมาณที่กำหนดไว้ (${formatCurrency(bud.amount)})!`,
            'warning'
          );
        }
      }
    });
  }, [accounts, transactions, budgets, selectedMonth, user]);

  // Handle Scan complete
  const handleScanComplete = (data: any) => {
    setTxAmount(data.totalAmount);
    setTxDate(data.date || new Date().toISOString().split('T')[0]);
    setTxDescription(data.storeName + (data.description ? ` (${data.description})` : ''));
    
    // Attempt matching parsed category
    const matchedCategory = CATEGORIES.expense.find(c => c.toLowerCase().includes(data.suggestedCategory.toLowerCase())) || CATEGORIES.expense[0];
    setTxCategory(matchedCategory);

    // Alert user that scanned data is ready
    addNotification(user?.uid || '', `สแกนใบเสร็จจาก ${data.storeName} ยอดเงิน ${formatCurrency(data.totalAmount)} สำเร็จแล้ว!`, 'success');
  };

  // Create custom category handler
  const handleCreateCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !user) return;

    try {
      await addCustomCategory(user.uid, profile?.familyId, {
        name: newCatName.trim(),
        type: newCatType,
      });

      addNotification(user.uid, `เพิ่มประเภทรายการ "${newCatName.trim()}" สำเร็จ`, 'success');
      setNewCatName('');
      // Keep modal open so they can see/manage categories, or close it if desired
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomCategory = async (id: string, name: string) => {
    if (!user) return;
    requestConfirm(
      'ลบประเภทรายการ',
      `ต้องการลบประเภทรายการ "${name}" ใช่หรือไม่?`,
      async () => {
        try {
          await deleteCustomCategory(user.uid, id);
          applyDeletedCustomCategory(id);
          addNotification(user.uid, `ลบประเภทรายการ "${name}" เรียบร้อยแล้ว`, 'info');
        } catch (err) {
          console.error(err);
        }
      },
      true
    );
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.name.trim() || !user) return;
    if (editingAccount.balance < 0 || !Number.isFinite(editingAccount.balance)) {
      alert('กรุณากรอกยอดคงเหลือให้ถูกต้อง');
      return;
    }
    if (editingAccount.type === 'credit_card') {
      if ((editingAccount.limit ?? 0) < 0 || !Number.isFinite(editingAccount.limit ?? 0)) {
        alert('กรุณากรอกวงเงินบัตรให้ถูกต้อง');
        return;
      }
      if (!editingAccount.statementDate || editingAccount.statementDate < 1 || editingAccount.statementDate > 31) {
        alert('กรุณากรอกวันที่ตัดรอบบัตรระหว่าง 1-31');
        return;
      }
    }

    try {
      await updateAccount(user.uid, editingAccount.id, {
        name: editingAccount.name,
        balance: editingAccount.balance,
        limit: editingAccount.type === 'credit_card' ? editingAccount.limit : undefined,
        interestRate: editingAccount.type === 'credit_card' ? editingAccount.interestRate : undefined,
        statementDate: editingAccount.type === 'credit_card' ? editingAccount.statementDate : undefined,
      });

      setEditingAccount(null);
      addNotification(user.uid, `อัปเดตข้อมูลแหล่งเงิน "${editingAccount.name}" เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!user) return;

    const linkedTransactions = transactions.filter((tx) => tx.accountId === account.id).length;
    const linkedRecurringExpenses = recurring.filter((item) => item.accountId === account.id).length;
    const linkedRecurringIncomes = recurringIncomes.filter((item) => item.accountId === account.id).length;
    const totalLinked = linkedTransactions + linkedRecurringExpenses + linkedRecurringIncomes;

    if (totalLinked > 0) {
      alert(
        `ยังลบ "${account.name}" ไม่ได้ เพราะมีข้อมูลที่ผูกอยู่: ธุรกรรม ${linkedTransactions} รายการ, รายจ่ายประจำ ${linkedRecurringExpenses} รายการ, รายรับประจำ ${linkedRecurringIncomes} รายการ\n\nกรุณาลบหรือย้ายรายการเหล่านี้ไปบัญชีอื่นก่อน เพื่อไม่ให้ยอดเงินและประวัติการเงินเสียหาย`,
      );
      return;
    }

    requestConfirm(
      'ลบแหล่งเงิน',
      `ต้องการลบ "${account.name}" ใช่หรือไม่? บัญชีนี้ไม่มีธุรกรรมหรือรายการประจำที่ผูกอยู่`,
      async () => {
        try {
          await deleteAccount(user.uid, account.id);
          applyDeletedAccount(account.id);
          addNotification(user.uid, `ลบแหล่งเงิน "${account.name}" สำเร็จ`, 'success');
        } catch (err: any) {
          console.error(err);
          const message = String(err?.message || '');
          if (message.toLowerCase().includes('foreign key') || err?.code === '23503') {
            alert('ลบบัญชีนี้ไม่ได้ เพราะยังมีธุรกรรมหรือรายการอื่นผูกอยู่ กรุณาลบหรือย้ายรายการที่เกี่ยวข้องก่อน');
          } else {
            alert('เกิดข้อผิดพลาดในการลบแหล่งเงิน');
          }
        }
      },
      true,
    );
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !editingTransaction.accountId || editingTransaction.amount <= 0 || !user) return;

    const originalTx = transactions.find(t => t.id === editingTransaction.id);
    if (!originalTx) return;

    try {
      await updateTransaction(user.uid, editingTransaction.id, originalTx, {
        amount: editingTransaction.amount,
        type: editingTransaction.type,
        category: editingTransaction.category,
        date: editingTransaction.date,
        description: editingTransaction.description || editingTransaction.category,
        accountId: editingTransaction.accountId,
      });

      setEditingTransaction(null);
      addNotification(user.uid, `อัปเดตรายการธุรกรรมเรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromId || !transferToId || transferFromId === transferToId) {
      alert('กรุณาเลือกบัญชีต้นทางและปลายทางที่แตกต่างกัน');
      return;
    }
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('กรุณากรอกจำนวนเงินที่ต้องการโอน');
      return;
    }

    const fromAcc = accounts.find(a => a.id === transferFromId);
    const toAcc = accounts.find(a => a.id === transferToId);
    if (!fromAcc || !toAcc) return;

    const executeTransfer = async () => {
      try {
        await createTransferTransactions(user.uid, {
          userName: profile?.displayName || user.displayName || 'ผู้ใช้',
          familyId: profile?.familyId || null,
          amount: amt,
          date: transferDate,
          fromAccountId: transferFromId,
          toAccountId: transferToId,
          fromAccountName: fromAcc.name,
          toAccountName: toAcc.name,
          note: transferNote,
        });

        setShowTransferModal(false);
        setTransferFromId('');
        setTransferToId('');
        setTransferAmount('');
        setTransferNote('');
        addNotification(user.uid, `โอนเงินจาก "${fromAcc.name}" ไปยัง "${toAcc.name}" จำนวน ${formatCurrency(amt)} สำเร็จ`, 'success');
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการโอนเงิน');
      }
    };

    if (fromAcc.type === 'savings' && fromAcc.balance < amt) {
      requestConfirm(
        'ยอดเงินไม่เพียงพอ',
        'ยอดเงินคงเหลือในบัญชีต้นทางไม่เพียงพอ คุณต้องการดำเนินการต่อใช่หรือไม่?',
        executeTransfer,
        true
      );
    } else {
      await executeTransfer();
    }
  };

  const handleUpdateRecurringExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecurringExpense || !editingRecurringExpense.name.trim() || editingRecurringExpense.amount <= 0 || !user) return;
    if (editingRecurringExpense.isInstallment && (!editingRecurringExpense.installmentMonths || editingRecurringExpense.installmentMonths < 1)) {
      alert('กรุณากรอกจำนวนงวดให้ถูกต้อง');
      return;
    }

    try {
      await updateRecurringExpense(user.uid, editingRecurringExpense.id, {
        name: editingRecurringExpense.name,
        amount: editingRecurringExpense.amount,
        category: editingRecurringExpense.category,
        accountId: editingRecurringExpense.accountId,
        paymentMethod: editingRecurringExpense.paymentMethod,
        isInstallment: editingRecurringExpense.isInstallment,
        installmentMonths: editingRecurringExpense.isInstallment ? editingRecurringExpense.installmentMonths : undefined,
        installmentInterest: editingRecurringExpense.isInstallment ? editingRecurringExpense.installmentInterest : undefined,
        nextDueDate: editingRecurringExpense.nextDueDate,
      });

      setEditingRecurringExpense(null);
      addNotification(user.uid, `อัปเดตการผ่อนชำระ/ค่าใช้จ่ายประจำเรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRecurringIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecurringIncome || !editingRecurringIncome.name.trim() || !user) return;
    if (!editingRecurringIncome.dayOfMonth || editingRecurringIncome.dayOfMonth < 1 || editingRecurringIncome.dayOfMonth > 31) {
      alert('กรุณากรอกวันที่รับรายรับประจำระหว่าง 1-31');
      return;
    }

    const total = (editingRecurringIncome.baseSalary || 0) +
                  (editingRecurringIncome.ot || 0) +
                  (editingRecurringIncome.commission || 0) +
                  (editingRecurringIncome.incentive || 0) +
                  (editingRecurringIncome.otherIncome || 0) +
                  (editingRecurringIncome.freelanceIncome || 0);

    try {
      await updateRecurringIncome(user.uid, editingRecurringIncome.id, {
        name: editingRecurringIncome.name,
        baseSalary: editingRecurringIncome.baseSalary,
        ot: editingRecurringIncome.ot,
        commission: editingRecurringIncome.commission,
        incentive: editingRecurringIncome.incentive,
        otherIncome: editingRecurringIncome.otherIncome,
        freelanceIncome: editingRecurringIncome.freelanceIncome,
        totalAmount: total,
        dayOfMonth: editingRecurringIncome.dayOfMonth,
        accountId: editingRecurringIncome.accountId,
      });

      setEditingRecurringIncome(null);
      addNotification(user.uid, `อัปเดตแผนรายรับประจำเดือนเรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCustomCategory = async (catId: string, newName: string) => {
    if (!user || !newName.trim()) return;
    try {
      await updateCustomCategory(user.uid, catId, { name: newName });
      setEditingCategory(null);
      addNotification(user.uid, `แก้ไขประเภทรายการเป็น "${newName}" เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Add a new account/card
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !user) return;

    const balance = parseFloat(newAccBalance || '0');
    const limit = parseFloat(newAccLimit || '0');
    const interestRate = parseFloat(newAccInterest || '0');
    const statementDate = parseInt(newAccStatementDate || '15');

    if (Number.isNaN(balance) || balance < 0) {
      alert('กรุณากรอกยอดเงินตั้งต้นให้ถูกต้อง');
      return;
    }
    if (newAccType === 'credit_card' && (Number.isNaN(limit) || limit < 0)) {
      alert('กรุณากรอกวงเงินบัตรเครดิตให้ถูกต้อง');
      return;
    }

    try {
      await addAccount(user.uid, {
        userId: user.uid,
        name: newAccName.trim(),
        type: newAccType,
        balance,
        limit: newAccType === 'credit_card' ? limit : undefined,
        interestRate: newAccType === 'credit_card' ? interestRate : undefined,
        statementDate: newAccType === 'credit_card' ? statementDate : undefined,
      });

      // Reset
      setNewAccName('');
      setNewAccBalance('');
      setNewAccLimit('');
      setNewAccInterest('16');
      setNewAccStatementDate('15');
      setShowAddAccountModal(false);
      addNotification(user.uid, `สร้างแหล่งเงิน "${newAccName}" เรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'เกิดข้อผิดพลาดในการสร้างแหล่งเงิน');
    }
  };

  // Add a transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || txAmount <= 0 || !txAccountId) return;

    // Check credit card remaining limit if spending via card
    const targetAccount = accounts.find((a) => a.id === txAccountId);
    if (txType === 'expense' && targetAccount && targetAccount.type === 'credit_card') {
      if (targetAccount.balance < txAmount) {
        alert(`เกิดข้อผิดพลาด: วงเงินในบัตรเครดิตไม่เพียงพอที่จะทำรายการนี้ (คงเหลือ ${formatCurrency(targetAccount.balance)})`);
        return;
      }
    }

    try {
      await addTransaction(user.uid, {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'ผู้ใช้ร่วม',
        familyId: profile?.familyId || null,
        amount: txAmount,
        type: txType,
        category: txCategory,
        date: txDate,
        description: txDescription || txCategory,
        accountId: txAccountId,
      });

      // Reset form
      setTxAmount(0);
      setTxDescription('');
      setShowAddTxModal(false);
      addNotification(user.uid, `บันทึกรายการ ${txType === 'income' ? 'รายรับ' : 'รายจ่าย'} เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Add recurring expense
  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || recAmount <= 0 || !recAccountId || !recName.trim()) return;
    if (!recDueDate || recDueDate < 1 || recDueDate > 31) {
      alert('กรุณากรอกวันที่ต้องชำระระหว่าง 1-31');
      return;
    }
    if (isInstallment && (!installmentMonths || installmentMonths < 1)) {
      alert('กรุณากรอกจำนวนงวดให้ถูกต้อง');
      return;
    }

    try {
      // Calculate next due date
      const today = new Date();
      let dueMonth = today.getMonth() + 1; // next month
      let dueYear = today.getFullYear();
      if (today.getDate() >= recDueDate) {
        dueMonth += 1;
        if (dueMonth > 12) {
          dueMonth = 1;
          dueYear += 1;
        }
      }
      const nextDueDateStr = `${dueYear}-${dueMonth.toString().padStart(2, '0')}-${recDueDate.toString().padStart(2, '0')}`;

      await addRecurringExpense(user.uid, profile?.familyId, {
        userId: user.uid,
        amount: recAmount,
        name: recName,
        category: recCategory,
        paymentMethod: recMethod,
        accountId: recAccountId,
        isInstallment,
        installmentMonths: isInstallment ? installmentMonths : undefined,
        installmentInterest: isInstallment ? installmentInterest : undefined,
        nextDueDate: nextDueDateStr,
      });

      // Reset
      setRecName('');
      setRecAmount(0);
      setIsInstallment(false);
      setShowAddRecurringModal(false);
      addNotification(user.uid, `ตั้งค่าค่าใช้จ่ายรายเดือน "${recName}" เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Add recurring income
  const handleCreateRecurringIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !recIncName.trim() || !recIncAccountId) return;
    if (!recIncDayOfMonth || recIncDayOfMonth < 1 || recIncDayOfMonth > 31) {
      alert('กรุณากรอกวันที่รับรายรับประจำระหว่าง 1-31');
      return;
    }

    const total = recIncBaseSalary + recIncOt + recIncCommission + recIncIncentive + recIncOther + recIncFreelance;
    if (total <= 0) {
      alert("กรุณากรอกจำนวนรายรับอย่างน้อยหนึ่งรายการที่มากกว่า 0 บาท");
      return;
    }

    try {
      await addRecurringIncome(user.uid, profile?.familyId, {
        userId: user.uid,
        name: recIncName,
        baseSalary: recIncBaseSalary,
        ot: recIncOt,
        commission: recIncCommission,
        incentive: recIncIncentive,
        otherIncome: recIncOther,
        freelanceIncome: recIncFreelance,
        totalAmount: total,
        dayOfMonth: recIncDayOfMonth,
        accountId: recIncAccountId,
        lastTriggeredMonth: '' // Empty so it can trigger this month if due date matches
      });

      // Reset
      setRecIncName('');
      setRecIncBaseSalary(0);
      setRecIncOt(0);
      setRecIncCommission(0);
      setRecIncIncentive(0);
      setRecIncOther(0);
      setRecIncFreelance(0);
      setRecIncDayOfMonth(25);
      setShowAddRecIncomeModal(false);
      addNotification(user.uid, `ตั้งค่ารายรับประจำเดือน "${recIncName}" เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger manual recurring income log
  const handleTriggerRecurringIncome = async (incItem: RecurringIncome) => {
    if (!user) return;

    try {
      await addTransaction(user.uid, {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'ผู้ใช้ร่วม',
        familyId: profile?.familyId || null,
        amount: incItem.totalAmount,
        type: 'income',
        category: 'เงินเดือน (Salary)',
        date: new Date().toISOString().split('T')[0],
        description: `[รายรับรายเดือน] ${incItem.name} (ฐานเงินเดือน ${formatCurrency(incItem.baseSalary)})`,
        accountId: incItem.accountId,
        isRecurring: true,
        recurringId: incItem.id
      });

      addNotification(user.uid, `บันทึกรายรับ "${incItem.name}" ยอดเงิน ${formatCurrency(incItem.totalAmount)} เรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger a manual charge of a recurring item
  const handleTriggerRecurringPayment = async (recItem: RecurringExpense) => {
    if (!user) return;

    const targetAccount = accounts.find((a) => a.id === recItem.accountId);
    if (targetAccount && targetAccount.type === 'credit_card') {
      if (targetAccount.balance < recItem.amount) {
        alert(`วงเงินในบัตรเครดิต "${targetAccount.name}" ไม่เพียงพอสำหรับจ่ายชำระค่าใช้จ่ายผ่อนชำระ/รายเดือนนี้!`);
        return;
      }
    }

    try {
      await addTransaction(user.uid, {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'ผู้ใช้ร่วม',
        familyId: profile?.familyId || null,
        amount: recItem.amount,
        type: 'expense',
        category: recItem.category,
        date: new Date().toISOString().split('T')[0],
        description: `[จ่ายรายเดือน] ${recItem.name}` + (recItem.isInstallment ? ` (ผ่อน 0% งวดถัดไป)` : ''),
        accountId: recItem.accountId,
      });

      addNotification(user.uid, `ชำระรายการรายเดือน "${recItem.name}" ยอดเงิน ${formatCurrency(recItem.amount)} สำเร็จ`, 'success');

      // Update or delete recurring expense
      if (recItem.isInstallment && recItem.installmentMonths !== undefined) {
        if (recItem.installmentMonths <= 1) {
          // Last installment paid, delete the recurring expense
          await deleteRecurringExpense(user.uid, recItem.id);
          applyDeletedRecurringExpense(recItem.id);
          addNotification(
            user.uid,
            `🎉 การผ่อนชำระสำหรับ "${recItem.name}" ชำระครบกำหนดทั้งหมดเรียบร้อยแล้ว!`,
            'success'
          );
        } else {
          // Decrement installment months and advance nextDueDate
          const nextDate = advanceDueDate(recItem.nextDueDate);
          await updateRecurringExpense(user.uid, recItem.id, {
            installmentMonths: recItem.installmentMonths - 1,
            nextDueDate: nextDate
          });
        }
      } else {
        // Regular monthly recurring, just advance nextDueDate
        const nextDate = advanceDueDate(recItem.nextDueDate);
        await updateRecurringExpense(user.uid, recItem.id, {
          nextDueDate: nextDate
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Family Group
  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyJoinName.trim() || !user) return;

    try {
      await createFamilyGroup(user.uid, profile?.displayName || 'ผู้ใช้', familyJoinName);
      setFamilyJoinName('');
      addNotification(user.uid, `สร้างกลุ่มครอบครัว "${familyJoinName}" สำเร็จ!`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Invite member
  const handleInviteFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyInviteEmail.trim() || !user || !family) return;

    try {
      await inviteFamilyMember(
        user.uid,
        profile?.displayName || 'หัวหน้าครอบครัว',
        family.id,
        family.name,
        familyInviteEmail
      );
      setFamilyInviteEmail('');
      alert(`ส่งคำเชิญเข้าร่วมครอบครัวไปยังอีเมล ${familyInviteEmail} เรียบร้อยแล้ว`);
      addNotification(user.uid, `เชิญสมาชิก "${familyInviteEmail}" เข้าร่วมกลุ่มแล้ว`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter transactions for calculations
  const filteredTxs = transactions.filter((t) => t.date.substring(0, 7) === selectedMonth);

  const totalIncome = filteredTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Group transactions by category for beautiful pie list
  const categoryTotals = filteredTxs
    .filter((t) => t.type === 'expense')
    .reduce((acc: { [key: string]: number }, cur) => {
      acc[cur.category] = (acc[cur.category] || 0) + cur.amount;
      return acc;
    }, {});

  const maxExpenseCategory = Object.entries(categoryTotals).reduce<{ cat: string; val: number }>(
    (max, [cat, val]) => ((val as number) > max.val ? { cat, val: val as number } : max),
    { cat: 'ไม่มีข้อมูล', val: 0 }
  );

  if (loading) {
    return (
      <div id="loading-spinner-screen" className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลระบบ...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onMockSignIn={handleMockSignIn} />;
  }

  return (
    <div id="app-container" className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar for Desktop */}
      <aside id="desktop-sidebar" className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col p-6 shrink-0 relative">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/15">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-indigo-950">Family Wallet</h1>
            <span className="text-[10px] text-indigo-600 font-mono">AI ENHANCED v2.5</span>
          </div>
        </div>

        {/* User Info Card */}
        <div id="user-profile-card" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center border border-slate-200 overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                profile?.displayName?.charAt(0) || 'U'
              )}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate text-slate-800">{profile?.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate font-mono">{profile?.email}</p>
            </div>
          </div>

          {family ? (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] bg-emerald-50 text-emerald-700 py-0.5 px-2 rounded-full font-semibold flex items-center gap-1 ring-1 ring-emerald-200">
                <Users className="w-3 h-3" /> ครอบครัว: {family.name}
              </span>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <span className="text-[10px] text-slate-500">บัญชีเดี่ยวทั่วไป</span>
            </div>
          )}
        </div>

        {/* Month Selector Filter */}
        <div id="month-selector-sidebar" className="mb-6">
          <label className="text-xs text-slate-400 font-semibold uppercase block mb-2">เลือกรอบบิล / เดือน</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Nav list */}
        <nav id="desktop-nav" className="flex-1 space-y-1">
          <button
            id="nav-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <PieChart className="w-4 h-4" /> แดชบอร์ดสรุปรายเดือน
          </button>
          <button
            id="nav-btn-accounts"
            onClick={() => setActiveTab('accounts')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors ${
              activeTab === 'accounts' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <PiggyBank className="w-4 h-4" /> แหล่งเงินออม & บัตรเครดิต
          </button>
          <button
            id="nav-btn-transactions"
            onClick={() => setActiveTab('transactions')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors ${
              activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" /> บันทึกและสแกนใบเสร็จ
          </button>
          <button
            id="nav-btn-recurring"
            onClick={() => setActiveTab('recurring')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors ${
              activeTab === 'recurring' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" /> รายจ่ายประจำเดือน & ผ่อน 0%
          </button>
          <button
            id="nav-btn-budgets"
            onClick={() => setActiveTab('budgets')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors ${
              activeTab === 'budgets' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" /> ตั้งงบประมาณรายเดือน
          </button>
          <button
            id="nav-btn-family"
            onClick={() => setActiveTab('family')}
            className={`w-full text-left py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors ${
              activeTab === 'family' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" /> ระบบครอบครัว
          </button>
        </nav>

        {/* Logout */}
        <button
          id="btn-logout"
          onClick={handleSignOut}
          className="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors mt-auto"
        >
          <LogOut className="w-4 h-4" /> ออกจากระบบ
        </button>
      </aside>

      {/* Main Panel */}
      <main id="main-content-panel" className="flex-1 flex flex-col min-w-0 bg-[#F1F5F9] pb-20 md:pb-6 overflow-y-auto max-h-screen">
        
        {/* Top bar */}
        <header id="top-bar" className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-sm text-slate-800">Family Wallet</h1>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">มุมมองปัจจุบัน:</span>
            <span className="text-xs bg-indigo-50 text-indigo-700 py-1 px-3 rounded-full font-semibold ring-1 ring-indigo-100">
              {activeTab === 'dashboard' && '📊 แดชบอร์ดสรุปรายเดือน'}
              {activeTab === 'accounts' && '🏦 แหล่งเงินออมและบัตรเครดิต'}
              {activeTab === 'transactions' && '💸 รายการรายรับรายจ่าย'}
              {activeTab === 'recurring' && '🔄 รายจ่ายรายเดือน & การผ่อนชำระ'}
              {activeTab === 'budgets' && '🎯 แผนงบประมาณรายเดือน'}
              {activeTab === 'family' && '👨‍👩‍👧‍👦 ระบบครอบครัวร่วมกัน'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Invitations Alert Banner */}
            {invitations.length > 0 && (
              <div id="invitation-alert" className="animate-bounce bg-amber-500 text-slate-950 text-xs font-bold py-1 px-3 rounded-full flex items-center gap-1 cursor-pointer" onClick={() => setActiveTab('family')}>
                <UserPlus className="w-3.5 h-3.5" /> มีคำเชิญจากครอบครัว!
              </div>
            )}

            {/* Notifications panel */}
            <div className="relative">
              <button
                id="btn-notif-bell"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    id="notif-dropdown"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 text-xs text-slate-700"
                  >
                    <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-800">การแจ้งเตือนสเตตัส</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {notifications.filter(n => !n.isRead).length} ข้อความใหม่
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 font-medium">ไม่มีข้อความแจ้งเตือนใหม่</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 transition-colors ${notif.isRead ? 'opacity-60' : 'bg-slate-50'}`}
                          >
                            <div className="flex gap-2 items-start">
                              {notif.type === 'warning' ? (
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                              ) : notif.type === 'success' ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 leading-relaxed">{notif.message}</p>
                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="text-[9px] text-slate-400">{formatDate(notif.createdAt)}</span>
                                  {!notif.isRead && (
                                    <button
                                      id={`btn-mark-read-${notif.id}`}
                                      onClick={() => markNotificationAsRead(user.uid, notif.id)}
                                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                                    >
                                      อ่านแล้ว
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Log out button */}
            <button
              id="btn-logout-mobile"
              onClick={handleSignOut}
              className="md:hidden p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Nav Header Selector (only on small screens) */}
        <div id="mobile-month-selector" className="md:hidden bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">รอบบิล:</span>
            <span className="font-bold text-slate-800">{getMonthLabel(selectedMonth)}</span>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
          />
        </div>

        {/* Active Content Body */}
        <div id="active-tab-content-wrapper" className="flex-1 p-6 max-w-7xl w-full mx-auto">
          
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <motion.div
                id="dashboard-tab"
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Financial Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Savings Account Balance */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-slate-400 font-bold uppercase">ยอดเงินคงเหลือในบัญชีออมทรัพย์</span>
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">
                      {formatCurrency(accounts.filter(a => a.type === 'savings').reduce((sum, a) => sum + a.balance, 0))}
                    </p>
                    <div className="mt-3 flex gap-1 items-center text-xs text-slate-400 font-medium">
                      <span>จากแหล่งเก็บออมทั้งหมด</span>
                      <span className="text-indigo-600 font-bold">
                        {accounts.filter(a => a.type === 'savings').length} บัญชี
                      </span>
                    </div>
                  </div>

                  {/* Monthly Expenses */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-slate-400 font-bold uppercase">ยอดจ่ายรวมของรอบเดือนนี้</span>
                      <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-rose-500">
                      {formatCurrency(totalExpense)}
                    </p>
                    <div className="mt-3 flex gap-1.5 items-center text-xs text-slate-400 font-medium">
                      <span>เฉลี่ยใช้จ่ายต่อวัน:</span>
                      <span className="text-rose-500 font-bold">
                        {formatCurrency(Math.round(totalExpense / 30))}
                      </span>
                    </div>
                  </div>

                  {/* Remaining Card Limits */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-slate-400 font-bold uppercase">วงเงินคงเหลือในบัตรเครดิต</span>
                      <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-amber-600">
                      {formatCurrency(accounts.filter(a => a.type === 'credit_card').reduce((sum, a) => sum + a.balance, 0))}
                    </p>
                    <div className="mt-3 flex gap-1.5 items-center text-xs text-slate-400 font-medium">
                      <span>ยอดหนี้บัตรรอตัดรอบ:</span>
                      <span className="text-amber-600 font-bold">
                        {formatCurrency(accounts.filter(a => a.type === 'credit_card').reduce((sum, a) => sum + ((a.limit || 0) - a.balance), 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 📊 Interactive Income & Expense Charts */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-indigo-600" />
                        กราฟวิเคราะห์รายรับ-รายจ่าย
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        เปรียบเทียบสัดส่วนระหว่างเงินเข้าและเงินออกแบบเรียลไทม์ {chartViewMode === 'day' ? `รายวัน (เดือน ${getMonthLabel(selectedMonth)})` : chartViewMode === 'month' ? 'รายเดือน (ปีนี้)' : 'รายปี (บวก/ลบ 2 ปี)'}
                      </p>
                    </div>

                    {/* Segmented Controller Mode Selector */}
                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setChartViewMode('day')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartViewMode === 'day' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        รายวัน
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartViewMode('month')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartViewMode === 'month' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        รายเดือน
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartViewMode('year')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartViewMode === 'year' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        รายปี
                      </button>
                    </div>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getChartData()}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          labelClassName="font-bold text-xs text-slate-800"
                          formatter={(value: any) => [`${parseFloat(value).toLocaleString()} บาท`, '']}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar dataKey="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="รายจ่าย" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sub Quick Actions Bento */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left block: Budget Progress */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-2 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <Layers className="w-4.5 h-4.5 text-indigo-600" /> งบประมาณเดือน {getMonthLabel(selectedMonth)}
                      </h2>
                      <button
                        id="btn-edit-budgets-shortcut"
                        onClick={() => setActiveTab('budgets')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        ตั้งงบประมาณเพิ่ม
                      </button>
                    </div>

                    {budgets.filter(b => b.month === selectedMonth).length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">
                        ยังไม่มีการกำหนดเป้าหมายงบประมาณในเดือนนี้
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {budgets
                          .filter((b) => b.month === selectedMonth)
                          .map((bud) => {
                            const spent = filteredTxs
                              .filter((t) => t.type === 'expense' && t.category === bud.category)
                              .reduce((sum, t) => sum + t.amount, 0);
                            const percent = Math.min(100, (spent / bud.amount) * 100);

                            return (
                              <div key={bud.id} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-750">{bud.category}</span>
                                  <span className={spent > bud.amount ? 'text-rose-600' : 'text-slate-500'}>
                                    {formatCurrency(spent)} / {formatCurrency(bud.amount)} ({percent.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      spent > bud.amount ? 'bg-rose-500' : percent > 85 ? 'bg-amber-500' : 'bg-indigo-600'
                                    }`}
                                    style={{ width: `${percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Right block: Quick Action */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-3">
                        <Sparkles className="w-4.5 h-4.5 text-amber-500" /> ทางลัดทำรายการด่วน
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        บันทึกรายรับรายจ่ายด้วยแบบฟอร์มอัจฉริยะ หรือสแกนภาพใบเสร็จเพื่อกรอกข้อมูลโดยอัตโนมัติทันที
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button
                        id="btn-quick-scan"
                        onClick={() => {
                          setActiveTab('transactions');
                          setShowAddTxModal(true);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 text-xs"
                      >
                        <Plus className="w-4 h-4" /> บันทึกและสแกนด้วย AI
                      </button>

                      <button
                        id="btn-quick-recurring"
                        onClick={() => {
                          setActiveTab('recurring');
                          setShowAddRecurringModal(true);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                      >
                        <RefreshCw className="w-4 h-4" /> ตั้งผ่อนสินค้า / ค่าใช้จ่ายประจำ
                      </button>
                    </div>
                  </div>
                </div>

                {/* Analysis & Category Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Category Breakdown (List with percentage) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-1 shadow-sm">
                    <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
                      <PieChart className="w-4.5 h-4.5 text-indigo-600" /> วิเคราะห์สัดส่วนการจ่ายเงิน
                    </h3>

                    {Object.keys(categoryTotals).length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">ไม่มีสถิติสำหรับเดือนนี้</div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(categoryTotals)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .map(([cat, val]) => {
                            const total = val as number;
                            const pct = (total / totalExpense) * 100;
                            return (
                              <div key={cat} className="flex items-center justify-between">
                                <div className="space-y-1 w-2/3">
                                  <div className="text-xs font-semibold text-slate-700 truncate">{cat}</div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-slate-800">{formatCurrency(total)}</span>
                                  <p className="text-[10px] text-slate-400 font-mono font-bold">{pct.toFixed(0)}%</p>
                                </div>
                              </div>
                            );
                          })}

                        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between font-medium">
                          <span>ส่วนที่จ่ายมากที่สุด:</span>
                          <span className="font-bold text-rose-600">{maxExpenseCategory.cat} ({formatCurrency(maxExpenseCategory.val as number)})</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent Transactions List */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-2 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-base text-slate-800">
                        รายการล่าสุดของเดือนนี้ ({getMonthLabel(selectedMonth)})
                      </h3>
                      <button
                        id="btn-view-all-tx"
                        onClick={() => setActiveTab('transactions')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        ดูทั้งหมด ({filteredTxs.length})
                      </button>
                    </div>

                    {filteredTxs.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">ไม่มีรายการธุรกรรมใดๆ ในเดือนนี้</div>
                    ) : (
                      <div className="space-y-3.5 max-h-80 overflow-y-auto">
                        {filteredTxs.slice(0, 5).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{tx.description}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                  <span>{formatDate(tx.date)}</span>
                                  <span>•</span>
                                  <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[9px] text-slate-650">
                                    {tx.category}
                                  </span>
                                  {tx.userName && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-600">บันทึกโดย: {tx.userName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. ACCOUNTS VIEW */}
            {activeTab === 'accounts' && (
              <motion.div
                id="accounts-tab"
                key="accounts"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">แหล่งเงินออม & บัตรเครดิต</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      ระบุสมุดบัญชีเงินออมสำหรับการใช้จ่าย หรือสร้างบัตรเครดิตพร้อมใส่อัตราดอกเบี้ยและวงเงินคงเหลือ
                    </p>
                  </div>
                  <button
                    id="btn-add-account-open"
                    onClick={() => setShowAddAccountModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 text-xs transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> สร้างแหล่งเงิน/บัตรใหม่
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Savings Accounts List */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-4">
                      <PiggyBank className="w-5 h-5 text-emerald-600" /> บัญชีเงินออม & เงินสด
                    </h3>

                    {accounts.filter(a => a.type === 'savings').length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-sm font-medium">ยังไม่มีข้อมูลบัญชีเงินออม</div>
                    ) : (
                      <div className="space-y-4">
                        {accounts
                          .filter((a) => a.type === 'savings')
                          .map((acc) => (
                            <div
                              key={acc.id}
                              onClick={() => setSelectedAccountDetails(acc)}
                              className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm cursor-pointer transition-all hover:shadow-md"
                              title="คลิกเพื่อดูประวัติการเคลื่อนไหวของบัญชี"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-550/10 text-emerald-600 rounded-xl flex items-center justify-center">
                                  <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-slate-700">{acc.name}</p>
                                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">ประเภท: บัญชีสะสมทรัพย์</span>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <p className="text-base font-extrabold text-emerald-600">{formatCurrency(acc.balance)}</p>
                                  <span className="text-[9px] text-slate-400">ยอดอัปเดตล่าสุด</span>
                                </div>
                                <button
                                  id={`btn-edit-acc-${acc.id}`}
                                  onClick={() => setEditingAccount(acc)}
                                  className="text-indigo-600 bg-white hover:bg-indigo-50 p-2 rounded-xl border border-indigo-100 shadow-xs transition-all active:scale-90"
                                  title="แก้ไขบัญชี"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-acc-${acc.id}`}
                                  onClick={() => handleDeleteAccount(acc)}
                                  className="text-rose-600 bg-white hover:bg-rose-50 p-2 rounded-xl border border-rose-100 shadow-xs transition-all active:scale-90"
                                  title="ลบบัญชี"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Credit Cards List */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-4">
                      <CreditCard className="w-5 h-5 text-indigo-600" /> บัตรเครดิต & วงเงินกู้
                    </h3>

                    {accounts.filter(a => a.type === 'credit_card').length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-sm font-medium">ยังไม่มีข้อมูลบัตรเครดิต</div>
                    ) : (
                      <div className="space-y-4">
                        {accounts
                          .filter((a) => a.type === 'credit_card')
                          .map((acc) => {
                            const debt = (acc.limit || 0) - acc.balance;
                            const pctUsed = acc.limit ? ((debt / acc.limit) * 100) : 0;

                            return (
                              <div
                                key={acc.id}
                                onClick={() => setSelectedAccountDetails(acc)}
                                className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl space-y-3 shadow-sm cursor-pointer transition-all hover:shadow-md"
                                title="คลิกเพื่อดูประวัติการเคลื่อนไหวของบัตรเครดิต"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                      <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm text-slate-700">{acc.name}</p>
                                      <div className="flex gap-2 text-[10px] text-slate-500">
                                        <span>ตัดรอบบิลทุกวันที่: <strong className="text-slate-700">{acc.statementDate}</strong></span>
                                        <span>•</span>
                                        <span>ดอกเบี้ย: <strong className="text-slate-700">{acc.interestRate}% ต่อปี</strong></span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-400">วงเงินคงเหลือ</p>
                                      <p className="text-sm font-extrabold text-amber-600">{formatCurrency(acc.balance)}</p>
                                    </div>
                                    <button
                                      id={`btn-edit-card-${acc.id}`}
                                      onClick={() => setEditingAccount(acc)}
                                      className="text-indigo-600 bg-white hover:bg-indigo-50 p-2 rounded-xl border border-indigo-100 shadow-xs transition-all active:scale-90"
                                      title="แก้ไขบัตร"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      id={`btn-delete-card-${acc.id}`}
                                      onClick={() => handleDeleteAccount(acc)}
                                      className="text-rose-600 bg-white hover:bg-rose-50 p-2 rounded-xl border border-rose-100 shadow-xs transition-all active:scale-90"
                                      title="ลบบัตร"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Credit Limit progress bar */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                                    <span>ยอดหนี้ใช้ไป: {formatCurrency(debt)} ({pctUsed.toFixed(0)}%)</span>
                                    <span>วงเงินเต็ม: {formatCurrency(acc.limit || 0)}</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pctUsed}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. TRANSACTIONS VIEW */}
            {activeTab === 'transactions' && (
              <motion.div
                id="transactions-tab"
                key="transactions"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">บันทึกรายรับรายจ่าย</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      บันทึกรายรับหรือรายจ่ายแบบกำหนดเอง หรือใช้ AI แสกนรูปใบเสร็จเพื่อวิเคราะห์อัตโนมัติ
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="btn-manage-cats-main"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 text-xs transition-all border border-slate-200 shadow-sm active:scale-95"
                    >
                      <span className="text-sm">🏷️</span> เพิ่ม/จัดการหมวดหมู่
                    </button>
                    <button
                      id="btn-transfer-open"
                      onClick={() => setShowTransferModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 text-xs transition-all active:scale-95 shadow-sm"
                    >
                      <ArrowRightLeft className="w-4 h-4" /> โอนเงินระหว่างบัญชี
                    </button>
                    <button
                      id="btn-add-tx-open"
                      onClick={() => setShowAddTxModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 text-xs transition-all active:scale-95 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มรายรับ-จ่ายใหม่
                    </button>
                  </div>
                </div>

                {/* Receipt scanner integration */}
                <ReceiptScanner
                  user={user}
                  profile={profile}
                  accounts={accounts}
                  customCategories={customCategories}
                  onScanComplete={handleScanComplete}
                />

                {/* Transaction history section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base text-slate-800">
                      ประวัติการเงินเดือนนี้ ({getMonthLabel(selectedMonth)})
                    </h3>
                  </div>

                  {filteredTxs.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">ไม่มีข้อมูลการทำธุรกรรมในเดือนนี้</div>
                  ) : (
                    <div className="space-y-3.5">
                      {filteredTxs.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              tx.type === 'income' ? 'bg-emerald-550/10 text-emerald-650' : 'bg-rose-50 text-rose-500'
                            }`}>
                              {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-750">{tx.description}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <span className="font-semibold">{formatDate(tx.date)}</span>
                                <span>•</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-medium">
                                  {tx.category}
                                </span>
                                {tx.userName && (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-600 font-semibold">บันทึกโดย: {tx.userName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-base font-extrabold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </p>
                            </div>
                            <button
                              id={`btn-edit-tx-${tx.id}`}
                              onClick={() => setEditingTransaction(tx)}
                              className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-xl border border-indigo-100 transition-all active:scale-90"
                              title="แก้ไขรายการ"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              id={`btn-delete-tx-${tx.id}`}
                              onClick={() => {
                                requestConfirm(
                                  'ลบรายการธุรกรรม',
                                  'คุณต้องการลบรายการธุรกรรมนี้ใช่หรือไม่? ยอดคงเหลือของบัญชีจะถูกปรับย้อนกลับอัตโนมัติ',
                                  async () => {
                                    try {
                                      const result = await deleteTransaction(user.uid, tx);
                                      applyDeletedTransaction(tx, result?.balance);
                                      addNotification(user.uid, `ลบรายการ "${tx.description || tx.category}" สำเร็จ`, 'success');
                                    } catch (err) {
                                      console.error(err);
                                      alert('เกิดข้อผิดพลาดในการลบรายการธุรกรรม');
                                    }
                                  },
                                  true
                                );
                              }}
                              className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-2 rounded-xl border border-rose-100 transition-all active:scale-90"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 4. RECURRING VIEW */}
            {activeTab === 'recurring' && (
              <motion.div
                id="recurring-tab"
                key="recurring"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800">ระบบรายรับประจำเดือน & การจ่ายรายเดือนคงที่</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    จัดการทิศทางการไหลเวียนของกระแสเงินสดหลัก (Cash Flow) ของคุณหรือครอบครัว ตั้งแต่วางแผนรายรับประจำเดือนและการผ่อนชำระผ่านช่องทางต่าง ๆ
                  </p>
                </div>

                {/* 1. SECTION: RECURRING INCOMES */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" /> รายรับประจำเดือน & เงินเดือนคงที่
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ตั้งค่ารายรับประจำ เช่น เงินเดือนหลัก ค่าโอที (OT) ค่าคอมมิชชั่น ค่าอินเซนทีฟ และรายได้เสริม/ฟรีแลนซ์ ระบบจะบันทึกรายรับเข้าบัญชีให้โดยอัตโนมัติเมื่อถึงกำหนดในแต่ละเดือน
                      </p>
                    </div>
                    <button
                      id="btn-add-rec-income-open"
                      onClick={() => setShowAddRecIncomeModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 text-xs transition-all active:scale-95 shadow-sm shrink-0 self-start md:self-center"
                    >
                      <Plus className="w-4 h-4" /> ตั้งค่ารายรับประจำ
                    </button>
                  </div>

                  {recurringIncomes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-100 rounded-xl">
                      ยังไม่มีการเพิ่มรายการรับรายเดือน (เช่น เงินเดือน หรือฟรีแลนซ์ประจำ)
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recurringIncomes.map((item) => {
                        const targetAcc = accounts.find((a) => a.id === item.accountId);

                        return (
                          <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                                <TrendingUp className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-sm text-slate-750">{item.name}</p>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                  <span>บัญชีปลายทาง: <strong className="text-slate-700">{targetAcc?.name || 'ไม่ได้ระบุ'}</strong></span>
                                  <span>•</span>
                                  <span>เงินออกทุกวันที่: <strong className="text-indigo-600">{item.dayOfMonth} ของเดือน</strong></span>
                                </div>
                                
                                {/* Breakdowns of fields */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {item.baseSalary > 0 && (
                                    <span className="bg-slate-200/80 px-2 py-0.5 rounded text-[10px] text-slate-600 font-medium">
                                      เงินเดือนหลัก: {formatCurrency(item.baseSalary)}
                                    </span>
                                  )}
                                  {item.ot > 0 && (
                                    <span className="bg-amber-50 px-2 py-0.5 rounded text-[10px] text-amber-700 font-medium border border-amber-100">
                                      OT: {formatCurrency(item.ot)}
                                    </span>
                                  )}
                                  {item.commission > 0 && (
                                    <span className="bg-emerald-50 px-2 py-0.5 rounded text-[10px] text-emerald-700 font-medium border border-emerald-100">
                                      ค่าคอมฯ: {formatCurrency(item.commission)}
                                    </span>
                                  )}
                                  {item.incentive > 0 && (
                                    <span className="bg-blue-50 px-2 py-0.5 rounded text-[10px] text-blue-700 font-medium border border-blue-100">
                                      อินเซนทีฟ: {formatCurrency(item.incentive)}
                                    </span>
                                  )}
                                  {item.freelanceIncome > 0 && (
                                    <span className="bg-purple-50 px-2 py-0.5 rounded text-[10px] text-purple-700 font-medium border border-purple-100">
                                      ฟรีแลนซ์: {formatCurrency(item.freelanceIncome)}
                                    </span>
                                  )}
                                  {item.otherIncome > 0 && (
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-medium">
                                      รายได้อื่นๆ: {formatCurrency(item.otherIncome)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-3 md:pt-0 border-slate-200 shrink-0">
                              <div className="text-left md:text-right">
                                <p className="text-sm font-extrabold text-slate-850">ยอดรวม {formatCurrency(item.totalAmount)} / เดือน</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  สถานะเดือนนี้: {item.lastTriggeredMonth === new Date().toISOString().substring(0, 7) ? (
                                    <span className="text-emerald-650 font-bold">✓ บันทึกอัตโนมัติแล้ว</span>
                                  ) : (
                                    <span className="text-amber-500 font-bold">รอตัดยอดอัตโนมัติ</span>
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  id={`btn-charge-rec-inc-${item.id}`}
                                  onClick={() => handleTriggerRecurringIncome(item)}
                                  className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold py-2 px-3.5 rounded-xl transition-all shadow-sm ring-1 ring-emerald-200"
                                >
                                  รับเงินเลย
                                </button>
                                <button
                                  id={`btn-edit-rec-inc-${item.id}`}
                                  onClick={() => setEditingRecurringIncome(item)}
                                  className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-xl border border-indigo-100 transition-all active:scale-90"
                                  title="แก้ไขรายรับประจำ"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  id={`btn-delete-rec-inc-${item.id}`}
                                  onClick={() => {
                                    requestConfirm(
                                      'ยกเลิกรายการรับประจำ',
                                      `ต้องการยกเลิกการตั้งรายรับประจำเดือนนี้ "${item.name}" ใช่หรือไม่?`,
                                      async () => {
                                        try {
                                          await deleteRecurringIncome(user.uid, item.id);
                                          applyDeletedRecurringIncome(item.id);
                                          addNotification(user.uid, `ยกเลิกรายการรับประจำ "${item.name}" สำเร็จ`, 'success');
                                        } catch (err) {
                                          console.error(err);
                                          alert('เกิดข้อผิดพลาดในการลบรายการ');
                                        }
                                      },
                                      true
                                    );
                                  }}
                                  className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-2 rounded-xl border border-rose-100 transition-all active:scale-90"
                                  title="ลบรายรับประจำ"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. SECTION: RECURRING EXPENSES */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" /> ตารางรายการจ่ายรายเดือน/การผ่อนชำระปัจจุบัน
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ตั้งงบการผ่อนชำระ 0% หรือค่าบริการรายเดือน (Subscription) ระบบจะสามารถช่วยตัดยอดเงินล่วงหน้าโดยใช้บัตรเครดิตหรือบัญชีออมทรัพย์ที่ระบุไว้
                      </p>
                    </div>
                    <button
                      id="btn-add-rec-open"
                      onClick={() => setShowAddRecurringModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 text-xs transition-all active:scale-95 shadow-sm shrink-0 self-start md:self-center"
                    >
                      <Plus className="w-4 h-4" /> เพิ่มรายการจ่ายประจำ
                    </button>
                  </div>

                  {recurring.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm font-medium">ยังไม่มีการเพิ่มรายการจ่ายรายเดือนคงที่</div>
                  ) : (
                    <div className="space-y-4">
                      {recurring.map((item) => {
                        const paidAcc = accounts.find((a) => a.id === item.accountId);

                        return (
                          <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center shrink-0">
                                <RefreshCw className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-750">{item.name}</p>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                                  <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] text-slate-600 font-medium">
                                    {item.category}
                                  </span>
                                  <span>•</span>
                                  <span>ชำระผ่าน: <strong className="text-slate-700">{item.paymentMethod === 'cash' ? 'เงินสด/บัญชีออมทรัพย์' : 'บัตรเครดิต'}</strong> ({paidAcc?.name || 'ไม่ได้ระบุ'})</span>
                                  {item.isInstallment && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-600 font-bold">ผ่อนชำระ 0% {item.installmentMonths} เดือน</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-3 md:pt-0 border-slate-200">
                              <div className="text-left md:text-right">
                                <p className="text-sm font-extrabold text-slate-800">{formatCurrency(item.amount)} / เดือน</p>
                                <p className="text-[10px] text-slate-400 font-medium">ครบกำหนดถัดไป: {item.nextDueDate}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  id={`btn-charge-rec-${item.id}`}
                                  onClick={() => handleTriggerRecurringPayment(item)}
                                  className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold py-2 px-3.5 rounded-xl transition-all shadow-sm ring-1 ring-emerald-200"
                                >
                                  จ่ายเลย
                                </button>
                                <button
                                  id={`btn-edit-rec-${item.id}`}
                                  onClick={() => setEditingRecurringExpense(item)}
                                  className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-xl border border-indigo-100 transition-all active:scale-90"
                                  title="แก้ไขรายการประจำ"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  id={`btn-delete-rec-${item.id}`}
                                  onClick={() => {
                                    requestConfirm(
                                      'ยกเลิกรายการจ่ายประจำ',
                                      `ต้องการยกเลิกการผ่อนชำระ / ค่าใช้จ่ายรายเดือน "${item.name}" ใช่หรือไม่?`,
                                      async () => {
                                        try {
                                          await deleteRecurringExpense(user.uid, item.id);
                                          applyDeletedRecurringExpense(item.id);
                                          addNotification(user.uid, `ยกเลิกรายการจ่ายประจำ "${item.name}" สำเร็จ`, 'success');
                                        } catch (err) {
                                          console.error(err);
                                          alert('เกิดข้อผิดพลาดในการลบรายการ');
                                        }
                                      },
                                      true
                                    );
                                  }}
                                  className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-2 rounded-xl border border-rose-100 transition-all active:scale-90"
                                  title="ลบรายการประจำ"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 5. BUDGETS VIEW */}
            {activeTab === 'budgets' && (
              <motion.div
                id="budgets-tab"
                key="budgets"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800">ตั้งแผนงบประมาณการใช้เงิน</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    กำหนดขีดจำกัดการใช้เงินในแต่ละส่วนอย่างแม่นยำ พร้อมรับสเตตัสการแจ้งเตือนสัญญานเตือนล่วงหน้าเมื่อจ่ายเงินใกล้เต็มขีดจำกัด
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-base text-slate-800 mb-6">ตั้งงบประมาณรายหมวดหมู่ (หมวดหมู่รายจ่าย)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getBudgetCategories().map((category) => (
                      <BudgetCategoryItem
                        key={category}
                        category={category}
                        budgets={budgets}
                        selectedMonth={selectedMonth}
                        user={user}
                        profile={profile}
                        requestConfirm={requestConfirm}
                        onBudgetSaved={applySavedBudget}
                        onBudgetDeleted={applyDeletedBudget}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. FAMILY VIEW */}
            {activeTab === 'family' && (
              <motion.div
                id="family-tab"
                key="family"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-800">ระบบจัดการรายจ่ายร่วมครอบครัว</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    เชื่อมสมาชิกครอบครัวเข้าสู่ระบบบัญชีเดียวกัน ทุกคนสามารถอัปโหลดใบเสร็จ สแกนข้อมูล และบันทึกประวัติการเงินร่วมกันเพื่อวางแผนได้อย่างมีประสิทธิภาพ
                  </p>
                </div>

                {/* Invitations Section */}
                {invitations.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-base text-amber-700 flex items-center gap-2 mb-4">
                      <UserPlus className="w-5 h-5" /> คำเชิญเข้าร่วมครอบครัวที่รอดำเนินการ
                    </h3>
                    <div className="space-y-3">
                      {invitations.map((invite) => (
                        <div key={invite.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-slate-750">
                              คุณได้รับการเชิญเข้าร่วมครอบครัว "{invite.familyName}"
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">ส่งคำเชิญโดย: {invite.senderName}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              id={`btn-accept-invite-${invite.id}`}
                              onClick={async () => {
                                await respondToInvitation(user.uid, profile?.email || '', invite.id, true);
                                alert('เข้าร่วมครอบครัวสำเร็จ!');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-sm"
                            >
                              ยอมรับคำขอ
                            </button>
                            <button
                              id={`btn-decline-invite-${invite.id}`}
                              onClick={async () => {
                                await respondToInvitation(user.uid, profile?.email || '', invite.id, false);
                              }}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition-all"
                            >
                              ปฏิเสธ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!family ? (
                  /* No Family Setup Section */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="font-bold text-base text-slate-800 mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" /> เริ่มสร้างครอบครัวของคุณ
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        เริ่มต้นสร้างความโปร่งใสในเรื่องเงินๆ ทองๆ ร่วมกันในครอบครัวโดยการสร้างกลุ่มใหม่ในวันนี้
                      </p>
                      
                      <form onSubmit={handleCreateFamily} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-750 font-semibold block">ระบุชื่อครอบครัว</label>
                          <input
                            type="text"
                            required
                            placeholder="เช่น ครอบครัวสมาร์ทแฮปปี้"
                            value={familyJoinName}
                            onChange={(e) => setFamilyJoinName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                          />
                        </div>
                        <button
                          id="btn-create-family"
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm"
                        >
                          สร้างกลุ่มครอบครัว
                        </button>
                      </form>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="font-bold text-base text-slate-800 mb-2">เชื่อมต่อผ่าน Google</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                        หลังจากได้รับการเชิญเข้าร่วมครอบครัวจากหัวหน้ากลุ่มแล้ว ระบบจะเพิ่มท่านเข้าสู่กลุ่มครอบครัวเพื่อทำงานร่วมกันอย่างอัตโนมัติ
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Active Family Dashboard */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Panel: Members & Invitations */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-1 space-y-6 shadow-sm">
                      <div>
                        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-1">
                          <Users className="w-5 h-5 text-indigo-600" /> สมาชิกในครอบครัว ({family.members.length} คน)
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">กลุ่ม: {family.name}</span>
                      </div>

                      <div className="space-y-3.5">
                        {family.members.map((member, idx) => {
                          const prof = memberProfiles[member];
                          const displayName = prof ? (prof.displayName || prof.email) : member;
                          const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
                          const isMe = member === user.uid;

                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center border border-slate-200">
                                {initial}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-slate-700 truncate">
                                  {displayName} {isMe && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full ml-1">ฉัน</span>}
                                </span>
                                {prof && prof.email && prof.displayName && (
                                  <span className="text-[10px] text-slate-450 truncate">{prof.email}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Invite Form */}
                      <form onSubmit={handleInviteFamily} className="space-y-3 pt-4 border-t border-slate-150">
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-750 font-semibold block">เชิญสมาชิกเพิ่ม (ระบุ Google Account / อีเมล)</label>
                          <input
                            type="email"
                            required
                            placeholder="เช่น somjai@gmail.com"
                            value={familyInviteEmail}
                            onChange={(e) => setFamilyInviteEmail(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                          />
                        </div>
                        <button
                          id="btn-invite-member"
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-xl text-xs transition-all shadow-sm"
                        >
                          ส่งคำเชิญร่วมกลุ่ม
                        </button>
                      </form>

                      {/* Leave Family */}
                      <button
                        id="btn-leave-family"
                        onClick={() => {
                          requestConfirm(
                            'ออกจากครอบครัว',
                            'คุณแน่ใจหรือไม่ว่าต้องการออกจากกลุ่มครอบครัวปัจจุบัน?',
                            async () => {
                              await leaveFamily(user.uid, family.id);
                              alert('ออกจากครอบครัวเรียบร้อยแล้ว');
                            },
                            true
                          );
                        }}
                        className="w-full py-2 border border-red-200 text-red-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition-colors"
                      >
                        ออกจากกลุ่มครอบครัวนี้
                      </button>
                    </div>

                    {/* Right Panel: Shared Reports & Analytics */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-2 space-y-6 shadow-sm">
                      <h3 className="font-bold text-base text-slate-800">สรุปผลการแชร์รายรับรายจ่ายในครอบครัว</h3>
                      
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="text-xs text-slate-500 font-semibold">เงินเก็บส่วนรวมของครอบครัวสะสม</p>
                          <p className="text-2xl font-black text-emerald-600 mt-1">
                            {formatCurrency(accounts.filter(a => a.type === 'savings').reduce((sum, a) => sum + a.balance, 0))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-semibold">ค่าใช้จ่ายรวมเดือนนี้</p>
                          <p className="text-xl font-extrabold text-rose-500 mt-1">{formatCurrency(totalExpense)}</p>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <h4 className="text-xs text-slate-700 font-bold uppercase tracking-wider">สถิติค่าใช้จ่ายรายคนในเดือนนี้</h4>
                        {family.members.map((member, idx) => {
                          const prof = memberProfiles[member];
                          const displayName = prof ? (prof.displayName || prof.email) : member;

                          const memberSpent = filteredTxs
                            .filter((t) => t.type === 'expense' && (t.userId === member || t.userName.includes(member)))
                            .reduce((sum, t) => sum + t.amount, 0);

                          const pct = totalExpense > 0 ? (memberSpent / totalExpense) * 100 : 0;

                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-600">{displayName}</span>
                                <span className="text-slate-500">{formatCurrency(memberSpent)} ({pct.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* --- ADD SOURCE/CREDIT CARD MODAL --- */}
      <AnimatePresence>
        {selectedAccountDetails && (() => {
          const acc = accounts.find(a => a.id === selectedAccountDetails.id);
          if (!acc) return null;
          const isCard = acc.type === 'credit_card';
          const filteredTxs = transactions.filter(t => t.accountId === acc.id);

          return (
            <div id="account-history-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border border-slate-200 max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-xl flex flex-col max-h-[90vh]"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                      {isCard ? <CreditCard className="w-5 h-5 text-indigo-600" /> : <Wallet className="w-5 h-5 text-emerald-600" />}
                      ประวัติความเคลื่อนไหวบัญชี
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">{acc.name} ({isCard ? 'บัตรเครดิต' : 'บัญชีสะสมทรัพย์/เงินสด'})</p>
                  </div>
                  <button
                    onClick={() => setSelectedAccountDetails(null)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Account Summary Status */}
                <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-2 gap-4 border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">ยอดเงินคงเหลือ/วงเงินคงเหลือ</p>
                    <p className={`text-lg font-extrabold ${isCard ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatCurrency(acc.balance)}
                    </p>
                  </div>
                  {isCard && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">วงเงินเต็ม / ยอดหนี้ใช้ไป</p>
                      <p className="text-xs font-bold text-slate-700">
                        {formatCurrency(acc.limit || 0)} / <span className="text-rose-500">{formatCurrency((acc.limit || 0) - acc.balance)}</span>
                      </p>
                    </div>
                  )}
                  {!isCard && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">ประเภทแหล่งเงิน</p>
                      <p className="text-xs font-semibold text-slate-600">💰 บัญชีออมทรัพย์ & เงินสด</p>
                    </div>
                  )}
                </div>

                {/* Movements List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[250px] pr-1">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">ประวัติรายการธุรกรรม ({filteredTxs.length})</h4>
                  {filteredTxs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                      ไม่มีประวัติรายการเคลื่อนไหวสำหรับบัญชีนี้
                    </div>
                  ) : (
                    filteredTxs
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((tx) => (
                        <div key={tx.id} className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-300 transition-all">
                          <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div>
                              <p className="text-xs font-bold text-slate-700">{tx.description || tx.category}</p>
                              <div className="flex gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                                <span className="font-semibold text-slate-500">{tx.category}</span>
                                <span>•</span>
                                <span>{tx.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-extrabold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                            <button
                              onClick={() => {
                                setSelectedAccountDetails(null);
                                setEditingTransaction(tx);
                              }}
                              className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg border border-indigo-100 transition-all active:scale-90"
                              title="แก้ไขรายการ"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                requestConfirm(
                                  'ลบรายการธุรกรรม',
                                  `คุณต้องการลบรายการ "${tx.description || tx.category}" ยอดเงิน ${formatCurrency(tx.amount)} ใช่หรือไม่? ยอดคงเหลือของบัญชีจะถูกปรับย้อนกลับอัตโนมัติ`,
                                  async () => {
                                    try {
                                      const result = await deleteTransaction(user.uid, tx);
                                      applyDeletedTransaction(tx, result?.balance);
                                      addNotification(user.uid, `ลบรายการธุรกรรมและปรับยอดเงินย้อนกลับสำเร็จ`, 'success');
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  },
                                  true
                                );
                              }}
                              className="text-rose-600 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border border-rose-100 transition-all active:scale-90"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setSelectedAccountDetails(null)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {editingAccount && (
          <div id="edit-account-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="font-extrabold text-lg text-slate-800">แก้ไขแหล่งเงิน / บัตรเครดิต</h3>
              
              <form onSubmit={handleUpdateAccount} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ประเภทแหล่งเงิน (ไม่สามารถเปลี่ยนได้)</label>
                  <input
                    type="text"
                    disabled
                    value={editingAccount.type === 'savings' ? '💰 บัญชีสะสมทรัพย์ / เงินสด' : '💳 บัตรเครดิต'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 focus:outline-none cursor-not-allowed font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ชื่อแหล่งเงิน / ชื่อบัตร</label>
                  <input
                    type="text"
                    required
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                {editingAccount.type === 'savings' ? (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ยอดเงินคงเหลือในบัญชี (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editingAccount.balance || ''}
                      onChange={(e) => setEditingAccount({ ...editingAccount, balance: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">วงเงินบัตร (บาท)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editingAccount.limit || ''}
                          onChange={(e) => setEditingAccount({ ...editingAccount, limit: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">วงเงินที่เหลือใช้งานจริง</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editingAccount.balance || ''}
                          onChange={(e) => setEditingAccount({ ...editingAccount, balance: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">อัตราดอกเบี้ย (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={editingAccount.interestRate || ''}
                          onChange={(e) => setEditingAccount({ ...editingAccount, interestRate: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">วันที่ตัดรอบบัตร (1-28)</label>
                        <input
                          type="number"
                          min="1"
                          max="28"
                          value={editingAccount.statementDate || ''}
                          onChange={(e) => setEditingAccount({ ...editingAccount, statementDate: e.target.value === '' ? 0 : parseInt(e.target.value) || 15 })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-edit-account-cancel"
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-edit-account-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingTransaction && (
          <div id="edit-tx-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="font-extrabold text-lg text-slate-800">แก้ไขรายการรายรับรายจ่าย</h3>
              
              <form onSubmit={handleUpdateTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditingTransaction({ ...editingTransaction, type: 'expense' })}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      editingTransaction.type === 'expense'
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายจ่าย (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTransaction({ ...editingTransaction, type: 'income' })}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      editingTransaction.type === 'income'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายรับ (Income)
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={editingTransaction.amount || ''}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">เลือกบัญชีเงินออม / บัตรเครดิต</label>
                  <select
                    value={editingTransaction.accountId}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, accountId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="">-- เลือกบัญชี --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.type === 'savings' ? '💰' : '💳'} {acc.name} (คงเหลือ: {formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">หมวดหมู่รายการ</label>
                  <select
                    value={editingTransaction.category}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  >
                    {editingTransaction.type === 'income'
                      ? withCurrentCategory(getIncomeCategories(), editingTransaction.category).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))
                      : withCurrentCategory(getExpenseCategories(), editingTransaction.category).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">วันที่ทำรายการ</label>
                  <input
                    type="date"
                    required
                    value={editingTransaction.date}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">บันทึกเพิ่มเติม (ชื่อรายการ)</label>
                  <input
                    type="text"
                    placeholder="เช่น ซื้อของกินเล่น หรือ เงินเดือนเข้า"
                    value={editingTransaction.description}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-edit-tx-cancel"
                    type="button"
                    onClick={() => setEditingTransaction(null)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-edit-tx-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    บันทึกข้อมูลใหม่
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingRecurringExpense && (
          <div id="edit-recurring-expense-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="font-extrabold text-lg text-slate-800">แก้ไขแผนจ่ายเงินประจำเดือน / การผ่อน</h3>
              
              <form onSubmit={handleUpdateRecurringExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ชื่อรายการประจำ / ชื่อสัญญารายเดือน</label>
                  <input
                    type="text"
                    required
                    value={editingRecurringExpense.name}
                    onChange={(e) => setEditingRecurringExpense({ ...editingRecurringExpense, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">จำนวนเงินต่อเดือน (บาท)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={editingRecurringExpense.amount || ''}
                    onChange={(e) => setEditingRecurringExpense({ ...editingRecurringExpense, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">จ่ายผ่านช่องทาง</label>
                  <select
                    value={editingRecurringExpense.paymentMethod}
                    onChange={(e: any) => setEditingRecurringExpense({ ...editingRecurringExpense, paymentMethod: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  >
                    <option value="cash">💵 หักเงินสด / บัญชีออมทรัพย์</option>
                    <option value="card">💳 ตัดผ่านบัตรเครดิต</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ผูกกับบัญชีผู้ใช้ใด</label>
                  <select
                    value={editingRecurringExpense.accountId}
                    onChange={(e) => setEditingRecurringExpense({ ...editingRecurringExpense, accountId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  >
                    <option value="">-- เลือกบัญชี --</option>
                    {accounts
                      .filter((acc) => (editingRecurringExpense.paymentMethod === 'card' ? acc.type === 'credit_card' : acc.type === 'savings'))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.type === 'savings' ? '💰' : '💳'} {acc.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">หมวดหมู่</label>
                  <select
                    value={editingRecurringExpense.category}
                    onChange={(e) => setEditingRecurringExpense({ ...editingRecurringExpense, category: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  >
                    {withCurrentCategory(getExpenseCategories(), editingRecurringExpense.category).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ครบกำหนดถัดไป (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={editingRecurringExpense.nextDueDate}
                    onChange={(e) => setEditingRecurringExpense({ ...editingRecurringExpense, nextDueDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-edit-rec-cancel"
                    type="button"
                    onClick={() => setEditingRecurringExpense(null)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-edit-rec-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    บันทึกรายการ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingRecurringIncome && (
          <div id="edit-recurring-income-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-extrabold text-lg text-slate-800">แก้ไขแผนกระแสรายรับประจำครอบครัว</h3>
              
              <form onSubmit={handleUpdateRecurringIncome} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ชื่อแผนรับเงิน / งานหลัก</label>
                  <input
                    type="text"
                    required
                    value={editingRecurringIncome.name}
                    onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">บัญชีธนาคารปลายทางเพื่อรับเงินฝาก</label>
                  <select
                    value={editingRecurringIncome.accountId}
                    onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, accountId: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="">-- เลือกบัญชีธนาคาร --</option>
                    {accounts.filter(a => a.type === 'savings').map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        💰 {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">เงินเดือนหลัก (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRecurringIncome.baseSalary || ''}
                      onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, baseSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ค่าล่วงเวลา / OT (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRecurringIncome.ot || ''}
                      onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, ot: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ค่าคอมมิชชั่น (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRecurringIncome.commission || ''}
                      onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, commission: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">Incentive / โบนัสสั้น (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRecurringIncome.incentive || ''}
                      onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, incentive: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">รายได้จากเสริม/Freelance</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRecurringIncome.freelanceIncome || ''}
                      onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, freelanceIncome: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">รายรับพิเศษอื่นๆ</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRecurringIncome.otherIncome || ''}
                      onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, otherIncome: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">วันจ่ายเงินเดือนของทุกเดือน (1-31)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={editingRecurringIncome.dayOfMonth || ''}
                    onChange={(e) => setEditingRecurringIncome({ ...editingRecurringIncome, dayOfMonth: e.target.value === '' ? 0 : parseInt(e.target.value) || 25 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-edit-rec-inc-cancel"
                    type="button"
                    onClick={() => setEditingRecurringIncome(null)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-edit-rec-inc-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddAccountModal && (
          <div id="add-account-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="font-extrabold text-lg text-slate-800">สร้างแหล่งเงินออม / บัตรเครดิต</h3>
              
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ประเภทแหล่งเงิน</label>
                  <select
                    value={newAccType}
                    onChange={(e: any) => setNewAccType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="savings">💰 บัญชีธนาคาร / เงินสด</option>
                    <option value="credit_card">💳 บัตรเครดิต (พร้อมระบุวงเงินและวันตัดรอบ)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ชื่อแหล่งเงิน / ชื่อบัตร</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น บัญชีธนาคาร KBank, เงินสดกระเป๋า หรือ บัตรเครดิต K-Class"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {newAccType === 'savings' ? (
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ตั้งต้นค่าคงเหลือในบัญชี (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newAccBalance}
                      onChange={(e) => setNewAccBalance(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">วงเงินบัตร (บาท)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={newAccLimit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewAccLimit(val);
                            // Default starting balance to be equal to full limit if not edited yet
                            if (newAccBalance === '') setNewAccBalance(val);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">วงเงินที่เหลือใช้งานจริง</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={newAccBalance}
                          onChange={(e) => setNewAccBalance(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">อัตราดอกเบี้ย (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={newAccInterest}
                          onChange={(e) => setNewAccInterest(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-700 font-semibold block">วันที่ตัดรอบบัตร (1-28)</label>
                        <input
                          type="number"
                          min="1"
                          max="28"
                          value={newAccStatementDate}
                          onChange={(e) => setNewAccStatementDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-add-account-cancel"
                    type="button"
                    onClick={() => setShowAddAccountModal(false)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-add-account-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    สร้างแหล่งเงิน
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MANAGE CUSTOM CATEGORIES MODAL --- */}
      <AnimatePresence>
        {showAddCategoryModal && (
          <div id="manage-categories-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl border border-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <span>🏷️</span> ประเภทรายการที่กำหนดเอง
                </h3>
                <button
                  id="btn-close-manage-cats-modal"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-50 hover:bg-slate-100 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>

              {/* List of current custom categories */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รายการที่คุณสร้างไว้</p>
                {customCategories.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                    ยังไม่มีประเภทรายการที่เพิ่มเอง เริ่มสร้างประเภทใหม่ได้ด้านล่างนี้!
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {customCategories.map((cat) => {
                      const isEditing = editingCategory?.id === cat.id;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-all"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              <span className={`w-2 h-2 rounded-full ${cat.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <input
                                type="text"
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 flex-1 font-semibold"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomCategory(cat.id, editCategoryName)}
                                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold px-2.5 py-1 rounded-lg text-[10px]"
                              >
                                บันทึก
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-2.5 py-1 rounded-lg text-[10px]"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${cat.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                                <span className="text-[9px] font-medium bg-white border border-slate-150 px-1.5 py-0.5 rounded text-slate-500 uppercase">
                                  {cat.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  id={`btn-edit-cat-${cat.id}`}
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setEditCategoryName(cat.name);
                                  }}
                                  className="text-slate-400 hover:text-indigo-650 p-1.5 rounded-lg hover:bg-white transition-all"
                                  title="แก้ไขชื่อประเภท"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-cat-${cat.id}`}
                                  onClick={() => handleDeleteCustomCategory(cat.id, cat.name)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-all"
                                  title="ลบประเภทรายการ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add form */}
              <form onSubmit={handleCreateCustomCategory} className="border-t border-slate-100 pt-4 space-y-3 flex-shrink-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">สร้างประเภทรายการใหม่</p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ชื่อประเภทใหม่</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ค่านมลูก, ค่าซ่อมบ้าน"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ประเภททางการเงิน</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        id="btn-cat-type-expense"
                        onClick={() => setNewCatType('expense')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                          newCatType === 'expense'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        รายจ่าย (Expense)
                      </button>
                      <button
                        type="button"
                        id="btn-cat-type-income"
                        onClick={() => setNewCatType('income')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                          newCatType === 'income'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        รายรับ (Income)
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  id="btn-add-cat-submit"
                  type="submit"
                  className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> บันทึกประเภทรายการใหม่
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MONEY TRANSFER MODAL --- */}
      <AnimatePresence>
        {showTransferModal && (
          <div id="transfer-money-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                  โอนเงินระหว่างบัญชี
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-bold block">บัญชีต้นทาง (หักเงิน)</label>
                  <select
                    required
                    value={transferFromId}
                    onChange={(e) => setTransferFromId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- เลือกบัญชีต้นทาง --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type === 'credit_card' ? 'บัตรเครดิต' : 'เงินสด/ออมทรัพย์'}) - {formatCurrency(acc.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-bold block">บัญชีปลายทาง (รับเงิน)</label>
                  <select
                    required
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- เลือกบัญชีปลายทาง --</option>
                    {accounts.filter(acc => acc.id !== transferFromId).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type === 'credit_card' ? 'บัตรเครดิต' : 'เงินสด/ออมทรัพย์'}) - {formatCurrency(acc.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-bold block">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-bold block">วันที่โอน</label>
                    <input
                      type="date"
                      required
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-bold block">บันทึกเพิ่มเติม (ไม่บังคับ)</label>
                  <input
                    type="text"
                    placeholder="เช่น โอนเงินเข้าบัญชีเก็บออม หรือ เคลียร์ยอดบัตรเครดิต"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    ยืนยันการโอนเงิน
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD TRANSACTION MODAL --- */}
      <AnimatePresence>
        {showAddTxModal && (
          <div id="add-transaction-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="font-extrabold text-lg text-slate-800">บันทึกรายการเงินใหม่</h3>
              
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    id="btn-select-expense"
                    type="button"
                    onClick={() => {
                      setTxType('expense');
                      setTxCategory(CATEGORIES.expense[0]);
                    }}
                    className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                      txType === 'expense' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายจ่าย
                  </button>
                  <button
                    id="btn-select-income"
                    type="button"
                    onClick={() => {
                      setTxType('income');
                      setTxCategory(CATEGORIES.income[0]);
                    }}
                    className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                      txType === 'income' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    รายรับ
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ยอดเงิน (บาท)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={txAmount || ''}
                    onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-700 font-semibold block">ประเภทรายการ</label>
                      <button
                        type="button"
                        id="btn-open-manage-cats-tx"
                        onClick={() => setShowAddCategoryModal(true)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        + เพิ่มประเภท
                      </button>
                    </div>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    >
                      {txType === 'income'
                        ? getIncomeCategories().map((c) => <option key={c} value={c}>{c}</option>)
                        : getExpenseCategories().map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">วันที่ทำรายการ</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ชำระผ่าน / แหล่งเงินต้นทาง</label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.type === 'savings' ? '💰' : '💳'} {acc.name} (คงเหลือ: {formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">คำอธิบายเพิ่มเติม</label>
                  <input
                    type="text"
                    placeholder="เช่น ชำระค่าอาหารกลางวัน หรือ เงินพิเศษ"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-add-tx-cancel"
                    type="button"
                    onClick={() => setShowAddTxModal(false)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-add-tx-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD RECURRING / INSTALLMENTS MODAL --- */}
      <AnimatePresence>
        {showAddRecurringModal && (
          <div id="add-recurring-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="font-extrabold text-lg text-slate-800">ตั้งจ่ายรายเดือน & ผ่อน 0%</h3>
              
              <form onSubmit={handleCreateRecurring} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ชื่อรายการจ่ายประจำ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ผ่อนเครื่องซักผ้า 0% หรือ Netflix"
                    value={recName}
                    onChange={(e) => setRecName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ยอดเงินต่อรอบ (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0"
                      value={recAmount || ''}
                      onChange={(e) => setRecAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-700 font-semibold block">หมวดหมู่</label>
                      <button
                        type="button"
                        id="btn-open-manage-cats-rec"
                        onClick={() => setShowAddCategoryModal(true)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        + เพิ่มประเภท
                      </button>
                    </div>
                    <select
                      value={recCategory}
                      onChange={(e) => setRecCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    >
                      {getExpenseCategories().map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ช่องทางชำระหลัก</label>
                    <select
                      value={recMethod}
                      onChange={(e: any) => {
                        setRecMethod(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    >
                      <option value="cash">💵 จ่ายด้วยเงินสด / เงินโอน</option>
                      <option value="card">💳 หักผ่านบัตรเครดิต</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">วันที่ต้องชำระ (วันของเดือน)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={recDueDate || ''}
                      onChange={(e) => setRecDueDate(e.target.value === '' ? 0 : parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">เลือกบัญชีเงินฝาก / บัตรเครดิตที่จะหัก</label>
                  <select
                    value={recAccountId}
                    onChange={(e) => setRecAccountId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  >
                    <option value="">-- เลือกบัญชี --</option>
                    {accounts
                      .filter((a) => (recMethod === 'card' ? a.type === 'credit_card' : a.type === 'savings'))
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (คงเหลือ: {formatCurrency(acc.balance)})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Credit Card Specific: Installments 0% Toggle */}
                {recMethod === 'card' && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-700 font-semibold">เป็นรูปแบบผ่อนชำระ 0%</span>
                      <input
                        type="checkbox"
                        checked={isInstallment}
                        onChange={(e) => setIsInstallment(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                      />
                    </div>

                    {isInstallment && (
                      <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-semibold block">ระยะเวลา (เดือน)</label>
                          <input
                            type="number"
                            min="2"
                            max="60"
                            value={installmentMonths || ''}
                            onChange={(e) => setInstallmentMonths(e.target.value === '' ? 0 : parseInt(e.target.value) || 10)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-semibold block">อัตราดอกเบี้ยผ่อน (% หรือ 0)</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max="30"
                            value={installmentInterest || ''}
                            onChange={(e) => setInstallmentInterest(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-add-rec-cancel"
                    type="button"
                    onClick={() => setShowAddRecurringModal(false)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-add-rec-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    ยืนยันรายการ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD RECURRING INCOME MODAL --- */}
      <AnimatePresence>
        {showAddRecIncomeModal && (
          <div id="add-rec-income-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="font-extrabold text-lg text-slate-800">ตั้งค่ารายรับประจำเดือน & เงินเดือนคงที่</h3>
              
              <form onSubmit={handleCreateRecurringIncome} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-semibold block">ชื่อแหล่งรายรับประจำ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เงินเดือนบริษัท A, งานพาร์ทไทม์"
                    value={recIncName}
                    onChange={(e) => setRecIncName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">เงินเดือนหลัก (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={recIncBaseSalary || ''}
                      onChange={(e) => setRecIncBaseSalary(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ค่าทำงานล่วงเวลา / OT (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={recIncOt || ''}
                      onChange={(e) => setRecIncOt(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ค่าคอมมิชชั่น / Commission (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={recIncCommission || ''}
                      onChange={(e) => setRecIncCommission(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">ค่าอินเซนทีฟ / Incentive (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={recIncIncentive || ''}
                      onChange={(e) => setRecIncIncentive(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">งานเสริมอื่น ๆ จากการทำงาน (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={recIncOther || ''}
                      onChange={(e) => setRecIncOther(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">งานเสริม / ฟรีแลนซ์ (Freelance) (บาท)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={recIncFreelance || ''}
                      onChange={(e) => setRecIncFreelance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">วันที่เงินออก (วันของเดือน)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={recIncDayOfMonth}
                      onChange={(e) => setRecIncDayOfMonth(e.target.value === '' ? 0 : parseInt(e.target.value) || 25)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-semibold block">บัญชีรับเงินฝากออมทรัพย์</label>
                    <select
                      value={recIncAccountId}
                      onChange={(e) => setRecIncAccountId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                    >
                      {accounts
                        .filter((a) => a.type === 'savings')
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} (คงเหลือ: {formatCurrency(acc.balance)})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Live total sum card inside form */}
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">ยอดรวมรายรับประจำประมาณการต่อเดือน</p>
                    <p className="text-xs text-emerald-600 font-medium mt-0.5">รวมเงินเดือน + สวัสดิการ + ฟรีแลนซ์</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-emerald-800">
                      {formatCurrency(recIncBaseSalary + recIncOt + recIncCommission + recIncIncentive + recIncOther + recIncFreelance)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    id="btn-add-rec-income-cancel"
                    type="button"
                    onClick={() => setShowAddRecIncomeModal(false)}
                    className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    id="btn-add-rec-income-submit"
                    type="submit"
                    className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    ตั้งค่ารายรับประจำ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar (Tabs) */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex items-center justify-around z-40 shadow-lg">
        <button
          id="m-nav-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 text-center transition-all ${
            activeTab === 'dashboard' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[9px] mt-1">แดชบอร์ด</span>
        </button>
        <button
          id="m-nav-accounts"
          onClick={() => setActiveTab('accounts')}
          className={`flex flex-col items-center p-2 text-center transition-all ${
            activeTab === 'accounts' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PiggyBank className="w-5 h-5" />
          <span className="text-[9px] mt-1">แหล่งเงิน</span>
        </button>
        <button
          id="m-nav-transactions"
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center p-2 text-center transition-all ${
            activeTab === 'transactions' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus className="w-5 h-5 bg-indigo-600 rounded-full text-white p-1 shrink-0 shadow-md shadow-indigo-500/20" />
          <span className="text-[9px] mt-0.5">บันทึก/แสกน</span>
        </button>
        <button
          id="m-nav-recurring"
          onClick={() => setActiveTab('recurring')}
          className={`flex flex-col items-center p-2 text-center transition-all ${
            activeTab === 'recurring' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] mt-1">จ่ายประจำ</span>
        </button>
        <button
          id="m-nav-family"
          onClick={() => setActiveTab('family')}
          className={`flex flex-col items-center p-2 text-center transition-all ${
            activeTab === 'family' ? 'text-indigo-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] mt-1">ครอบครัว</span>
        </button>
      </nav>

      {/* --- CUSTOM REUSABLE CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {confirmState && confirmState.isOpen && (
          <div id="custom-confirm-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 max-w-sm w-full rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${confirmState.danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">{confirmState.title}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">{confirmState.message}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmState(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  id="btn-confirm-modal-yes"
                  onClick={confirmState.onConfirm}
                  className={`flex-1 py-2 text-white font-bold text-xs rounded-xl transition-all shadow-xs ${confirmState.danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                  ยืนยัน
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
