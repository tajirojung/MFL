import { supabase } from './supabase';
import {
  Account,
  Transaction,
  Budget,
  RecurringExpense,
  RecurringIncome,
  AppNotification,
  FamilyGroup,
  FamilyInvitation,
  UserProfile,
  CustomCategory,
} from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const isMockUser = (uid: string) => uid.startsWith('mock_');

export function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefined) as T;
  return Object.entries(obj as Record<string, unknown>).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      (acc as Record<string, unknown>)[key] = cleanUndefined(value);
    }
    return acc;
  }, {} as T);
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Supabase service error:', { error, operationType, path });
}

type Unsubscribe = () => void;

function getMockList<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setMockList<T>(key: string, list: T[]) {
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event('storage'));
}

function subscribeMockList<T>(key: string, callback: (items: T[]) => void): Unsubscribe {
  const load = () => callback(getMockList<T>(key));
  load();
  window.addEventListener('storage', load);
  return () => window.removeEventListener('storage', load);
}

function subscribeTable(table: string, reload: () => Promise<void>): Unsubscribe {
  const channel = supabase
    .channel(`mfl-${table}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      reload();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function userFromRow(row: any): UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url || undefined,
    familyId: row.family_id || null,
    createdAt: row.created_at,
  };
}

function accountFromRow(row: any): Account {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    balance: Number(row.balance || 0),
    limit: row.credit_limit == null ? undefined : Number(row.credit_limit),
    interestRate: row.interest_rate == null ? undefined : Number(row.interest_rate),
    statementDate: row.statement_date == null ? undefined : Number(row.statement_date),
    createdAt: row.created_at,
  };
}

function accountToRow(uid: string, account: Partial<Account>) {
  return cleanUndefined({
    user_id: account.userId || uid,
    name: account.name,
    type: account.type,
    balance: account.balance,
    credit_limit: account.limit,
    interest_rate: account.interestRate,
    statement_date: account.statementDate,
  });
}

function transactionFromRow(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    familyId: row.family_id,
    amount: Number(row.amount || 0),
    type: row.type,
    category: row.category,
    date: row.date,
    description: row.description,
    accountId: row.account_id,
    receiptUrl: row.receipt_url || undefined,
    isRecurring: row.is_recurring,
    recurringId: row.recurring_id || undefined,
    createdAt: row.created_at,
  };
}

function transactionToRow(tx: Partial<Transaction>) {
  return cleanUndefined({
    user_id: tx.userId,
    user_name: tx.userName,
    family_id: tx.familyId || null,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    date: tx.date,
    description: tx.description,
    account_id: tx.accountId,
    receipt_url: tx.receiptUrl,
    is_recurring: tx.isRecurring,
    recurring_id: tx.recurringId,
  });
}

function budgetFromRow(row: any): Budget {
  return {
    id: row.id,
    familyId: row.family_id,
    category: row.category,
    amount: Number(row.amount || 0),
    month: row.month,
    items: row.items || [],
    createdAt: row.created_at,
  };
}

function recurringFromRow(row: any): RecurringExpense {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    amount: Number(row.amount || 0),
    name: row.name,
    category: row.category,
    paymentMethod: row.payment_method,
    accountId: row.account_id,
    isInstallment: row.is_installment,
    installmentMonths: row.installment_months || undefined,
    installmentInterest: row.installment_interest == null ? undefined : Number(row.installment_interest),
    nextDueDate: row.next_due_date,
    createdAt: row.created_at,
  };
}

function recurringToRow(expense: Partial<RecurringExpense>) {
  return cleanUndefined({
    user_id: expense.userId,
    family_id: expense.familyId || null,
    amount: expense.amount,
    name: expense.name,
    category: expense.category,
    payment_method: expense.paymentMethod,
    account_id: expense.accountId,
    is_installment: expense.isInstallment,
    installment_months: expense.installmentMonths,
    installment_interest: expense.installmentInterest,
    next_due_date: expense.nextDueDate,
  });
}

function recurringIncomeFromRow(row: any): RecurringIncome {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    name: row.name,
    baseSalary: Number(row.base_salary || 0),
    ot: Number(row.ot || 0),
    commission: Number(row.commission || 0),
    incentive: Number(row.incentive || 0),
    otherIncome: Number(row.other_income || 0),
    freelanceIncome: Number(row.freelance_income || 0),
    totalAmount: Number(row.total_amount || 0),
    dayOfMonth: Number(row.day_of_month),
    accountId: row.account_id,
    lastTriggeredMonth: row.last_triggered_month || undefined,
    createdAt: row.created_at,
  };
}

function recurringIncomeToRow(income: Partial<RecurringIncome>) {
  return cleanUndefined({
    user_id: income.userId,
    family_id: income.familyId || null,
    name: income.name,
    base_salary: income.baseSalary,
    ot: income.ot,
    commission: income.commission,
    incentive: income.incentive,
    other_income: income.otherIncome,
    freelance_income: income.freelanceIncome,
    total_amount: income.totalAmount,
    day_of_month: income.dayOfMonth,
    account_id: income.accountId,
    last_triggered_month: income.lastTriggeredMonth,
  });
}

function customCategoryFromRow(row: any): CustomCategory {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    name: row.name,
    type: row.type,
    createdAt: row.created_at,
  };
}

function notificationFromRow(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

function familyFromRow(row: any): FamilyGroup {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    members: row.members || [],
    createdAt: row.created_at,
  };
}

function invitationFromRow(row: any): FamilyInvitation {
  return {
    id: row.id,
    familyId: row.family_id,
    familyName: row.family_name,
    email: row.email,
    status: row.status,
    senderName: row.sender_name,
    createdAt: row.created_at,
  };
}

export async function saveUserProfile(user: UserProfile) {
  if (isMockUser(user.uid)) {
    localStorage.setItem(`mock_profile_${user.uid}`, JSON.stringify(user));
    window.dispatchEvent(new Event('storage'));
    return;
  }

  const { error } = await supabase.from('users').upsert({
    id: user.uid,
    email: user.email,
    display_name: user.displayName,
    photo_url: user.photoURL || null,
    family_id: user.familyId || null,
  });
  if (error) throw error;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isMockUser(uid)) {
    const data = localStorage.getItem(`mock_profile_${uid}`);
    return data ? JSON.parse(data) : null;
  }

  const { data, error } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data ? userFromRow(data) : null;
}

export function subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void): Unsubscribe {
  if (isMockUser(uid)) {
    const key = `mock_profile_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : null);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  const reload = async () => callback(await getUserProfile(uid));
  reload();
  return subscribeTable('users', reload);
}

export function subscribeAccounts(uid: string, _familyId: string | null | undefined, callback: (accounts: Account[]) => void): Unsubscribe {
  if (isMockUser(uid)) return subscribeMockList(`mock_accounts_${uid}`, callback);

  const reload = async () => {
    const { data, error } = await supabase.from('accounts').select('*').eq('user_id', uid).order('created_at');
    if (error) throw error;
    callback((data || []).map(accountFromRow));
  };
  reload();
  return subscribeTable('accounts', reload);
}

export async function addAccount(uid: string, account: Omit<Account, 'id' | 'createdAt'>) {
  if (isMockUser(uid)) {
    const key = `mock_accounts_${uid}`;
    const list = getMockList<Account>(key);
    const newAcc: Account = { ...account, id: `acc_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    setMockList(key, [...list, newAcc]);
    return newAcc;
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert(accountToRow(uid, account))
    .select()
    .single();
  if (error) throw error;
  return accountFromRow(data);
}

export async function updateAccountBalance(uid: string, accountId: string, newBalance: number) {
  if (isMockUser(uid)) {
    const key = `mock_accounts_${uid}`;
    setMockList(key, getMockList<Account>(key).map((a) => (a.id === accountId ? { ...a, balance: newBalance } : a)));
    return;
  }
  const { error } = await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId).eq('user_id', uid);
  if (error) throw error;
}

export async function updateAccount(uid: string, accountId: string, updates: Partial<Account>) {
  if (isMockUser(uid)) {
    const key = `mock_accounts_${uid}`;
    setMockList(key, getMockList<Account>(key).map((a) => (a.id === accountId ? { ...a, ...updates } : a)));
    return;
  }
  const { error } = await supabase.from('accounts').update(accountToRow(uid, updates)).eq('id', accountId).eq('user_id', uid);
  if (error) throw error;
}

export function subscribeTransactions(uid: string, familyId: string | null | undefined, callback: (transactions: Transaction[]) => void): Unsubscribe {
  if (isMockUser(uid)) return subscribeMockList(`mock_transactions_${uid}`, callback);

  const reload = async () => {
    let query = supabase.from('transactions').select('*').order('date', { ascending: false });
    query = familyId ? query.eq('family_id', familyId) : query.eq('user_id', uid);
    const { data, error } = await query;
    if (error) throw error;
    callback((data || []).map(transactionFromRow));
  };
  reload();
  return subscribeTable('transactions', reload);
}

async function adjustAccountBalance(accountId: string, diff: number) {
  const { data, error } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
  if (error) throw error;
  const { error: updateError } = await supabase
    .from('accounts')
    .update({ balance: Number(data.balance || 0) + diff })
    .eq('id', accountId);
  if (updateError) throw updateError;
}

export async function addTransaction(uid: string, tx: Omit<Transaction, 'id' | 'createdAt'>) {
  if (isMockUser(uid)) {
    const key = `mock_transactions_${uid}`;
    const newTx: Transaction = { ...tx, id: `tx_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
    setMockList(key, [newTx, ...getMockList<Transaction>(key)]);
    const accountsKey = `mock_accounts_${uid}`;
    setMockList(
      accountsKey,
      getMockList<Account>(accountsKey).map((a) =>
        a.id === tx.accountId ? { ...a, balance: a.balance + (tx.type === 'income' ? tx.amount : -tx.amount) } : a,
      ),
    );
    return newTx;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionToRow({ ...tx, userId: uid }))
    .select()
    .single();
  if (error) throw error;
  await adjustAccountBalance(tx.accountId, tx.type === 'income' ? tx.amount : -tx.amount);
  return transactionFromRow(data);
}

export async function deleteTransaction(uid: string, tx: Transaction) {
  if (isMockUser(uid)) {
    const key = `mock_transactions_${uid}`;
    setMockList(key, getMockList<Transaction>(key).filter((t) => t.id !== tx.id));
    const accountsKey = `mock_accounts_${uid}`;
    setMockList(
      accountsKey,
      getMockList<Account>(accountsKey).map((a) =>
        a.id === tx.accountId ? { ...a, balance: a.balance + (tx.type === 'income' ? -tx.amount : tx.amount) } : a,
      ),
    );
    return;
  }

  const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
  if (error) throw error;
  await adjustAccountBalance(tx.accountId, tx.type === 'income' ? -tx.amount : tx.amount);
}

export async function updateTransaction(uid: string, transactionId: string, oldTx: Transaction, updates: Partial<Transaction>) {
  if (isMockUser(uid)) {
    const key = `mock_transactions_${uid}`;
    setMockList(key, getMockList<Transaction>(key).map((t) => (t.id === transactionId ? { ...t, ...updates } : t)));
    return;
  }
  const nextTx = { ...oldTx, ...updates };
  const { error } = await supabase.from('transactions').update(transactionToRow(nextTx)).eq('id', transactionId);
  if (error) throw error;
  if (oldTx.accountId === nextTx.accountId) {
    const oldDiff = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
    const newDiff = nextTx.type === 'income' ? nextTx.amount : -nextTx.amount;
    await adjustAccountBalance(nextTx.accountId, oldDiff + newDiff);
  }
}

export function subscribeBudgets(uid: string, familyId: string | null | undefined, callback: (budgets: Budget[]) => void): Unsubscribe {
  if (isMockUser(uid)) return subscribeMockList(`mock_budgets_${uid}`, callback);
  const targetId = familyId || uid;
  const reload = async () => {
    const { data, error } = await supabase.from('budgets').select('*').eq('family_id', targetId);
    if (error) throw error;
    callback((data || []).map(budgetFromRow));
  };
  reload();
  return subscribeTable('budgets', reload);
}

export async function saveBudget(uid: string, familyId: string | null | undefined, category: string, amount: number, month: string, items?: any[]) {
  const targetId = familyId || uid;
  if (isMockUser(uid)) {
    const key = `mock_budgets_${uid}`;
    const list = getMockList<Budget>(key);
    const index = list.findIndex((b) => b.category === category && b.month === month && b.familyId === targetId);
    if (index >= 0) list[index] = { ...list[index], amount, items };
    else list.push({ id: `budget_${crypto.randomUUID()}`, familyId: targetId, category, amount, month, items, createdAt: new Date().toISOString() });
    setMockList(key, list);
    return;
  }
  const { error } = await supabase.from('budgets').upsert(
    { family_id: targetId, category, amount, month, items: items || [] },
    { onConflict: 'family_id,category,month' },
  );
  if (error) throw error;
}

export async function updateBudget(uid: string, id: string, updates: Partial<Budget>) {
  if (isMockUser(uid)) {
    const key = `mock_budgets_${uid}`;
    setMockList(key, getMockList<Budget>(key).map((b) => (b.id === id ? { ...b, ...updates } : b)));
    return;
  }
  const { error } = await supabase
    .from('budgets')
    .update(cleanUndefined({ category: updates.category, amount: updates.amount, month: updates.month, items: updates.items }))
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBudget(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_budgets_${uid}`;
    setMockList(key, getMockList<Budget>(key).filter((b) => b.id !== id));
    return;
  }
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeRecurringExpenses(uid: string, familyId: string | null | undefined, callback: (recurring: RecurringExpense[]) => void): Unsubscribe {
  if (isMockUser(uid)) return subscribeMockList(`mock_recurring_${uid}`, callback);
  const targetId = familyId || uid;
  const reload = async () => {
    const { data, error } = await supabase.from('recurring').select('*').eq('family_id', targetId);
    if (error) throw error;
    callback((data || []).map(recurringFromRow));
  };
  reload();
  return subscribeTable('recurring', reload);
}

export async function addRecurringExpense(uid: string, familyId: string | null | undefined, expense: Omit<RecurringExpense, 'id' | 'createdAt'>) {
  const targetId = familyId || uid;
  if (isMockUser(uid)) {
    const key = `mock_recurring_${uid}`;
    const newItem: RecurringExpense = { ...expense, id: `rec_${crypto.randomUUID()}`, familyId: targetId, createdAt: new Date().toISOString() };
    setMockList(key, [...getMockList<RecurringExpense>(key), newItem]);
    return newItem;
  }
  const { data, error } = await supabase
    .from('recurring')
    .insert(recurringToRow({ ...expense, userId: uid, familyId: targetId }))
    .select()
    .single();
  if (error) throw error;
  return recurringFromRow(data);
}

export async function deleteRecurringExpense(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_${uid}`;
    setMockList(key, getMockList<RecurringExpense>(key).filter((r) => r.id !== id));
    return;
  }
  const { error } = await supabase.from('recurring').delete().eq('id', id);
  if (error) throw error;
}

export async function updateRecurringExpense(uid: string, id: string, updates: Partial<RecurringExpense>) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_${uid}`;
    setMockList(key, getMockList<RecurringExpense>(key).map((r) => (r.id === id ? { ...r, ...updates } : r)));
    return;
  }
  const { error } = await supabase.from('recurring').update(recurringToRow(updates)).eq('id', id);
  if (error) throw error;
}

export function subscribeRecurringIncomes(uid: string, familyId: string | null | undefined, callback: (recurringIncomes: RecurringIncome[]) => void): Unsubscribe {
  if (isMockUser(uid)) return subscribeMockList(`mock_recurring_incomes_${uid}`, callback);
  const targetId = familyId || uid;
  const reload = async () => {
    const { data, error } = await supabase.from('recurring_incomes').select('*').eq('family_id', targetId);
    if (error) throw error;
    callback((data || []).map(recurringIncomeFromRow));
  };
  reload();
  return subscribeTable('recurring_incomes', reload);
}

export async function addRecurringIncome(uid: string, familyId: string | null | undefined, income: Omit<RecurringIncome, 'id' | 'createdAt'>) {
  const targetId = familyId || uid;
  if (isMockUser(uid)) {
    const key = `mock_recurring_incomes_${uid}`;
    const newItem: RecurringIncome = { ...income, id: `rec_inc_${crypto.randomUUID()}`, familyId: targetId, createdAt: new Date().toISOString() };
    setMockList(key, [...getMockList<RecurringIncome>(key), newItem]);
    return newItem;
  }
  const { data, error } = await supabase
    .from('recurring_incomes')
    .insert(recurringIncomeToRow({ ...income, userId: uid, familyId: targetId }))
    .select()
    .single();
  if (error) throw error;
  return recurringIncomeFromRow(data);
}

export async function updateRecurringIncome(uid: string, id: string, updates: Partial<RecurringIncome>) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_incomes_${uid}`;
    setMockList(key, getMockList<RecurringIncome>(key).map((r) => (r.id === id ? { ...r, ...updates } : r)));
    return;
  }
  const { error } = await supabase.from('recurring_incomes').update(recurringIncomeToRow(updates)).eq('id', id);
  if (error) throw error;
}

export async function deleteRecurringIncome(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_incomes_${uid}`;
    setMockList(key, getMockList<RecurringIncome>(key).filter((r) => r.id !== id));
    return;
  }
  const { error } = await supabase.from('recurring_incomes').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeCustomCategories(uid: string, familyId: string | null | undefined, callback: (categories: CustomCategory[]) => void): Unsubscribe {
  if (isMockUser(uid)) return subscribeMockList(`mock_custom_categories_${uid}`, callback);
  const targetId = familyId || uid;
  const reload = async () => {
    const { data, error } = await supabase.from('custom_categories').select('*').eq('family_id', targetId);
    if (error) throw error;
    callback((data || []).map(customCategoryFromRow));
  };
  reload();
  return subscribeTable('custom_categories', reload);
}

export async function addCustomCategory(uid: string, familyId: string | null | undefined, category: { name: string; type: 'income' | 'expense' }): Promise<CustomCategory> {
  const targetId = familyId || uid;
  if (isMockUser(uid)) {
    const key = `mock_custom_categories_${uid}`;
    const newCat: CustomCategory = { id: `cat_${crypto.randomUUID()}`, userId: uid, familyId: targetId, ...category, createdAt: new Date().toISOString() };
    setMockList(key, [...getMockList<CustomCategory>(key), newCat]);
    return newCat;
  }
  const { data, error } = await supabase
    .from('custom_categories')
    .insert({ user_id: uid, family_id: targetId, name: category.name, type: category.type })
    .select()
    .single();
  if (error) throw error;
  return customCategoryFromRow(data);
}

export async function updateCustomCategory(uid: string, id: string, updates: Partial<CustomCategory>) {
  if (isMockUser(uid)) {
    const key = `mock_custom_categories_${uid}`;
    setMockList(key, getMockList<CustomCategory>(key).map((c) => (c.id === id ? { ...c, ...updates } : c)));
    return;
  }
  const { error } = await supabase.from('custom_categories').update(cleanUndefined({ name: updates.name, type: updates.type })).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomCategory(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_custom_categories_${uid}`;
    setMockList(key, getMockList<CustomCategory>(key).filter((c) => c.id !== id));
    return;
  }
  const { error } = await supabase.from('custom_categories').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeNotifications(uid: string, callback: (notifications: AppNotification[]) => void): Unsubscribe {
  if (isMockUser(uid)) return subscribeMockList(`mock_notifications_${uid}`, callback);
  const reload = async () => {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (error) throw error;
    callback((data || []).map(notificationFromRow));
  };
  reload();
  return subscribeTable('notifications', reload);
}

export async function addNotification(uid: string, message: string, type: 'warning' | 'info' | 'success') {
  if (isMockUser(uid)) {
    const key = `mock_notifications_${uid}`;
    const list = getMockList<AppNotification>(key);
    if (list.some((n) => n.message === message && !n.isRead)) return;
    setMockList(key, [{ id: `notif_${crypto.randomUUID()}`, userId: uid, message, type, isRead: false, createdAt: new Date().toISOString() }, ...list]);
    return;
  }
  const { data: existing } = await supabase.from('notifications').select('id').eq('user_id', uid).eq('message', message).eq('is_read', false);
  if (existing && existing.length > 0) return;
  const { error } = await supabase.from('notifications').insert({ user_id: uid, message, type, is_read: false });
  if (error) throw error;
}

export async function markNotificationAsRead(uid: string, notifId: string) {
  if (isMockUser(uid)) {
    const key = `mock_notifications_${uid}`;
    setMockList(key, getMockList<AppNotification>(key).map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    return;
  }
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notifId).eq('user_id', uid);
  if (error) throw error;
}

export function subscribeFamilyGroup(familyId: string, callback: (family: FamilyGroup | null) => void): Unsubscribe {
  if (!familyId) {
    callback(null);
    return () => {};
  }
  if (familyId.startsWith('mock_')) {
    const key = `mock_family_${familyId}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : null);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  const reload = async () => {
    const { data, error } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle();
    if (error) throw error;
    callback(data ? familyFromRow(data) : null);
  };
  reload();
  return subscribeTable('families', reload);
}

export async function createFamilyGroup(uid: string, _userName: string, familyName: string): Promise<string> {
  if (isMockUser(uid)) {
    const familyId = 'mock_family_id';
    localStorage.setItem(`mock_family_${familyId}`, JSON.stringify({ id: familyId, name: familyName, createdBy: uid, members: [uid] }));
    const profile = await getUserProfile(uid);
    if (profile) await saveUserProfile({ ...profile, familyId });
    return familyId;
  }
  const { data, error } = await supabase.from('families').insert({ name: familyName, created_by: uid, members: [uid] }).select().single();
  if (error) throw error;
  await supabase.from('users').update({ family_id: data.id }).eq('id', uid);
  return data.id;
}

export async function inviteFamilyMember(uid: string, senderName: string, familyId: string, familyName: string, email: string) {
  if (isMockUser(uid)) return;
  const { error } = await supabase.from('family_invitations').insert({
    family_id: familyId,
    family_name: familyName,
    email: email.trim().toLowerCase(),
    sender_name: senderName,
    status: 'pending',
  });
  if (error) throw error;
}

export function subscribeInvitations(email: string, callback: (invitations: FamilyInvitation[]) => void): Unsubscribe {
  if (!email) {
    callback([]);
    return () => {};
  }
  if (email.startsWith('mock_')) return subscribeMockList(`mock_invitations_${email}`, callback);
  const reload = async () => {
    const { data, error } = await supabase.from('family_invitations').select('*').eq('email', email.trim().toLowerCase()).eq('status', 'pending');
    if (error) throw error;
    callback((data || []).map(invitationFromRow));
  };
  reload();
  return subscribeTable('family_invitations', reload);
}

export async function respondToInvitation(uid: string, _userEmail: string, inviteId: string, accept: boolean) {
  if (isMockUser(uid)) return;
  const { data: invite, error } = await supabase.from('family_invitations').select('*').eq('id', inviteId).single();
  if (error || !invite) throw error;
  await supabase.from('family_invitations').update({ status: accept ? 'accepted' : 'declined' }).eq('id', inviteId);
  if (accept) {
    const { data: family } = await supabase.from('families').select('*').eq('id', invite.family_id).single();
    const members = Array.from(new Set([...(family?.members || []), uid]));
    await supabase.from('families').update({ members }).eq('id', invite.family_id);
    await supabase.from('users').update({ family_id: invite.family_id }).eq('id', uid);
  }
}

export async function leaveFamily(uid: string, familyId: string) {
  if (isMockUser(uid)) {
    const profile = await getUserProfile(uid);
    if (profile) await saveUserProfile({ ...profile, familyId: null });
    return;
  }
  await supabase.from('users').update({ family_id: null }).eq('id', uid);
  const { data: family } = await supabase.from('families').select('*').eq('id', familyId).single();
  const members = (family?.members || []).filter((member: string) => member !== uid);
  if (members.length === 0) await supabase.from('families').delete().eq('id', familyId);
  else await supabase.from('families').update({ members }).eq('id', familyId);
}

export function prePopulateMockData(uid: string, type: 'alone' | 'family') {
  localStorage.removeItem(`mock_accounts_${uid}`);
  localStorage.removeItem(`mock_transactions_${uid}`);
  localStorage.removeItem(`mock_budgets_${uid}`);
  localStorage.removeItem(`mock_recurring_${uid}`);
  localStorage.removeItem(`mock_recurring_incomes_${uid}`);
  localStorage.removeItem(`mock_notifications_${uid}`);
  localStorage.removeItem(`mock_custom_categories_${uid}`);

  const familyId = type === 'family' ? 'mock_family_id' : null;
  const mockUserName = type === 'alone' ? 'Tajiro (ส่วนตัว)' : 'Tajiro (หัวหน้าครอบครัว)';
  const profile: UserProfile = {
    uid,
    email: type === 'alone' ? 'tajiro.solo@gmail.com' : 'tajiro.family@gmail.com',
    displayName: mockUserName,
    familyId,
  };
  localStorage.setItem(`mock_profile_${uid}`, JSON.stringify(profile));

  if (familyId) {
    localStorage.setItem(
      `mock_family_${familyId}`,
      JSON.stringify({ id: familyId, name: 'ครอบครัวทาจิโร่ (Tajiro Family)', createdBy: uid, members: [uid, 'somchai.family@gmail.com'] }),
    );
  }

  const accounts: Account[] = [
    { id: 'acc_sav_1', userId: uid, name: type === 'alone' ? 'บัญชีออมทรัพย์ K-Bank' : 'บัญชีออมทรัพย์ส่วนกลางครอบครัว', type: 'savings', balance: type === 'alone' ? 32500 : 65400, createdAt: new Date().toISOString() },
    { id: 'acc_card_1', userId: uid, name: type === 'alone' ? 'บัตรเครดิต K-Classic' : 'บัตรเครดิตร่วมครอบครัว Premium', type: 'credit_card', balance: type === 'alone' ? 45000 : 110000, limit: type === 'alone' ? 50000 : 150000, interestRate: 16, statementDate: 15, createdAt: new Date().toISOString() },
  ];

  const transactions: Transaction[] = [
    { id: 'tx_1', userId: uid, userName: mockUserName, familyId, amount: type === 'alone' ? 28000 : 65000, type: 'income', category: 'เงินเดือน (Salary)', date: '2026-06-01', description: 'เงินเดือนประจำเดือน', accountId: 'acc_sav_1', createdAt: new Date().toISOString() },
    { id: 'tx_2', userId: uid, userName: mockUserName, familyId, amount: type === 'alone' ? 1500 : 8500, type: 'expense', category: 'อาหารและเครื่องดื่ม (Food & Drinks)', date: '2026-06-12', description: 'ซื้อของเข้าบ้าน', accountId: 'acc_sav_1', createdAt: new Date().toISOString() },
    { id: 'tx_3', userId: uid, userName: mockUserName, familyId, amount: type === 'alone' ? 3500 : 12500, type: 'expense', category: 'ช้อปปิ้ง (Shopping)', date: '2026-06-18', description: 'ค่าใช้จ่ายบัตรเครดิต', accountId: 'acc_card_1', createdAt: new Date().toISOString() },
  ];

  const budgets: Budget[] = [
    { id: 'bud_1', familyId: familyId || uid, category: 'อาหารและเครื่องดื่ม (Food & Drinks)', amount: type === 'alone' ? 6000 : 15000, month: '2026-06', createdAt: new Date().toISOString() },
    { id: 'bud_2', familyId: familyId || uid, category: 'ช้อปปิ้ง (Shopping)', amount: type === 'alone' ? 4000 : 10000, month: '2026-06', createdAt: new Date().toISOString() },
  ];

  const notifications: AppNotification[] = [
    { id: 'not_1', userId: uid, message: 'ยินดีต้อนรับเข้าสู่ Family Wallet!', type: 'success', isRead: false, createdAt: new Date().toISOString() },
  ];

  setMockList(`mock_accounts_${uid}`, accounts);
  setMockList(`mock_transactions_${uid}`, transactions);
  setMockList(`mock_budgets_${uid}`, budgets);
  setMockList(`mock_notifications_${uid}`, notifications);
}
