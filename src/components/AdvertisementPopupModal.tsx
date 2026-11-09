import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { Advertisement, Language } from '../types';

interface AdvertisementPopupModalProps {
  advertisements: Advertisement[];
  lang: Language;
}

export const AdvertisementPopupModal: React.FC<AdvertisementPopupModalProps> = ({
  advertisements,
  lang,
}) => {
  const isAr = lang === 'ar';
  const popupAds = advertisements.filter((ad) => ad.placement === 'POPUP_MODAL' && ad.isActive);

  const [isOpen, setIsOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (popupAds.length === 0) return;

    // Check if dismissed in this session
    const dismissedId = sessionStorage.getItem('wave_dismissed_popup_ad');
    const firstAd = popupAds[0];

    if (dismissedId !== firstAd.id) {
      // Small timeout to not startle instantly
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [popupAds]);

  if (!isOpen || popupAds.length === 0) {
    return null;
  }

  const ad = popupAds[0];
  const title = isAr ? ad.titleAr : (ad.titleEn || ad.titleAr);
  const desc = isAr ? ad.descriptionAr : (ad.descriptionEn || ad.descriptionAr);
  const images = ad.images && ad.images.length > 0 ? ad.images : (ad.imageUrl ? [ad.imageUrl] : []);

  const handleClose = () => {
    sessionStorage.setItem('wave_dismissed_popup_ad', ad.id);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-pink-100 flex flex-col animate-in zoom-in-95 duration-200 relative max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media / Carousel */}
        {images.length > 0 ? (
          <div className="relative h-60 sm:h-72 bg-slate-900 shrink-0 overflow-hidden">
            <img
              src={images[activeImageIndex % images.length]}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {images.length > 1 && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                <button
                  onClick={() =>
                    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
                  }
                  className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex gap-1.5">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === (activeImageIndex % images.length)
                          ? 'w-6 bg-pink-500'
                          : 'w-1.5 bg-white/60'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                  className="p-1 rounded-full bg-black/40 hover:bg-black/60 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shrink-0">
            <Megaphone className="w-12 h-12" />
          </div>
        )}

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-black">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعلان هام من Wave Donuts' : 'Announcement'}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
            {title}
          </h3>

          {desc && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {desc}
            </p>
          )}

          {ad.linkUrl && (
            <div className="pt-2">
              <a
                href={ad.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-600 to-amber-500 hover:from-pink-700 hover:to-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <span>{isAr ? 'انتقل إلى الرابط' : 'Visit Link'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-center">
          <button
            onClick={handleClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold py-1 px-4 cursor-pointer"
          >
            {isAr ? 'إغلاق ومتابعة التسوق' : 'Close and continue'}
          </button>
        </div>
      </div>
    </div>
  );
};
