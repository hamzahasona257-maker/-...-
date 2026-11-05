import React from 'react';
import { ShieldCheck, Heart, Clock, Phone, MessageCircle } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { StoreSettings } from '../types.ts';

interface FooterProps {
  lang: Language;
  settings: StoreSettings | null;
  onOpenTracking: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  lang,
  settings,
  onOpenTracking,
  onOpenAdmin,
}) => {
  const t = translations[lang];

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 font-[Cairo]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-right">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-cyan-400 text-white flex items-center justify-center font-black text-base shadow-xs">
                W
              </div>
              <span className="text-lg font-black text-white">{t.brand}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t.slogan} {lang === 'ar' ? 'متخصصون في تقديم أشهى وألذ الدونتس المخبوزة طازجة في مصر.' : 'Handcrafting fresh artisanal brioche donuts in Egypt.'}
            </p>
            <div className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>{t.cod}</span>
            </div>
          </div>

          {/* Working Hours */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {t.workingHours}
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                <span>{settings?.workingHoursAr || (lang === 'ar' ? 'يومياً: ١٠:٠٠ ص – ١١:٠٠ م' : 'Daily: 10:00 AM – 11:00 PM')}</span>
              </li>
              <li>{lang === 'ar' ? 'دفعات خبز طازجة ومستمرة' : 'Continuous Fresh Bake Batches'}</li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#menu" className="hover:text-pink-400 transition-colors">
                  {t.ourMenu}
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-cyan-400 transition-colors text-right cursor-pointer"
                >
                  {t.trackOrder}
                </button>
              </li>
              <li>
                <a href="#story" className="hover:text-pink-400 transition-colors">
                  {lang === 'ar' ? 'عن ويف دونتس' : 'About Wave'}
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenAdmin}
                  className="hover:text-slate-200 transition-colors text-right cursor-pointer text-slate-500"
                >
                  {t.adminPortal}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {t.contactUs}
            </h4>
            <div className="space-y-2 text-slate-400">
              {settings?.phone && (
                <p className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <a href={`tel:${settings.phone}`} className="hover:text-white transition">
                    {settings.phone}
                  </a>
                </p>
              )}
              {settings?.whatsapp && (
                <p className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-emerald-400 transition"
                  >
                    {t.whatsappOrder}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} {t.brand}. {t.slogan}</p>
          <p className="flex items-center gap-1">
            <span>صُنع بحب</span>
            <Heart className="w-3.5 h-3.5 text-pink-500 inline fill-pink-500" />
            <span>وبأجود زبدة فرنسية في مصر</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
