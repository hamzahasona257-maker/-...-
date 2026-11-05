import React from 'react';
import { ArrowLeft, Sparkles, Compass, MessageCircle } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { StoreSettings } from '../types.ts';

interface HeroProps {
  lang: Language;
  settings: StoreSettings | null;
  onOrderClick: () => void;
  onTrackClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ lang, settings, onOrderClick, onTrackClick }) => {
  const t = translations[lang];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-pink-50/70 via-white to-slate-50 pt-8 pb-12 border-b border-pink-100">
      {/* Subtle organic ambient radial gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-200/25 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800 bg-cyan-50 px-4 py-1.5 rounded-full border border-cyan-200/80 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
          <span>{settings?.sloganAr || t.slogan}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.18]">
          {lang === 'ar' ? (
            <>
              اركب{' '}
              <span className="bg-gradient-to-l from-pink-500 via-pink-600 to-cyan-500 bg-clip-text text-transparent underline decoration-cyan-400 decoration-wavy decoration-3">
                موجة الحلاوة
              </span>{' '}
              مع أشهى دونتس طازجة
            </>
          ) : (
            <>
              Ride the{' '}
              <span className="bg-gradient-to-r from-pink-500 via-pink-600 to-cyan-500 bg-clip-text text-transparent underline decoration-cyan-400 decoration-wavy decoration-3">
                Sweet Wave
              </span>{' '}
              of Fresh Artisan Donuts
            </>
          )}
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          {settings?.aboutAr ||
            (lang === 'ar'
              ? 'دونتس فاخرة مخبوزة وطازجة يومياً مع خيارات ومشروبات مميزة، تصلك إلى باب منزلك مع الدفع عند الاستلام كاش.'
              : 'Handcrafted fresh artisanal donuts and drinks delivered directly to your door with Cash on Delivery.')}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <button
            onClick={onOrderClick}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-l from-[#FF4D8D] to-[#06B6D4] text-white font-extrabold text-base shadow-lg shadow-pink-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>{t.orderNow}</span>
            <ArrowLeft className={`w-5 h-5 ${lang === 'en' ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={onTrackClick}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-slate-800 font-bold text-sm border border-slate-200 hover:border-pink-300 hover:bg-pink-50/50 shadow-xs transition cursor-pointer"
          >
            <Compass className="w-4 h-4 text-pink-500" />
            <span>{t.trackOrder}</span>
          </button>

          {settings?.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-50 text-emerald-800 font-bold text-sm border border-emerald-200 hover:bg-emerald-100 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{t.whatsappOrder}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
