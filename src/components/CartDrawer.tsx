import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { CartItem, DeliveryLocation } from '../types.ts';

interface CartDrawerProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  locations: DeliveryLocation[];
  selectedLocation: DeliveryLocation | null;
  onSelectLocation: (loc: DeliveryLocation) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  lang,
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  locations,
  selectedLocation,
  onSelectLocation,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const t = translations[lang];

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = selectedLocation ? selectedLocation.deliveryFee : (locations[0]?.deliveryFee || 0);
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-r border-slate-100 animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{t.cart}</h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                {items.length} {lang === 'ar' ? 'أصناف في العلبة' : 'donut item(s)'}
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

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-pink-50 flex items-center justify-center text-3xl">
                🍩
              </div>
              <p className="text-sm font-semibold text-slate-600 max-w-xs">{t.emptyCart}</p>
            </div>
          ) : (
            items.map((item, index) => {
              const displayImg = item.product.mainImage || (item.product.images && item.product.images[0]) || '';
              return (
                <div
                  key={index}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex gap-3 items-center"
                >
                  {displayImg ? (
                    <img
                      src={displayImg}
                      alt={item.product.nameAr}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-xl shrink-0">
                      🍩
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.product.nameAr}
                    </h4>
                    {item.selectedOption && (
                      <p className="text-[10px] text-pink-600 font-medium truncate mt-0.5">
                        {item.selectedOption}
                      </p>
                    )}
                    {item.selectedProductOptions && item.selectedProductOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedProductOptions.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="inline-flex items-center text-[9px] bg-cyan-50 text-cyan-800 px-1.5 py-0.5 rounded border border-cyan-200 font-medium"
                          >
                            {opt.nameAr}
                            {opt.priceDelta > 0 ? ` (+${opt.priceDelta} ج.م.)` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.selectedCustomizations && item.selectedCustomizations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedCustomizations.map((sc, scIdx) => (
                          <span
                            key={scIdx}
                            className="inline-flex items-center text-[9px] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded border border-pink-200"
                          >
                            {sc.optionNameAr || sc.textValue || sc.numberValue}
                            {sc.priceDelta > 0 ? ` (+${sc.priceDelta} ج.م.)` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs font-black text-slate-900 mt-1 tabular-nums font-mono">
                      {item.unitPrice * item.quantity} {t.currency}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => onRemoveItem(index)}
                      className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                      title={t.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                        className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-4 text-center text-xs font-bold tabular-nums font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary & Checkout Section */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-white space-y-4">
            {/* Delivery Location Preview */}
            {locations.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{lang === 'ar' ? 'منطقة التوصيل' : 'Delivery Area'}</span>
                </label>
                <select
                  value={selectedLocation?.id || locations[0]?.id || ''}
                  onChange={(e) => {
                    const l = locations.find((item) => item.id === e.target.value);
                    if (l) onSelectLocation(l);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-pink-500 bg-slate-50"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.governorate} - {loc.city} ({loc.area}) (+{loc.deliveryFee} ج.م.)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Calculations in Egyptian Pounds */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>{t.subtotal}</span>
                <span className="font-bold tabular-nums text-slate-900 font-mono">{subtotal} {t.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.deliveryFee}</span>
                <span className="font-bold tabular-nums text-cyan-600 font-mono">
                  {deliveryFee > 0 ? `${deliveryFee} ${t.currency}` : (lang === 'ar' ? 'حسب العنوان' : 'Per location')}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>{t.total}</span>
                <span className="text-pink-600 tabular-nums font-mono">{total} {t.currency}</span>
              </div>
            </div>

            {/* Cash on Delivery Trust Banner */}
            <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200/80 flex items-center gap-2 text-xs text-cyan-900">
              <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
              <span className="font-semibold">{t.codNotice}</span>
            </div>

            {/* Checkout Action */}
            <button
              onClick={onProceedToCheckout}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-l from-[#FF4D8D] to-[#06B6D4] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-between cursor-pointer"
            >
              <span>{t.checkout}</span>
              <ArrowLeft className={`w-4 h-4 ${lang === 'en' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
