import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Loader2, CheckCircle, AlertCircle, Trash2, Check, FileText, ArrowRight } from 'lucide-react';
import { addTransaction } from '../dbService';
import { Account, CustomCategory, CATEGORIES } from '../types';
import { formatCurrency } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface ReceiptScannerProps {
  user: any;
  profile: any;
  accounts: Account[];
  customCategories: CustomCategory[];
  onScanComplete?: (data: any) => void;
}

interface SlipItem {
  id: string;
  file: File;
  previewUrl: string;
  loading: boolean;
  error: string | null;
  amount: number;
  date: string;
  storeName: string;
  description: string;
  category: string;
  accountId: string;
  isSaved: boolean;
}

export default function ReceiptScanner({ user, profile, accounts, customCategories, onScanComplete }: ReceiptScannerProps) {
  const [slips, setSlips] = useState<SlipItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getExpenseCategories = () => {
    return [...CATEGORIES.expense, ...customCategories.filter(c => c.type === 'expense').map(c => c.name)];
  };

  const processFiles = async (selectedFiles: FileList) => {
    // Limit to 10 slips
    const totalCurrentAndNew = slips.length + selectedFiles.length;
    if (totalCurrentAndNew > 10) {
      alert('คุณสามารถอัปโหลดใบเสร็จ/สลิปได้สูงสุด 10 ใบพร้อมกันเท่านั้น');
      return;
    }

    const newSlips: SlipItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file.type.startsWith('image/')) {
        alert(`ไฟล์ ${file.name} ไม่ใช่ไฟล์รูปภาพหลัก`);
        continue;
      }

      const id = 'slip_' + Math.random().toString(36).substring(2, 9);
      
      // Create local preview
      const previewUrl = URL.createObjectURL(file);

      const defaultAccount = accounts.length > 0 ? accounts[0].id : '';

      const newSlip: SlipItem = {
        id,
        file,
        previewUrl,
        loading: true,
        error: null,
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        storeName: '',
        description: '',
        category: getExpenseCategories()[0],
        accountId: defaultAccount,
        isSaved: false
      };

      newSlips.push(newSlip);
    }

    setSlips(prev => [...prev, ...newSlips]);

    // Start scanning each new slip in parallel
    newSlips.forEach(slip => {
      scanIndividualSlip(slip);
    });
  };

  const scanIndividualSlip = async (slip: SlipItem) => {
    const base64Reader = new FileReader();
    base64Reader.readAsDataURL(slip.file);
    base64Reader.onloadend = async () => {
      try {
        const base64Data = base64Reader.result as string;
        const response = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Data,
            mimeType: slip.file.type,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'ไม่สามารถแสกนวิเคราะห์สลิปนี้ได้');
        }

        const data = await response.json();
        
        // Match parsed category or use default
        let matchedCategory = getExpenseCategories()[0];
        const categoriesList = getExpenseCategories();
        if (data.suggestedCategory) {
          const match = categoriesList.find(c => c.toLowerCase().includes(data.suggestedCategory.toLowerCase()));
          if (match) matchedCategory = match;
        }

        setSlips(prev => prev.map(item => {
          if (item.id === slip.id) {
            return {
              ...item,
              loading: false,
              amount: data.totalAmount || 0,
              date: data.date || new Date().toISOString().split('T')[0],
              storeName: data.storeName || 'ร้านค้าทั่วไป',
              description: data.description || '',
              category: matchedCategory
            };
          }
          return item;
        }));

        if (onScanComplete && slips.length === 1) {
          onScanComplete(data);
        }

      } catch (err: any) {
        console.error(err);
        setSlips(prev => prev.map(item => {
          if (item.id === slip.id) {
            return {
              ...item,
              loading: false,
              error: err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์รูปสลิปนี้'
            };
          }
          return item;
        }));
      }
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeSlip = (id: string) => {
    setSlips(prev => {
      const item = prev.find(s => s.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(s => s.id !== id);
    });
  };

  const saveIndividualSlip = async (id: string) => {
    if (!user) return;
    const slip = slips.find(s => s.id === id);
    if (!slip || slip.isSaved || slip.loading || slip.error) return;

    try {
      await addTransaction(user.uid, {
        userId: user.uid,
        userName: profile?.displayName || 'ผู้ใช้ทั่วไป',
        familyId: profile?.familyId || null,
        amount: slip.amount,
        type: 'expense',
        category: slip.category,
        date: slip.date,
        description: slip.storeName + (slip.description ? ` (${slip.description})` : ''),
        accountId: slip.accountId,
      });

      setSlips(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, isSaved: true };
        }
        return item;
      }));

    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกรายการรายจ่ายนี้');
    }
  };

  const saveAllScannedSlips = async () => {
    if (!user) return;
    const scannables = slips.filter(s => !s.isSaved && !s.loading && !s.error);
    if (scannables.length === 0) return;

    let savedCount = 0;
    for (const slip of scannables) {
      try {
        await addTransaction(user.uid, {
          userId: user.uid,
          userName: profile?.displayName || 'ผู้ใช้ทั่วไป',
          familyId: profile?.familyId || null,
          amount: slip.amount,
          type: 'expense',
          category: slip.category,
          date: slip.date,
          description: slip.storeName + (slip.description ? ` (${slip.description})` : ''),
          accountId: slip.accountId,
        });
        savedCount++;
        
        setSlips(prev => prev.map(item => {
          if (item.id === slip.id) {
            return { ...item, isSaved: true };
          }
          return item;
        }));
      } catch (err) {
        console.error('Error saving slip:', slip.id, err);
      }
    }

    if (savedCount > 0) {
      alert(`บันทึกสำเร็จเรียบร้อย ${savedCount} รายการรายจ่ายจากสลิปทั้งหมด!`);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearAllSlips = () => {
    slips.forEach(s => URL.revokeObjectURL(s.previewUrl));
    setSlips([]);
  };

  return (
    <div id="multi-receipt-scanner-container" className="space-y-6">
      {/* 1. Drag and drop Zone */}
      <div
        id="receipt-dropzone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`flex flex-col items-center justify-center py-10 px-6 text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all ${
          dragActive
            ? 'bg-indigo-50/80 border-indigo-400 scale-[1.01]'
            : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
        }`}
      >
        <input
          id="receipt-file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />

        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
          <Upload className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-slate-800">อัปโหลดสลิปหรือใบเสร็จรับเงิน</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          ลากไฟล์ภาพสลิปมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์ได้สูงสุด <strong className="text-indigo-600">10 ใบพร้อมกัน</strong> ระบบ AI จะสแกนและบันทึกอัตโนมัติ
        </p>
        <p className="text-[10px] text-slate-400 mt-2">รองรับไฟล์รูปภาพ JPEG, PNG, WEBP</p>
      </div>

      {/* 2. Control bar when files exist */}
      {slips.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">
              สลิปและใบเสร็จทั้งหมด: {slips.length} ใบ ({slips.filter(s => s.isSaved).length} บันทึกแล้ว)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {slips.some(s => !s.isSaved && !s.loading && !s.error) && (
              <button
                id="btn-save-all-slips"
                onClick={saveAllScannedSlips}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" /> บันทึกสลิปทั้งหมด
              </button>
            )}
            <button
              id="btn-clear-all-slips"
              onClick={clearAllSlips}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold py-1.5 px-3 rounded-lg hover:bg-slate-200/50 transition-all"
            >
              ล้างรายการทั้งหมด
            </button>
          </div>
        </div>
      )}

      {/* 3. Responsive list of Slips */}
      {slips.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence>
            {slips.map((slip, index) => (
              <motion.div
                key={slip.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white border rounded-2xl p-4 flex flex-col md:flex-row gap-4 shadow-sm relative transition-all ${
                  slip.isSaved ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 hover:shadow-md'
                }`}
              >
                {/* Remove slip button */}
                {!slip.isSaved && (
                  <button
                    id={`btn-remove-slip-${slip.id}`}
                    onClick={() => removeSlip(slip.id)}
                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-rose-600 p-1.5 hover:bg-slate-100 rounded-full transition-all"
                    title="ลบสลิปนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Left: Preview thumbnail and index count */}
                <div className="relative w-full md:w-32 h-32 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-50">
                  <img
                    src={slip.previewUrl}
                    alt="Slip Thumbnail"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/60 backdrop-blur-sm text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                  {slip.loading && (
                    <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm flex flex-col items-center justify-center text-white p-2">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-1" />
                      <span className="text-[9px] font-bold tracking-wider">กำลังแสกน...</span>
                    </div>
                  )}
                  {slip.isSaved && (
                    <div className="absolute inset-0 bg-emerald-900/30 backdrop-blur-[1px] flex items-center justify-center text-white">
                      <div className="bg-emerald-500 p-1.5 rounded-full shadow-lg">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Info and form inputs */}
                <div className="flex-1 space-y-3 min-w-0">
                  {slip.loading ? (
                    <div className="py-6 flex flex-col items-center justify-center h-full text-center">
                      <Sparkles className="w-6 h-6 text-indigo-500 animate-bounce mb-1" />
                      <p className="text-xs font-semibold text-slate-600">AI Gemini กำลังสแกนความละเอียดของสลิปนี้</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">โปรดรอสักครู่ ระบบกำลังดึงยอดเงิน ร้านค้า และประเภทรายการ</p>
                    </div>
                  ) : slip.error ? (
                    <div className="py-4 text-center">
                      <AlertCircle className="w-7 h-7 text-rose-500 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-rose-600">วิเคราะห์รูปนี้ไม่สำเร็จ</p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto">{slip.error}</p>
                      <button
                        id={`btn-retry-slip-${slip.id}`}
                        onClick={() => {
                          setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, loading: true, error: null } : s));
                          scanIndividualSlip(slip);
                        }}
                        className="mt-3 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition-all"
                      >
                        ลองสแกนใหม่อีกครั้ง
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Flex row for basic header of parsed data */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <p className="text-xs text-slate-400 font-semibold">ชื่อร้านค้า (Gemini ตรวจจับ)</p>
                          <input
                            type="text"
                            disabled={slip.isSaved}
                            value={slip.storeName}
                            onChange={(e) => setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, storeName: e.target.value } : s))}
                            className="text-xs font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-0.5 mt-0.5"
                            placeholder="ระบุชื่อร้านค้า"
                          />
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400 font-semibold">ยอดเงินรายจ่าย (บาท)</p>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            disabled={slip.isSaved}
                            value={slip.amount || ''}
                            onChange={(e) => setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, amount: parseFloat(e.target.value) || 0 } : s))}
                            className="text-sm font-extrabold text-indigo-600 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none text-right w-24 py-0.5 mt-0.5"
                          />
                        </div>
                      </div>

                      {/* Details & date row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block">วันที่ทำรายการ</label>
                          <input
                            type="date"
                            disabled={slip.isSaved}
                            value={slip.date}
                            onChange={(e) => setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, date: e.target.value } : s))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 mt-0.5 focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block">คำอธิบายเพิ่มเติม</label>
                          <input
                            type="text"
                            disabled={slip.isSaved}
                            value={slip.description}
                            onChange={(e) => setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, description: e.target.value } : s))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[11px] text-slate-700 mt-0.5 focus:outline-none focus:border-indigo-400"
                            placeholder="เช่น ข้าวกลางวัน"
                          />
                        </div>
                      </div>

                      {/* Category and Account row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block">หมวดหมู่รายจ่าย</label>
                          <select
                            disabled={slip.isSaved}
                            value={slip.category}
                            onChange={(e) => setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, category: e.target.value } : s))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-1 py-1 text-[11px] text-slate-700 mt-0.5 focus:outline-none focus:border-indigo-400"
                          >
                            {getExpenseCategories().map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block">แหล่งเงินที่จ่าย</label>
                          <select
                            disabled={slip.isSaved}
                            value={slip.accountId}
                            onChange={(e) => setSlips(prev => prev.map(s => s.id === slip.id ? { ...s, accountId: e.target.value } : s))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-1 py-1 text-[11px] text-slate-700 mt-0.5 focus:outline-none focus:border-indigo-400"
                          >
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.type === 'savings' ? 'ออมทรัพย์' : 'บัตรเครดิต'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Inline individual Save button */}
                      <div className="flex justify-end pt-1">
                        {slip.isSaved ? (
                          <span className="text-[11px] text-emerald-650 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-emerald-500" /> บันทึกเรียบร้อย
                          </span>
                        ) : (
                          <button
                            id={`btn-save-slip-${slip.id}`}
                            onClick={() => saveIndividualSlip(slip.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-1 px-3.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" /> บันทึกรายการนี้
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
