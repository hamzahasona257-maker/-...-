import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Phone, AlertCircle, ShieldCheck, Key, RefreshCw } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { UserProfile } from '../types.ts';
import { api, setToken } from '../lib/api.ts';

interface AuthModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  isAdminTarget?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  lang,
  isOpen,
  onClose,
  onSuccess,
  isAdminTarget = false,
}) => {
  const t = translations[lang];
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER' | 'OWNER_SETUP'>('LOGIN');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetKey, setResetKey] = useState('');
  const [showResetKeyInput, setShowResetKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAdminSetup();
    }
  }, [isOpen, isAdminTarget]);

  if (!isOpen) return null;

  const checkAdminSetup = async () => {
    try {
      const res = await api.getSetupStatus();
      if (!res.isSetup) {
        setNeedsSetup(true);
        if (isAdminTarget) {
          setTab('OWNER_SETUP');
        }
      } else {
        setNeedsSetup(false);
        setTab('LOGIN');
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'OWNER_SETUP') {
        const res = await api.setupAdmin({
          name,
          email,
          phone,
          password,
          resetKey: resetKey.trim() || undefined,
        });
        setToken(res.token);
        onSuccess(res.user);
        onClose();
      } else if (tab === 'LOGIN') {
        const cleanIdentifier = email.trim();
        const res = await api.login({ email: cleanIdentifier, password });
        setToken(res.token);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.register({ name, email, phone, password });
        setToken(res.token);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'فشلت عملية التحقق' : 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4D8D] to-[#06B6D4] text-white flex items-center justify-center font-black">
              W
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {isAdminTarget
                  ? (needsSetup || tab === 'OWNER_SETUP'
                      ? (lang === 'ar' ? 'إنشاء حساب مالك المتجر (Owner)' : 'Create Owner Account')
                      : (lang === 'ar' ? 'تسجيل دخول الإدارة والمالك' : 'Admin & Owner Login'))
                  : (tab === 'LOGIN' ? t.login : t.register)}
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                {isAdminTarget
                  ? (lang === 'ar' ? 'بوابة إدارة ويف دونتس المخصصة' : 'Wave Donuts Management Portal')
                  : `${t.brand} · ${t.slogan}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers & Role Info */}
        <div className="px-6 pt-4">
          {isAdminTarget ? (
            needsSetup || tab === 'OWNER_SETUP' ? (
              <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 text-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-cyan-900">
                    {lang === 'ar' ? 'إنشاء حساب مالك المتجر الأول (Create First Owner Account)' : 'Create First Owner Account'}
                  </p>
                  <p className="text-xs text-cyan-800 mt-1 leading-relaxed">
                    {lang === 'ar'
                      ? 'لا يوجد حساب مالك مسجل حالياً. أدخل بياناتك أدناه وسيصبح هذا الحساب تلقائياً هو المالك الوحيد للمتجر بكامل الصلاحيات، وسيتم إغلاق التسجيل نهائياً.'
                      : 'No owner currently exists. Register below to become the sole Store Owner with full administrative authority. First-owner registration will be permanently closed.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-pink-600 shrink-0" />
                  <span className="font-bold text-slate-900">
                    {lang === 'ar'
                      ? 'بوابة تسجيل الدخول الآمنة للإدارة ومالك المتجر'
                      : 'Secure Portal for Store Owner and Administrators'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ar'
                    ? 'يرجى تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور المعتمدة.'
                    : 'Please sign in with your authorized email and password.'}
                </p>
              </div>
            )
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setTab('LOGIN'); setError(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  tab === 'LOGIN' ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t.login}
              </button>
              <button
                type="button"
                onClick={() => { setTab('REGISTER'); setError(null); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  tab === 'REGISTER' ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t.register}
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {(tab === 'REGISTER' || tab === 'OWNER_SETUP') && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t.name}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute top-3.5 right-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: أحمد محمد (مالك المتجر)' : 'e.g. Ahmed Mohamed (Store Owner)'}
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t.phone}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute top-3.5 right-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678 أو +201..."
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {tab === 'LOGIN'
                ? (lang === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف المسجل' : 'Email or Registered Phone')
                : t.email}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute top-3.5 right-3" />
              <input
                type={tab === 'LOGIN' ? 'text' : 'email'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  tab === 'LOGIN'
                    ? (lang === 'ar' ? 'owner@wavedonuts.eg أو 010xxxxxxxx' : 'owner@wavedonuts.eg or 010xxxxxxxx')
                    : (isAdminTarget ? 'admin@wavedonuts.eg' : 'name@example.com')
                }
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t.password}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute top-3.5 right-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF4D8D] to-[#06B6D4] text-white font-extrabold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <span>{lang === 'ar' ? 'جاري التحقق...' : 'Authenticating...'}</span>
            ) : tab === 'OWNER_SETUP' ? (
              lang === 'ar' ? 'تأكيد تأسيس حساب مالك المتجر' : 'Establish Owner Account'
            ) : tab === 'LOGIN' ? (
              t.login
            ) : (
              t.register
            )}
          </button>

          {/* Quick link to Switch to Owner Setup ONLY if in admin target and no owner exists yet */}
          {isAdminTarget && needsSetup && tab === 'LOGIN' && (
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setTab('OWNER_SETUP'); setError(null); }}
                className="text-[11px] text-cyan-600 hover:text-cyan-700 font-bold transition cursor-pointer"
              >
                {lang === 'ar' ? 'تأسيس حساب مالك المتجر لأول مرة؟ اضغط هنا' : 'Store Owner? Click here to setup your Owner account'}
              </button>
            </div>
          )}

          {tab === 'OWNER_SETUP' && (
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => { setTab('LOGIN'); setError(null); }}
                className="text-[11px] text-slate-400 hover:text-slate-700 font-bold transition cursor-pointer"
              >
                {lang === 'ar' ? 'العودة لتسجيل الدخول المعتاد' : 'Back to Standard Sign In'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
