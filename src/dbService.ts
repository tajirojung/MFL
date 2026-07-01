import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Account, Transaction, Budget, RecurringExpense, RecurringIncome, AppNotification, FamilyGroup, FamilyInvitation, UserProfile, CustomCategory } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check if a user is using mock/local mode
export const isMockUser = (uid: string) => uid.startsWith('mock_');

// Helper to recursively remove undefined fields so Firestore doesn't throw errors
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as any;
  }
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name !== 'Object') {
      return obj;
    }
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      if ((obj as any)[key] !== undefined) {
        clean[key] = cleanUndefined((obj as any)[key]);
      }
    }
    return clean;
  }
  return obj;
}

// Save user profile
export async function saveUserProfile(user: UserProfile) {
  if (isMockUser(user.uid)) {
    localStorage.setItem(`mock_profile_${user.uid}`, JSON.stringify(user));
    return;
  }
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, cleanUndefined({
    ...user,
    createdAt: Timestamp.now()
  }), { merge: true });
}

// Get user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isMockUser(uid)) {
    const data = localStorage.getItem(`mock_profile_${uid}`);
    return data ? JSON.parse(data) : null;
  }
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// Subscribe to user profile
export function subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  if (isMockUser(uid)) {
    const data = localStorage.getItem(`mock_profile_${uid}`);
    callback(data ? JSON.parse(data) : null);
    return () => {};
  }
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as UserProfile) : null);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  });
}

// Subscribe to accounts
export function subscribeAccounts(uid: string, familyId: string | null | undefined, callback: (accounts: Account[]) => void) {
  if (isMockUser(uid)) {
    const key = `mock_accounts_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  // Filter accounts by userId OR if family is set, wait - do we share accounts?
  // Let's query based on owner, or if family is set, allow viewing all accounts associated with family users or just user's own accounts.
  // Standard: show accounts owned by user. If they want family bank account, they can see/choose it.
  // To keep it simple: fetch all accounts of the user. If in family, we can also load accounts of the user.
  const q = query(collection(db, 'accounts'), where('userId', '==', uid));
  return onSnapshot(q, (snap) => {
    const list: Account[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Account);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'accounts');
  });
}

export async function addAccount(uid: string, account: Omit<Account, 'id' | 'createdAt'>) {
  if (isMockUser(uid)) {
    const key = `mock_accounts_${uid}`;
    const current = localStorage.getItem(key);
    const list: Account[] = current ? JSON.parse(current) : [];
    const newAcc: Account = {
      ...account,
      id: 'acc_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    list.push(newAcc);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    return newAcc;
  }

  const docRef = await addDoc(collection(db, 'accounts'), cleanUndefined({
    ...account,
    createdAt: Timestamp.now()
  }));
  return { id: docRef.id, ...account };
}

export async function updateAccountBalance(uid: string, accountId: string, newBalance: number) {
  if (isMockUser(uid)) {
    const key = `mock_accounts_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      const list: Account[] = JSON.parse(current);
      const idx = list.findIndex(a => a.id === accountId);
      if (idx !== -1) {
        list[idx].balance = newBalance;
        localStorage.setItem(key, JSON.stringify(list));
        window.dispatchEvent(new Event('storage'));
      }
    }
    return;
  }

  const docRef = doc(db, 'accounts', accountId);
  await updateDoc(docRef, { balance: newBalance });
}

// Subscribe to transactions
export function subscribeTransactions(uid: string, familyId: string | null | undefined, callback: (transactions: Transaction[]) => void) {
  if (isMockUser(uid)) {
    const key = `mock_transactions_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  // If in a family, load transactions of the family, otherwise just the user
  let q = query(collection(db, 'transactions'), where('userId', '==', uid), orderBy('date', 'desc'));
  if (familyId) {
    q = query(collection(db, 'transactions'), where('familyId', '==', familyId), orderBy('date', 'desc'));
  }

  return onSnapshot(q, (snap) => {
    const list: Transaction[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Transaction);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'transactions');
  });
}

export async function addTransaction(uid: string, tx: Omit<Transaction, 'id' | 'createdAt'>) {
  if (isMockUser(uid)) {
    const key = `mock_transactions_${uid}`;
    const current = localStorage.getItem(key);
    const list: Transaction[] = current ? JSON.parse(current) : [];
    const newTx: Transaction = {
      ...tx,
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    list.push(newTx);
    localStorage.setItem(key, JSON.stringify(list));

    // Update account balance
    const accountsKey = `mock_accounts_${uid}`;
    const accountsData = localStorage.getItem(accountsKey);
    if (accountsData) {
      const accounts: Account[] = JSON.parse(accountsData);
      const accIdx = accounts.findIndex(a => a.id === tx.accountId);
      if (accIdx !== -1) {
        if (tx.type === 'income') {
          // Saving: balance increases
          // Credit card: balance increases remaining limit (i.e. reducing debt)
          accounts[accIdx].balance += tx.amount;
        } else {
          // Expense: balance decreases (or remaining limit of credit card decreases)
          accounts[accIdx].balance -= tx.amount;
        }
        localStorage.setItem(accountsKey, JSON.stringify(accounts));
      }
    }

    window.dispatchEvent(new Event('storage'));
    return newTx;
  }

  const docRef = await addDoc(collection(db, 'transactions'), cleanUndefined({
    ...tx,
    createdAt: Timestamp.now()
  }));

  // Adjust balance
  const accRef = doc(db, 'accounts', tx.accountId);
  const accSnap = await getDoc(accRef);
  if (accSnap.exists()) {
    const acc = accSnap.data() as Account;
    const currentBalance = acc.balance;
    const diff = tx.type === 'income' ? tx.amount : -tx.amount;
    await updateDoc(accRef, { balance: currentBalance + diff });
  }

  return { id: docRef.id, ...tx };
}

export async function deleteTransaction(uid: string, tx: Transaction) {
  if (isMockUser(uid)) {
    const key = `mock_transactions_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: Transaction[] = JSON.parse(current);
      list = list.filter(t => t.id !== tx.id);
      localStorage.setItem(key, JSON.stringify(list));

      // Revert account balance
      const accountsKey = `mock_accounts_${uid}`;
      const accountsData = localStorage.getItem(accountsKey);
      if (accountsData) {
        const accounts: Account[] = JSON.parse(accountsData);
        const accIdx = accounts.findIndex(a => a.id === tx.accountId);
        if (accIdx !== -1) {
          if (tx.type === 'income') {
            accounts[accIdx].balance -= tx.amount;
          } else {
            accounts[accIdx].balance += tx.amount;
          }
          localStorage.setItem(accountsKey, JSON.stringify(accounts));
        }
      }
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  await deleteDoc(doc(db, 'transactions', tx.id));

  // Revert balance
  const accRef = doc(db, 'accounts', tx.accountId);
  const accSnap = await getDoc(accRef);
  if (accSnap.exists()) {
    const acc = accSnap.data() as Account;
    const currentBalance = acc.balance;
    const diff = tx.type === 'income' ? -tx.amount : tx.amount; // Revert
    await updateDoc(accRef, { balance: currentBalance + diff });
  }
}

// Subscribe to budgets
export function subscribeBudgets(uid: string, familyId: string | null | undefined, callback: (budgets: Budget[]) => void) {
  if (isMockUser(uid)) {
    const key = `mock_budgets_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  // Filter budgets by familyId. If user is alone, they don't have familyId, but we can set familyId to their own uid.
  const targetId = familyId || uid;
  const q = query(collection(db, 'budgets'), where('familyId', '==', targetId));
  return onSnapshot(q, (snap) => {
    const list: Budget[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Budget);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'budgets');
  });
}

export async function saveBudget(uid: string, familyId: string | null | undefined, category: string, amount: number, month: string, items?: any[]) {
  const targetId = familyId || uid;
  if (isMockUser(uid)) {
    const key = `mock_budgets_${uid}`;
    const current = localStorage.getItem(key);
    const list: Budget[] = current ? JSON.parse(current) : [];
    const idx = list.findIndex(b => b.category === category && b.month === month && b.familyId === targetId);
    if (idx !== -1) {
      list[idx].amount = amount;
      list[idx].items = items;
    } else {
      list.push({
        id: 'budget_' + Math.random().toString(36).substring(2, 9),
        familyId: targetId,
        category,
        amount,
        items,
        month,
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    return;
  }

  // Find if exists
  const q = query(
    collection(db, 'budgets'),
    where('familyId', '==', targetId),
    where('category', '==', category),
    where('month', '==', month)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const firstDoc = snap.docs[0];
    await updateDoc(doc(db, 'budgets', firstDoc.id), { amount, items: items || [] });
  } else {
    await addDoc(collection(db, 'budgets'), {
      familyId: targetId,
      category,
      amount,
      month,
      items: items || [],
      createdAt: Timestamp.now()
    });
  }
}

// Subscribe to recurring expenses
export function subscribeRecurringExpenses(uid: string, familyId: string | null | undefined, callback: (recurring: RecurringExpense[]) => void) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  const targetId = familyId || uid;
  // If family exists, fetch family's recurring, or fetch just user's. Let's do users/family-wide recurring
  const q = query(collection(db, 'recurring'), where('familyId', '==', targetId));
  return onSnapshot(q, (snap) => {
    const list: RecurringExpense[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as RecurringExpense);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'recurring');
  });
}

export async function addRecurringExpense(uid: string, familyId: string | null | undefined, expense: Omit<RecurringExpense, 'id' | 'createdAt'>) {
  const targetId = familyId || uid;
  if (isMockUser(uid)) {
    const key = `mock_recurring_${uid}`;
    const current = localStorage.getItem(key);
    const list: RecurringExpense[] = current ? JSON.parse(current) : [];
    const newRec: RecurringExpense = {
      ...expense,
      id: 'rec_' + Math.random().toString(36).substring(2, 9),
      familyId: targetId,
      createdAt: new Date().toISOString()
    };
    list.push(newRec);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    return newRec;
  }

  const docRef = await addDoc(collection(db, 'recurring'), cleanUndefined({
    ...expense,
    familyId: targetId,
    createdAt: Timestamp.now()
  }));
  return { id: docRef.id, ...expense, familyId: targetId };
}

export async function deleteRecurringExpense(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: RecurringExpense[] = JSON.parse(current);
      list = list.filter(r => r.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  await deleteDoc(doc(db, 'recurring', id));
}

export async function updateRecurringExpense(uid: string, id: string, updates: Partial<RecurringExpense>) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: RecurringExpense[] = JSON.parse(current);
      list = list.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  await updateDoc(doc(db, 'recurring', id), cleanUndefined(updates));
}

// Subscribe to recurring incomes
export function subscribeRecurringIncomes(uid: string, familyId: string | null | undefined, callback: (recurringIncomes: RecurringIncome[]) => void) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_incomes_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  const targetId = familyId || uid;
  const q = query(collection(db, 'recurring_incomes'), where('familyId', '==', targetId));
  return onSnapshot(q, (snap) => {
    const list: RecurringIncome[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as RecurringIncome);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'recurring_incomes');
  });
}

export async function addRecurringIncome(uid: string, familyId: string | null | undefined, income: Omit<RecurringIncome, 'id' | 'createdAt'>) {
  const targetId = familyId || uid;
  if (isMockUser(uid)) {
    const key = `mock_recurring_incomes_${uid}`;
    const current = localStorage.getItem(key);
    const list: RecurringIncome[] = current ? JSON.parse(current) : [];
    const newInc: RecurringIncome = {
      ...income,
      id: 'rec_inc_' + Math.random().toString(36).substring(2, 9),
      familyId: targetId,
      createdAt: new Date().toISOString()
    };
    list.push(newInc);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    return newInc;
  }

  const docRef = await addDoc(collection(db, 'recurring_incomes'), cleanUndefined({
    ...income,
    familyId: targetId,
    createdAt: Timestamp.now()
  }));
  return { id: docRef.id, ...income, familyId: targetId };
}

export async function updateRecurringIncome(uid: string, id: string, updates: Partial<RecurringIncome>) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_incomes_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: RecurringIncome[] = JSON.parse(current);
      list = list.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  await updateDoc(doc(db, 'recurring_incomes', id), cleanUndefined(updates));
}

export async function deleteRecurringIncome(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_recurring_incomes_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: RecurringIncome[] = JSON.parse(current);
      list = list.filter(r => r.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  await deleteDoc(doc(db, 'recurring_incomes', id));
}

// Custom Categories
export function subscribeCustomCategories(
  uid: string,
  familyId: string | null | undefined,
  callback: (categories: CustomCategory[]) => void
) {
  if (isMockUser(uid)) {
    const key = `mock_custom_categories_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  const targetId = familyId || uid;
  const q = query(collection(db, 'custom_categories'), where('familyId', '==', targetId));
  return onSnapshot(q, (snap) => {
    const list: CustomCategory[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as CustomCategory);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'custom_categories');
  });
}

export async function addCustomCategory(
  uid: string,
  familyId: string | null | undefined,
  category: { name: string; type: 'income' | 'expense' }
): Promise<CustomCategory> {
  const targetId = familyId || uid;

  if (isMockUser(uid)) {
    const key = `mock_custom_categories_${uid}`;
    const current = localStorage.getItem(key);
    const list: CustomCategory[] = current ? JSON.parse(current) : [];
    const newCat: CustomCategory = {
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      userId: uid,
      familyId: targetId,
      name: category.name,
      type: category.type,
      createdAt: new Date().toISOString()
    };
    list.push(newCat);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    return newCat;
  }

  const docRef = await addDoc(collection(db, 'custom_categories'), {
    userId: uid,
    familyId: targetId,
    name: category.name,
    type: category.type,
    createdAt: Timestamp.now()
  });
  return {
    id: docRef.id,
    userId: uid,
    familyId: targetId,
    name: category.name,
    type: category.type,
    createdAt: new Date().toISOString()
  };
}

export async function deleteCustomCategory(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_custom_categories_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: CustomCategory[] = JSON.parse(current);
      list = list.filter(r => r.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  await deleteDoc(doc(db, 'custom_categories', id));
}

// Subscribe to Notifications
export function subscribeNotifications(uid: string, callback: (notifications: AppNotification[]) => void) {
  if (isMockUser(uid)) {
    const key = `mock_notifications_${uid}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  const q = query(collection(db, 'notifications'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list: AppNotification[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as AppNotification);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'notifications');
  });
}

export async function addNotification(uid: string, message: string, type: 'warning' | 'info' | 'success') {
  if (isMockUser(uid)) {
    const key = `mock_notifications_${uid}`;
    const current = localStorage.getItem(key);
    const list: AppNotification[] = current ? JSON.parse(current) : [];
    
    // Prevent duplicate warnings of same message within short time
    const exists = list.some(n => n.message === message && !n.isRead);
    if (exists) return;

    list.unshift({
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      userId: uid,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
    return;
  }

  // Check duplicates in firestore
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    where('message', '==', message),
    where('isRead', '==', false)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return; // Skip duplicate

  await addDoc(collection(db, 'notifications'), {
    userId: uid,
    message,
    type,
    isRead: false,
    createdAt: Timestamp.now()
  });
}

export async function markNotificationAsRead(uid: string, notifId: string) {
  if (isMockUser(uid)) {
    const key = `mock_notifications_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      const list: AppNotification[] = JSON.parse(current);
      const idx = list.findIndex(n => n.id === notifId);
      if (idx !== -1) {
        list[idx].isRead = true;
        localStorage.setItem(key, JSON.stringify(list));
        window.dispatchEvent(new Event('storage'));
      }
    }
    return;
  }

  await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
}

// Families and invitations
export function subscribeFamilyGroup(familyId: string, callback: (family: FamilyGroup | null) => void) {
  if (!familyId) {
    callback(null);
    return () => {};
  }
  if (isMockUser(familyId)) {
    const key = `mock_family_${familyId}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : null);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  return onSnapshot(doc(db, 'families', familyId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as FamilyGroup) : null);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `families/${familyId}`);
  });
}

export async function createFamilyGroup(uid: string, userName: string, familyName: string): Promise<string> {
  if (isMockUser(uid)) {
    const familyId = 'mock_family_id';
    const family: FamilyGroup = {
      id: familyId,
      name: familyName,
      createdBy: uid,
      members: [uid]
    };
    localStorage.setItem(`mock_family_${familyId}`, JSON.stringify(family));
    
    // Update user profile familyId
    const profKey = `mock_profile_${uid}`;
    const profData = localStorage.getItem(profKey);
    if (profData) {
      const prof = JSON.parse(profData);
      prof.familyId = familyId;
      localStorage.setItem(profKey, JSON.stringify(prof));
    }
    
    window.dispatchEvent(new Event('storage'));
    return familyId;
  }

  // Create document in families
  const docRef = await addDoc(collection(db, 'families'), {
    name: familyName,
    createdBy: uid,
    members: [uid],
    createdAt: Timestamp.now()
  });

  // Update user profile
  await updateDoc(doc(db, 'users', uid), { familyId: docRef.id });
  return docRef.id;
}

export async function inviteFamilyMember(uid: string, senderName: string, familyId: string, familyName: string, email: string) {
  if (isMockUser(uid)) {
    // In mock, let's auto-add a simulated member!
    const key = `mock_family_${familyId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const family: FamilyGroup = JSON.parse(data);
      if (!family.members.includes(email)) {
        family.members.push(email);
        localStorage.setItem(key, JSON.stringify(family));
        window.dispatchEvent(new Event('storage'));
      }
    }
    return;
  }

  await addDoc(collection(db, 'familyInvitations'), {
    familyId,
    familyName,
    email: email.trim().toLowerCase(),
    senderName,
    status: 'pending',
    createdAt: Timestamp.now()
  });
}

// Fetch invitations for user email
export function subscribeInvitations(email: string, callback: (invitations: FamilyInvitation[]) => void) {
  if (!email) {
    callback([]);
    return () => {};
  }
  if (email.startsWith('mock_')) {
    const key = `mock_invitations_${email}`;
    const load = () => {
      const data = localStorage.getItem(key);
      callback(data ? JSON.parse(data) : []);
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }

  const q = query(
    collection(db, 'familyInvitations'),
    where('email', '==', email.trim().toLowerCase()),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    const list: FamilyInvitation[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as FamilyInvitation);
    });
    callback(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'familyInvitations');
  });
}

export async function respondToInvitation(uid: string, userEmail: string, inviteId: string, accept: boolean) {
  if (uid.startsWith('mock_')) {
    // Mock response logic
    return;
  }

  const inviteRef = doc(db, 'familyInvitations', inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) return;

  const invite = inviteSnap.data() as FamilyInvitation;
  if (accept) {
    // 1. Set status to accepted
    await updateDoc(inviteRef, { status: 'accepted' });
    // 2. Add member to family
    const familyRef = doc(db, 'families', invite.familyId);
    const familySnap = await getDoc(familyRef);
    if (familySnap.exists()) {
      const fam = familySnap.data() as FamilyGroup;
      if (!fam.members.includes(uid)) {
        await updateDoc(familyRef, { members: [...fam.members, uid] });
      }
    }
    // 3. Update user profile familyId
    await updateDoc(doc(db, 'users', uid), { familyId: invite.familyId });
  } else {
    // Set status to declined
    await updateDoc(inviteRef, { status: 'declined' });
  }
}

export async function leaveFamily(uid: string, familyId: string) {
  if (isMockUser(uid)) {
    const key = `mock_family_${familyId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const family: FamilyGroup = JSON.parse(data);
      family.members = family.members.filter(m => m !== uid);
      if (family.members.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(family));
      }
    }
    
    const profKey = `mock_profile_${uid}`;
    const profData = localStorage.getItem(profKey);
    if (profData) {
      const prof = JSON.parse(profData);
      prof.familyId = null;
      localStorage.setItem(profKey, JSON.stringify(prof));
    }
    window.dispatchEvent(new Event('storage'));
    return;
  }

  // Update user profile
  await updateDoc(doc(db, 'users', uid), { familyId: null });

  // Remove from family members list
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  if (familySnap.exists()) {
    const fam = familySnap.data() as FamilyGroup;
    const updatedMembers = fam.members.filter(m => m !== uid);
    if (updatedMembers.length === 0) {
      await deleteDoc(familyRef);
    } else {
      await updateDoc(familyRef, { members: updatedMembers });
    }
  }
}

// Pre-populate mock databases
export function prePopulateMockData(uid: string, type: 'alone' | 'family') {
  // Clear keys first
  localStorage.removeItem(`mock_accounts_${uid}`);
  localStorage.removeItem(`mock_transactions_${uid}`);
  localStorage.removeItem(`mock_budgets_${uid}`);
  localStorage.removeItem(`mock_recurring_${uid}`);
  localStorage.removeItem(`mock_notifications_${uid}`);
  localStorage.removeItem(`mock_family_mock_family_id`);

  const mockUserEmail = uid === 'mock_alone' ? 'tajiro.solo@gmail.com' : 'tajiro.family@gmail.com';
  const mockUserName = uid === 'mock_alone' ? 'Tajiro (ส่วนตัว)' : 'Tajiro (หัวหน้าครอบครัว)';

  const profile: UserProfile = {
    uid,
    email: mockUserEmail,
    displayName: mockUserName,
    familyId: type === 'family' ? 'mock_family_id' : null
  };
  localStorage.setItem(`mock_profile_${uid}`, JSON.stringify(profile));

  if (type === 'alone') {
    const accounts: Account[] = [
      {
        id: 'acc_sav_1',
        userId: uid,
        name: 'บัญชีออมทรัพย์ K-Bank',
        type: 'savings',
        balance: 32500,
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc_sav_2',
        userId: uid,
        name: 'เงินสดกระเป๋าสตางค์',
        type: 'savings',
        balance: 1800,
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc_card_1',
        userId: uid,
        name: 'บัตรเครดิต K-Classic',
        type: 'credit_card',
        balance: 45000, // Remaining limit
        limit: 50000, // Total limit
        interestRate: 16,
        statementDate: 15,
        createdAt: new Date().toISOString()
      }
    ];

    const transactions: Transaction[] = [
      {
        id: 'tx_1',
        userId: uid,
        userName: mockUserName,
        amount: 28000,
        type: 'income',
        category: 'เงินเดือน (Salary)',
        date: '2026-06-01',
        description: 'เงินเดือนประจำเดือน มิถุนายน 2026',
        accountId: 'acc_sav_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_2',
        userId: uid,
        userName: mockUserName,
        amount: 1500,
        type: 'expense',
        category: 'อาหารและเครื่องดื่ม (Food & Drinks)',
        date: '2026-06-15',
        description: 'มื้อเย็นฉลองกลางเดือนอาหารญี่ปุ่น',
        accountId: 'acc_sav_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_3',
        userId: uid,
        userName: mockUserName,
        amount: 3500,
        type: 'expense',
        category: 'ช้อปปิ้ง (Shopping)',
        date: '2026-06-18',
        description: 'ซื้อรองเท้าวิ่งใหม่คู่โปรด',
        accountId: 'acc_card_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_4',
        userId: uid,
        userName: mockUserName,
        amount: 1200,
        type: 'expense',
        category: 'บิลและสาธารณูปโภค (Bills & Utilities)',
        date: '2026-06-25',
        description: 'ค่าอินเทอร์เน็ตบ้านและโทรศัพท์มือถือ',
        accountId: 'acc_sav_1',
        createdAt: new Date().toISOString()
      }
    ];

    const budgets: Budget[] = [
      {
        id: 'bud_1',
        familyId: uid,
        category: 'อาหารและเครื่องดื่ม (Food & Drinks)',
        amount: 6000,
        month: '2026-06',
        createdAt: new Date().toISOString()
      },
      {
        id: 'bud_2',
        familyId: uid,
        category: 'ช้อปปิ้ง (Shopping)',
        amount: 4000,
        month: '2026-06',
        createdAt: new Date().toISOString()
      }
    ];

    const recurring: RecurringExpense[] = [
      {
        id: 'rec_1',
        userId: uid,
        familyId: uid,
        amount: 1500,
        name: 'สมัครสมาชิกฟิตเนสรายเดือน',
        category: 'สุขภาพและการแพทย์ (Health & Medical)',
        paymentMethod: 'card',
        accountId: 'acc_card_1',
        nextDueDate: '2026-07-05',
        createdAt: new Date().toISOString()
      }
    ];

    const notifications: AppNotification[] = [
      {
        id: 'not_1',
        userId: uid,
        message: 'ยินดีต้อนรับเข้าสู่ Family Wallet! เริ่มต้นจัดการเงินของคุณได้เลย',
        type: 'success',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];

    localStorage.setItem(`mock_accounts_${uid}`, JSON.stringify(accounts));
    localStorage.setItem(`mock_transactions_${uid}`, JSON.stringify(transactions));
    localStorage.setItem(`mock_budgets_${uid}`, JSON.stringify(budgets));
    localStorage.setItem(`mock_recurring_${uid}`, JSON.stringify(recurring));
    localStorage.setItem(`mock_notifications_${uid}`, JSON.stringify(notifications));

  } else {
    // Family setup
    const familyId = 'mock_family_id';
    const family: FamilyGroup = {
      id: familyId,
      name: 'ครอบครัวทาจิโร่ (Tajiro Family)',
      createdBy: uid,
      members: [uid, 'somchai.family@gmail.com', 'somsri.family@gmail.com']
    };
    localStorage.setItem(`mock_family_${familyId}`, JSON.stringify(family));

    const accounts: Account[] = [
      {
        id: 'acc_fam_sav_1',
        userId: uid,
        name: 'บัญชีออมทรัพย์ส่วนกลางครอบครัว',
        type: 'savings',
        balance: 65400,
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc_fam_sav_2',
        userId: uid,
        name: 'บัญชีออมสินสำหรับลูกชาย',
        type: 'savings',
        balance: 5500,
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc_fam_card_1',
        userId: uid,
        name: 'บัตรเครดิตร่วมครอบครัว Premium',
        type: 'credit_card',
        balance: 110000, // Remaining limit
        limit: 150000, // Total limit
        interestRate: 15,
        statementDate: 25,
        createdAt: new Date().toISOString()
      }
    ];

    const transactions: Transaction[] = [
      {
        id: 'tx_f1',
        userId: uid,
        userName: 'Tajiro (คุณพ่อ)',
        familyId,
        amount: 65000,
        type: 'income',
        category: 'เงินเดือน (Salary)',
        date: '2026-06-01',
        description: 'เงินเดือนหลักครอบครัว',
        accountId: 'acc_fam_sav_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_f2',
        userId: 'somchai.family@gmail.com',
        userName: 'สมชาย (น้องชาย)',
        familyId,
        amount: 15000,
        type: 'income',
        category: 'ธุรกิจส่วนตัว (Business)',
        date: '2026-06-10',
        description: 'รายได้พิเศษขายของออนไลน์',
        accountId: 'acc_fam_sav_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_f3',
        userId: 'somsri.family@gmail.com',
        userName: 'สมศรี (คุณแม่)',
        familyId,
        amount: 8500,
        type: 'expense',
        category: 'อาหารและเครื่องดื่ม (Food & Drinks)',
        date: '2026-06-12',
        description: 'ซื้อของสดและของใช้เข้าบ้านประจำเป็นสัปดาห์',
        accountId: 'acc_fam_sav_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_f4',
        userId: uid,
        userName: 'Tajiro (คุณพ่อ)',
        familyId,
        amount: 12500,
        type: 'expense',
        category: 'ช้อปปิ้ง (Shopping)',
        date: '2026-06-14',
        description: 'เครื่องอบผ้าเครื่องใหม่สำหรับครอบครัว',
        accountId: 'acc_fam_card_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_f5',
        userId: 'somsri.family@gmail.com',
        userName: 'สมศรี (คุณแม่)',
        familyId,
        amount: 4200,
        type: 'expense',
        category: 'บิลและสาธารณูปโภค (Bills & Utilities)',
        date: '2026-06-24',
        description: 'ค่าไฟฟ้าประจำบ้าน',
        accountId: 'acc_fam_sav_1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx_f6',
        userId: uid,
        userName: 'Tajiro (คุณพ่อ)',
        familyId,
        amount: 1200,
        type: 'expense',
        category: 'ความบันเทิง (Entertainment)',
        date: '2026-06-25',
        description: 'พาทุกคนไปดูหนังบุฟเฟ่ต์วันหยุด',
        accountId: 'acc_fam_card_1',
        createdAt: new Date().toISOString()
      }
    ];

    const budgets: Budget[] = [
      {
        id: 'bud_f1',
        familyId,
        category: 'อาหารและเครื่องดื่ม (Food & Drinks)',
        amount: 15000,
        month: '2026-06',
        createdAt: new Date().toISOString()
      },
      {
        id: 'bud_f2',
        familyId,
        category: 'ช้อปปิ้ง (Shopping)',
        amount: 10000,
        month: '2026-06',
        createdAt: new Date().toISOString()
      },
      {
        id: 'bud_f3',
        familyId,
        category: 'บิลและสาธารณูปโภค (Bills & Utilities)',
        amount: 5000,
        month: '2026-06',
        createdAt: new Date().toISOString()
      }
    ];

    const recurring: RecurringExpense[] = [
      {
        id: 'rec_f1',
        userId: uid,
        familyId,
        amount: 3200,
        name: 'ค่าอินเทอร์เน็ต + เคเบิลทีวีรายเดือน',
        category: 'บิลและสาธารณูปโภค (Bills & Utilities)',
        paymentMethod: 'card',
        accountId: 'acc_fam_card_1',
        nextDueDate: '2026-07-01',
        createdAt: new Date().toISOString()
      }
    ];

    const notifications: AppNotification[] = [
      {
        id: 'not_f1',
        userId: uid,
        message: 'ยินดีต้อนรับสู่ระบบครอบครัว! สมาชิกสามารถช่วยกันบันทึกรายรับรายจ่ายได้ร่วมกันแบบเรียลไทม์',
        type: 'success',
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'not_f2',
        userId: uid,
        message: 'แจ้งเตือน: ค่าช้อปปิ้งรวมของครอบครัวทะลุ 125% ของงบประมาณ 10,000 บาทแล้ว!',
        type: 'warning',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];

    localStorage.setItem(`mock_accounts_${uid}`, JSON.stringify(accounts));
    localStorage.setItem(`mock_transactions_${uid}`, JSON.stringify(transactions));
    localStorage.setItem(`mock_budgets_${uid}`, JSON.stringify(budgets));
    localStorage.setItem(`mock_recurring_${uid}`, JSON.stringify(recurring));
    localStorage.setItem(`mock_notifications_${uid}`, JSON.stringify(notifications));
  }

  window.dispatchEvent(new Event('storage'));
}

export async function updateAccount(uid: string, accountId: string, updates: Partial<Account>) {
  if (isMockUser(uid)) {
    const key = `mock_accounts_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: Account[] = JSON.parse(current);
      list = list.map(item => item.id === accountId ? { ...item, ...updates } : item);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  const docRef = doc(db, 'accounts', accountId);
  await updateDoc(docRef, cleanUndefined(updates));
}

export async function updateTransaction(uid: string, transactionId: string, oldTx: Transaction, updates: Partial<Transaction>) {
  const updatedTx = { ...oldTx, ...updates };

  if (isMockUser(uid)) {
    // 1. Update transaction list
    const key = `mock_transactions_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: Transaction[] = JSON.parse(current);
      list = list.map(item => item.id === transactionId ? updatedTx : item);
      localStorage.setItem(key, JSON.stringify(list));
    }

    // 2. Adjust account balances
    const accountsKey = `mock_accounts_${uid}`;
    const accountsData = localStorage.getItem(accountsKey);
    if (accountsData) {
      const accounts: Account[] = JSON.parse(accountsData);
      
      // Revert old transaction balance impact
      const oldAccIdx = accounts.findIndex(a => a.id === oldTx.accountId);
      if (oldAccIdx !== -1) {
        if (oldTx.type === 'income') {
          accounts[oldAccIdx].balance -= oldTx.amount;
        } else {
          accounts[oldAccIdx].balance += oldTx.amount;
        }
      }

      // Apply new transaction balance impact
      const newAccIdx = accounts.findIndex(a => a.id === updatedTx.accountId);
      if (newAccIdx !== -1) {
        if (updatedTx.type === 'income') {
          accounts[newAccIdx].balance += updatedTx.amount;
        } else {
          accounts[newAccIdx].balance -= updatedTx.amount;
        }
      }

      localStorage.setItem(accountsKey, JSON.stringify(accounts));
    }

    window.dispatchEvent(new Event('storage'));
    return;
  }

  // Real Firebase Transaction edit
  // 1. Update the transaction document
  const txRef = doc(db, 'transactions', transactionId);
  await updateDoc(txRef, cleanUndefined(updates));

  // 2. Adjust account balances
  // Revert old account impact
  const oldAccRef = doc(db, 'accounts', oldTx.accountId);
  const oldAccSnap = await getDoc(oldAccRef);
  if (oldAccSnap.exists()) {
    const oldAcc = oldAccSnap.data() as Account;
    const diff = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
    await updateDoc(oldAccRef, { balance: oldAcc.balance + diff });
  }

  // Apply new account impact
  const newAccRef = doc(db, 'accounts', updatedTx.accountId);
  const newAccSnap = await getDoc(newAccRef);
  if (newAccSnap.exists()) {
    const newAcc = newAccSnap.data() as Account;
    const diff = updatedTx.type === 'income' ? updatedTx.amount : -updatedTx.amount;
    if (oldTx.accountId === updatedTx.accountId) {
      const reSnap = await getDoc(newAccRef);
      if (reSnap.exists()) {
        const reAcc = reSnap.data() as Account;
        await updateDoc(newAccRef, { balance: reAcc.balance + diff });
      }
    } else {
      await updateDoc(newAccRef, { balance: newAcc.balance + diff });
    }
  }
}

export async function updateBudget(uid: string, id: string, updates: Partial<Budget>) {
  if (isMockUser(uid)) {
    const key = `mock_budgets_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: Budget[] = JSON.parse(current);
      list = list.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  const docRef = doc(db, 'budgets', id);
  await updateDoc(docRef, cleanUndefined(updates));
}

export async function deleteBudget(uid: string, id: string) {
  if (isMockUser(uid)) {
    const key = `mock_budgets_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: Budget[] = JSON.parse(current);
      list = list.filter(item => item.id !== id);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  const docRef = doc(db, 'budgets', id);
  await deleteDoc(docRef);
}

export async function updateCustomCategory(uid: string, id: string, updates: Partial<CustomCategory>) {
  if (isMockUser(uid)) {
    const key = `mock_custom_categories_${uid}`;
    const current = localStorage.getItem(key);
    if (current) {
      let list: CustomCategory[] = JSON.parse(current);
      list = list.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem(key, JSON.stringify(list));
      window.dispatchEvent(new Event('storage'));
    }
    return;
  }

  const docRef = doc(db, 'custom_categories', id);
  await updateDoc(docRef, cleanUndefined(updates));
}

