import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, Megaphone } from 'lucide-react';
import { Advertisement, AdPlacement, Language } from '../types';

interface AdvertisementBannersProps {
  placement: AdPlacement;
  advertisements: Advertisement[];
  lang: Language;
}

export const AdvertisementBanners: React.FC<AdvertisementBannersProps> = ({
  placement,
  advertisements,
  lang,
}) => {
  const isAr = lang === 'ar';
  const relevantAds = advertisements.filter((ad) => ad.placement === placement && ad.isActive);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance if multiple ads exist in this slot
  useEffect(() => {
    if (relevantAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % relevantAds.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [relevantAds.length]);

  if (relevantAds.length === 0) {
    return null;
  }

  const currentAd = relevantAds[currentIndex % relevantAds.length];
  const title = isAr ? currentAd.titleAr : (currentAd.titleEn || currentAd.titleAr);
  const desc = isAr ? currentAd.descriptionAr : (currentAd.descriptionEn || currentAd.descriptionAr);

  // Multi-image check inside current ad
  const images = currentAd.images && currentAd.images.length > 0 ? currentAd.images : (currentAd.imageUrl ? [currentAd.imageUrl] : []);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % relevantAds.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + relevantAds.length) % relevantAds.length);
  };

  if (placement === 'TOP_HERO') {
    return (
      <div className="w-full bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white shadow-sm relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="p-1 rounded-lg bg-white/20 backdrop-blur-md shrink-0">
              <Megaphone className="w-3.5 h-3.5 text-white animate-bounce" />
            </span>
            <div className="truncate">
              <span className="font-black text-amber-200 ml-1.5">{title}</span>
              {desc && <span className="text-white/90 hidden md:inline">— {desc}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentAd.linkUrl && (
              <a
                href={currentAd.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-pink-700 font-black text-xs hover:bg-pink-50 transition shadow-xs"
              >
                <span>{isAr ? 'عرض التفاصيل' : 'Learn More'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {relevantAds.length > 1 && (
              <div className="flex items-center gap-1 bg-black/20 rounded-full px-1.5 py-0.5">
                <button
                  onClick={handlePrev}
                  className="p-1 hover:text-amber-200 transition"
                  aria-label="Previous Ad"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1">
                  {currentIndex + 1}/{relevantAds.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-1 hover:text-amber-200 transition"
                  aria-label="Next Ad"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (placement === 'BETWEEN_SECTIONS') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10">
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-pink-100 bg-slate-900 group">
          {images.length > 0 ? (
            <div className="relative h-44 sm:h-60 md:h-72 w-full overflow-hidden">
              <img
                src={images[0]}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
            </div>
          ) : (
            <div className="h-44 sm:h-60 w-full bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500" />
          )}

          {/* Text Overlay */}
          <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-center max-w-xl text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-300 text-xs font-black w-fit mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعلان خاص من Wave Donuts' : 'Special Highlight'}</span>
            </div>
            <h3 className="text-xl sm:text-3xl font-black leading-tight drop-shadow-md">
              {title}
            </h3>
            {desc && (
              <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 mt-2 leading-relaxed">
                {desc}
              </p>
            )}

            {currentAd.linkUrl && (
              <div className="mt-4">
                <a
                  href={currentAd.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-amber-300 transition shadow-lg"
                >
                  <span>{isAr ? 'استكشف الآن' : 'Explore Now'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Multiple ads slider arrows */}
          {relevantAds.length > 1 && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full text-white">
              <button
                onClick={handlePrev}
                className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono">
                {currentIndex + 1} / {relevantAds.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // FOOTER_BANNER
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-50 via-pink-50 to-orange-50 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {images.length > 0 && (
            <img
              src={images[0]}
              alt={title}
              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-amber-200"
            />
          )}
          <div>
            <h4 className="text-sm font-black text-slate-900">{title}</h4>
            {desc && <p className="text-xs text-slate-600 mt-0.5">{desc}</p>}
          </div>
        </div>

        {currentAd.linkUrl && (
          <a
            href={currentAd.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition shrink-0 inline-flex items-center gap-1.5 shadow-xs"
          >
            <span>{isAr ? 'عرض الإعلان' : 'View Promo'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
