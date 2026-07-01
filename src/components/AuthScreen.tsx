import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Wallet, ShieldAlert, Sparkles, LogIn, User, Users } from 'lucide-react';

interface AuthScreenProps {
  onMockSignIn: (role: 'alone' | 'family') => void;
}

export default function AuthScreen({ onMockSignIn }: AuthScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google Account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-wrapper" className="min-h-screen bg-[#F1F5F9] text-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-3xl"></div>

      <div id="auth-card" className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-lg relative z-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-850 mb-2">
          Family Wallet & AI Scanner
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          ระบบจัดการรายรับรายจ่ายครอบครัวอัจฉริยะ วิเคราะห์ใบเสร็จด้วย AI และสถิติครบวงจร
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2 text-left">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Authentication */}
        <button
          id="btn-google-signin"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white text-slate-800 border border-slate-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-[0.98] transition-all mb-6 disabled:opacity-50 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.48-1.11 2.73-2.36 3.58v2.97h3.81c2.23-2.05 3.51-5.07 3.51-8.67z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.81-2.97c-1.06.71-2.42 1.13-4.15 1.13-3.19 0-5.89-2.16-6.85-5.07H1.14v3.08C3.12 21.03 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.15 14.18c-.24-.72-.38-1.49-.38-2.28 0-.79.14-1.56.38-2.28V6.54H1.14C.41 8.18 0 10.02 0 12s.41 3.82 1.14 5.46l4.01-3.28z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.31 0 3.12 2.97 1.14 6.54l4.01 3.28c.96-2.91 3.66-5.07 6.85-5.07z"
            />
          </svg>
          <span>เข้าสู่ระบบด้วย Google Account</span>
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold">หรือเข้าใช้งานแบบทดลอง</span>
          </div>
        </div>

        {/* Mock Sign-In Presets for iframe support */}
        <div className="grid grid-cols-2 gap-3">
          <button
            id="btn-mock-signin-alone"
            onClick={() => onMockSignIn('alone')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 hover:border-indigo-500/50 rounded-xl hover:bg-slate-100/50 transition-all text-left shadow-sm"
          >
            <User className="w-5 h-5 text-indigo-600 mb-1" />
            <span className="text-xs font-semibold text-slate-800">บัญชีเดี่ยวทดลอง</span>
            <span className="text-[10px] text-slate-500 mt-0.5">ส่วนบุคคล</span>
          </button>

          <button
            id="btn-mock-signin-family"
            onClick={() => onMockSignIn('family')}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 hover:border-emerald-500/50 rounded-xl hover:bg-slate-100/50 transition-all text-left shadow-sm"
          >
            <Users className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="text-xs font-semibold text-slate-800">บัญชีครอบครัวทดลอง</span>
            <span className="text-[10px] text-slate-500 mt-0.5">จำลองครอบครัว</span>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
          <span>ระบบขับเคลื่อนด้วยปัญญาประดิษฐ์ Gemini 2.5 Flash</span>
        </div>
      </div>
    </div>
  );
}
