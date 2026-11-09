import React, { useState } from 'react';
import { X, ShoppingBag, Sparkles, Plus, Minus, CheckCircle, Clock } from 'lucide-react';
import { SpecialOffer, Language } from '../types';

interface OfferDetailsModalProps {
  offer: SpecialOffer;
  lang: Language;
  onClose: () => void;
  onAddToCart: (offer: SpecialOffer, quantity: number) => void;
}

export const OfferDetailsModal: React.FC<OfferDetailsModalProps> = ({
  offer,
  lang,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const isAr = lang === 'ar';
  const name = isAr ? offer.nameAr : (offer.nameEn || offer.nameAr);
  const desc = isAr ? offer.descriptionAr : (offer.descriptionEn || offer.descriptionAr);

  const handleAdd = () => {
    onAddToCart(offer, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95 duration-200"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header / Image Hero */}
        <div className="relative h-56 sm:h-64 bg-gradient-to-tr from-amber-500 via-orange-500 to-pink-500 overflow-hidden shrink-0">
          {offer.imageUrl ? (
            <img
              src={offer.imageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white">
              <span className="text-6xl mb-2">🎁</span>
              <span className="font-black text-xl">Wave Donuts</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Badge */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              {isAr ? 'عرض خاص ومميز' : 'Special Deal'}
            </span>
          </div>

          {/* Title on Image */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
              {name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow-md font-mono">
                {offer.price} {isAr ? 'ج.م.' : 'EGP'}
              </span>
              {offer.endDate && (
                <span className="inline-flex items-center gap-1 text-[11px] text-white/90 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full font-medium">
                  <Clock className="w-3 h-3" />
                  {isAr ? 'صالح حتى:' : 'Valid until:'} {offer.endDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {desc && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100">
              {desc}
            </p>
          )}

          {/* Included Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>🍩</span>
                <span>{isAr ? 'محتويات ومكونات العرض' : 'Included Items in this Offer'}</span>
              </h3>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                {offer.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} {isAr ? 'قطع مشمولة' : 'total items'}
              </span>
            </div>

            <div className="space-y-2">
              {offer.items && offer.items.length > 0 ? (
                offer.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 hover:border-amber-200 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center font-black text-sm shrink-0 border border-amber-200/50">
                        ×{item.quantity}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {isAr ? item.productNameAr : (item.productNameEn || item.productNameAr)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          {isAr ? 'مشمول ضمن بوكس العرض' : 'Included in the bundle'}
                        </p>
                      </div>
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">
                  {isAr ? 'لا توجد أصناف محددة' : 'No items listed'}
                </p>
              )}
            </div>
          </div>

          {/* Price Summary Note */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 flex items-center justify-between font-semibold">
            <span>{isAr ? 'السعر النهائي للعرض شاملاً كافة القطع:' : 'Bundle total price:'}</span>
            <span className="font-black text-sm font-mono">{offer.price * quantity} {isAr ? 'ج.م.' : 'EGP'}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center font-black text-sm font-mono text-slate-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAdd}
            disabled={added}
            className={`flex-1 py-3 px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer ${
              added
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-600 hover:via-orange-600 hover:to-pink-600 text-white shadow-amber-200'
            }`}
          >
            {added ? (
              <>
                <CheckCircle className="w-4 h-4 animate-bounce" />
                <span>{isAr ? 'تمت الإضافة إلى السلة بنجاح!' : 'Added to Cart!'}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isAr ? 'أضف العرض إلى السلة' : 'Add Offer to Cart'} • {offer.price * quantity} {isAr ? 'ج.م.' : 'EGP'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
