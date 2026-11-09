import React from 'react';
import { Sparkles, ShoppingBag, ArrowLeft, ArrowRight, Eye, Clock, Check } from 'lucide-react';
import { SpecialOffer, Language } from '../types';

interface SpecialOffersSectionProps {
  offers: SpecialOffer[];
  lang: Language;
  onSelectOffer: (offer: SpecialOffer) => void;
  onQuickAddToCart: (offer: SpecialOffer) => void;
}

export const SpecialOffersSection: React.FC<SpecialOffersSectionProps> = ({
  offers,
  lang,
  onSelectOffer,
  onQuickAddToCart,
}) => {
  if (!offers || offers.length === 0) {
    return null;
  }

  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <section className="py-8 bg-gradient-to-b from-amber-50/70 via-orange-50/40 to-transparent relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black mb-2 shadow-xs border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>{isAr ? 'عروض وبوكسات حصرية مميزة' : 'Exclusive Special Offers'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isAr ? 'عروض Wave Donuts الخاصة 🔥' : 'Wave Donuts Hot Deals 🔥'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              {isAr
                ? 'تشكيلات خاصة وبوكسات عائلية من أشهى الدونات والمشروبات بأسعار توفير مميزة'
                : 'Curated donut boxes and bundles with special savings'}
            </p>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-200/60 self-start sm:self-end">
            {offers.length} {isAr ? 'عروض متاحة الآن' : 'Offers available'}
          </span>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const name = isAr ? offer.nameAr : (offer.nameEn || offer.nameAr);
            const desc = isAr ? offer.descriptionAr : (offer.descriptionEn || offer.descriptionAr);
            const totalItemsCount = offer.items ? offer.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0;

            return (
              <div
                key={offer.id}
                className="group bg-white rounded-3xl border border-amber-200/80 shadow-md hover:shadow-xl hover:border-amber-400 transition-all duration-300 flex flex-col overflow-hidden relative"
              >
                {/* Image & Badges */}
                <div
                  className="relative h-48 sm:h-52 bg-gradient-to-tr from-amber-400 to-orange-400 overflow-hidden cursor-pointer"
                  onClick={() => onSelectOffer(offer)}
                >
                  {offer.imageUrl ? (
                    <img
                      src={offer.imageUrl}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white">
                      <span className="text-5xl mb-1">🎁</span>
                      <span className="text-sm font-black">Wave Box</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-[11px] shadow-md">
                      🔥 {isAr ? 'بوكس التوفير' : 'Savings Box'}
                    </span>
                    {totalItemsCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white font-bold text-[11px] backdrop-blur-md">
                        {totalItemsCount} {isAr ? 'قطع' : 'items'}
                      </span>
                    )}
                  </div>

                  {/* Bottom Price in Image */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <span className="text-2xl font-black text-amber-300 drop-shadow-md font-mono">
                      {offer.price} {isAr ? 'ج.م.' : 'EGP'}
                    </span>
                    {offer.endDate && (
                      <span className="text-[10px] bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full font-medium text-white/90 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {offer.endDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => onSelectOffer(offer)}
                      className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1 cursor-pointer"
                    >
                      {name}
                    </h3>
                    {desc && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {desc}
                      </p>
                    )}

                    {/* Included items summary chips */}
                    {offer.items && offer.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {offer.items.slice(0, 3).map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70 px-2 py-0.5 rounded-lg"
                          >
                            <span className="text-amber-600">×{it.quantity}</span>
                            <span className="truncate max-w-[120px]">
                              {isAr ? it.productNameAr : (it.productNameEn || it.productNameAr)}
                            </span>
                          </span>
                        ))}
                        {offer.items.length > 3 && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            +{offer.items.length - 3} {isAr ? 'المزيد' : 'more'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onSelectOffer(offer)}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isAr ? 'عرض التفاصيل' : 'Details'}</span>
                      <ArrowIcon className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => onQuickAddToCart(offer)}
                      className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      title={isAr ? 'أضف العرض إلى السلة' : 'Add to Cart'}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isAr ? 'أضف' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
