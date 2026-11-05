import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, ShoppingBag, Check, CheckCircle2, Sparkles } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { DonutProduct, CustomizationGroup, CartItem, ProductOption } from '../types.ts';

interface ProductDetailsModalProps {
  lang: Language;
  product: DonutProduct | null;
  customizationGroups: CustomizationGroup[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  onOpenCustomizer?: (product: DonutProduct) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  lang,
  product,
  customizationGroups,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  if (!isOpen || !product) return null;

  const t = translations[lang];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Customer selection of Owner/Admin created product options
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.mainImage
      ? [product.mainImage]
      : [];

  const currentImage = images[selectedImageIndex] || '';

  // Options created by Owner/Admin for this product
  const availableOptions: ProductOption[] = useMemo(() => {
    return (product.options || []).filter((opt) => opt && opt.nameAr && opt.nameAr.trim().length > 0);
  }, [product.options]);

  // Selected options objects
  const selectedOptionsList = useMemo(() => {
    return availableOptions.filter((opt) => selectedOptionIds.includes(opt.id));
  }, [availableOptions, selectedOptionIds]);

  // Options price delta
  const optionsPriceDelta = useMemo(() => {
    return selectedOptionsList.reduce((sum, opt) => sum + (Number(opt.priceDelta) || 0), 0);
  }, [selectedOptionsList]);

  // Unit price and total price in EGP
  const basePrice = Number(product.basePrice) || 0;
  const unitPrice = basePrice + optionsPriceDelta;
  const totalPrice = unitPrice * quantity;

  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleAddToCartClick = () => {
    if (!product.isAvailable) return;

    const selectedOptionsSummary = selectedOptionsList
      .map((opt) => `${opt.nameAr}${opt.priceDelta > 0 ? ` (+${opt.priceDelta} ج.م.)` : ''}`)
      .join('، ');

    onAddToCart({
      productId: product.id,
      product,
      quantity,
      selectedOption: selectedOptionsSummary,
      selectedProductOptions: selectedOptionsList,
      unitPrice,
    });

    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden font-[Cairo]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {product.productType === 'DRINK' ? '☕' : '🍩'}
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {product.nameAr}
              </h3>
              {product.nameEn && (
                <p className="text-[11px] text-slate-400 font-sans">{product.nameEn}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Image & Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.nameAr}
                  className="w-full h-full object-cover transition-all"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-gradient-to-tr from-pink-50 to-cyan-50">
                  <span className="text-4xl">{product.productType === 'DRINK' ? '☕' : '🍩'}</span>
                  <span className="text-xs font-bold">{product.nameAr}</span>
                </div>
              )}

              {/* Base price badge in EGP */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-slate-900 font-black text-sm shadow-md border border-slate-100 tabular-nums">
                {basePrice} {t.currency}
              </div>

              {!product.isAvailable && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md">
                    {t.outOfStock}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails if multiple images */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                      selectedImageIndex === idx ? 'border-pink-500 scale-95 shadow-sm' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {product.descAr && (
            <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {lang === 'ar' ? 'الوصف ومميزات المنتج' : 'Product Description'}
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {product.descAr}
              </p>
              {product.descEn && (
                <p className="text-xs text-slate-500 pt-1 font-sans">
                  {product.descEn}
                </p>
              )}
            </div>
          )}

          {/* Natural Ingredients */}
          {product.ingredients && (
            <div className="space-y-1.5 p-4 rounded-2xl bg-pink-50/50 border border-pink-100">
              <span className="text-[10px] font-black uppercase text-pink-600 tracking-wider flex items-center gap-1.5">
                <span>🌿</span>
                <span>{lang === 'ar' ? 'المكونات الطبيعية والمحتويات' : 'Natural Ingredients'}</span>
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {product.ingredients}
              </p>
            </div>
          )}

          {/* Customer Product Options & Choices (Controlled by Owner/Admin) */}
          {availableOptions.length > 0 && (
            <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-pink-50/60 to-cyan-50/60 border border-pink-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>{lang === 'ar' ? 'الخيارات والإضافات المتاحة:' : 'Available Options & Extras:'}</span>
                </span>
                <span className="text-[10px] text-pink-700 font-bold bg-pink-100/80 px-2 py-0.5 rounded-lg">
                  {lang === 'ar' ? 'اختياري حسب رغبتك' : 'Optional'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {availableOptions.map((opt) => {
                  const isSelected = selectedOptionIds.includes(opt.id);
                  const price = Number(opt.priceDelta) || 0;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(opt.id)}
                      className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-white border-pink-500 shadow-md ring-2 ring-pink-400/20 text-slate-900'
                          : 'bg-white/80 border-slate-200/90 text-slate-700 hover:border-pink-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                            isSelected
                              ? 'bg-pink-500 border-pink-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{opt.nameAr}</span>
                          {opt.nameEn && (
                            <span className="text-[10px] text-slate-400 block font-sans truncate">{opt.nameEn}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-black font-mono shrink-0">
                        {price > 0 ? (
                          <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg border border-pink-200/60">
                            +{price} {t.currency}
                          </span>
                        ) : (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                            {lang === 'ar' ? 'مجاناً' : 'Free'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Price Calculation breakdown note */}
              <div className="text-[11px] text-slate-500 bg-white/80 p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between">
                <span>
                  {lang === 'ar' ? 'سعر الدونت الأساسي:' : 'Base price:'}{' '}
                  <strong className="text-slate-800 font-mono">{basePrice} {t.currency}</strong>
                  {optionsPriceDelta > 0 && (
                    <>
                      {' + '}
                      {lang === 'ar' ? 'إجمالي الإضافات:' : 'Options:'}{' '}
                      <strong className="text-pink-600 font-mono">+{optionsPriceDelta} {t.currency}</strong>
                    </>
                  )}
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  = {unitPrice} {t.currency} / {lang === 'ar' ? 'للقطعة' : 'pc'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs font-bold text-slate-500">
              {lang === 'ar' ? 'الكمية:' : 'Quantity:'}
            </span>
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-black font-mono tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="sm:hidden font-black text-pink-600 font-mono text-sm">
              {totalPrice} {t.currency}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={!product.isAvailable}
              onClick={handleAddToCartClick}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                addedAnimation
                  ? 'bg-emerald-600 text-white'
                  : product.isAvailable
                  ? 'bg-gradient-to-l from-[#FF4D8D] to-[#06B6D4] hover:from-pink-500 hover:to-cyan-500 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {addedAnimation ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تمت الإضافة للعلبة!' : 'Added!'}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {product.isAvailable
                      ? lang === 'ar'
                        ? `أضف للعلبة (${totalPrice} ج.م.)`
                        : `Add to Cart (${totalPrice} EGP)`
                      : t.outOfStock}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
