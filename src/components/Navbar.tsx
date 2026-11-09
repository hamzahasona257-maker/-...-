import React from 'react';
import { ShoppingBag, User, ShieldCheck, Globe } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { UserProfile, StoreSettings } from '../types.ts';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  cartCount: number;
  onOpenCart: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenTracking: () => void;
  onOpenAdmin: () => void;
  viewMode: 'STORE' | 'ADMIN';
  onSwitchView: (mode: 'STORE' | 'ADMIN') => void;
  settings: StoreSettings | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  cartCount,
  onOpenCart,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenTracking,
  onOpenAdmin,
  viewMode,
  onSwitchView,
  settings,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs font-[Cairo]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onSwitchView('STORE')}
          className="flex items-center gap-3 text-right focus-visible:outline-pink-500 rounded-xl cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF4D8D] to-[#06B6D4] flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
            <svg className="w-7 h-7" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="42" stroke="white" strokeWidth="12" />
              <path d="M25 50 Q 38 35 50 50 T 75 50" stroke="white" strokeWidth="9" strokeLinecap="round" />
            </svg>
          </div>
          <div className="whitespace-nowrap shrink-0">
            <span className="text-2xl font-black bg-gradient-to-l from-pink-600 to-cyan-600 bg-clip-text text-transparent">
              {t.brand}
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-700">
          <a href="#menu" className="hover:text-pink-600 transition-colors whitespace-nowrap shrink-0">
            {t.ourMenu}
          </a>
          <button
            onClick={onOpenTracking}
            className="hover:text-cyan-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.trackOrder}
          </button>
          <a href="#story" className="hover:text-pink-600 transition-colors whitespace-nowrap shrink-0">
            {lang === 'ar' ? 'عن ويف دونتس' : 'About Wave'}
          </a>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200 whitespace-nowrap cursor-pointer"
            title="تغيير اللغة"
          >
            <Globe className="w-4 h-4 text-cyan-600" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* Cart Bag */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 transition border border-pink-200 cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-bold">{t.cart}</span>
            {cartCount > 0 && (
              <span className="bg-gradient-to-l from-pink-500 to-cyan-500 text-white text-[11px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center font-mono">
                {cartCount}
              </span>
            )}
          </button>

          {/* User Profile or Login */}
          {currentUser ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition border border-slate-200 cursor-pointer"
            >
              <User className="w-4 h-4 text-pink-600" />
              <span className="max-w-[100px] truncate">{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>{t.login}</span>
            </button>
          )}

          {/* Admin Switcher */}
          {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'OWNER') ? (
            <button
              onClick={() => onSwitchView(viewMode === 'ADMIN' ? 'STORE' : 'ADMIN')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-xl transition border cursor-pointer ${
                viewMode === 'ADMIN'
                  ? 'bg-cyan-600 text-white border-cyan-700 shadow-xs'
                  : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border-cyan-300'
              }`}
              title={viewMode === 'ADMIN' ? t.customerStore : (currentUser.role === 'OWNER' ? (lang === 'ar' ? 'لوحة المالك' : 'Owner') : t.adminPortal)}
            >
              <ShieldCheck className={`w-4 h-4 ${viewMode === 'ADMIN' ? 'text-white' : 'text-cyan-600'}`} />
              <span className="inline text-[11px] font-black">
                {viewMode === 'ADMIN'
                  ? (lang === 'ar' ? 'المتجر' : 'Store')
                  : currentUser.role === 'OWNER'
                  ? (lang === 'ar' ? 'لوحة المالك' : 'Owner')
                  : (lang === 'ar' ? 'الإدارة' : 'Admin')}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1 px-2.5 py-2 text-slate-500 hover:text-cyan-600 text-[11px] font-bold rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/50 transition cursor-pointer"
              title={t.adminPortal}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
              <span className="inline">{lang === 'ar' ? 'دخول الإدارة' : 'Admin'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
