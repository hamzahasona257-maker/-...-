import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { DonutProduct, CartItem, CustomizationGroup, SelectedCustomizationItem } from '../types.ts';

interface CustomizationModalProps {
  lang: Language;
  donut: DonutProduct | null;
  customizationGroups?: CustomizationGroup[];
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const CustomizationModal: React.FC<CustomizationModalProps> = ({
  lang,
  donut,
  customizationGroups = [],
  onClose,
  onAddToCart,
}) => {
  const t = translations[lang];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customNotes, setCustomNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Group selections:
  // For SINGLE_SELECT / DROPDOWN: optionId (string)
  // For MULTI_SELECT: string[] (array of optionIds)
  // For TEXT / TEXTAREA: string
  // For NUMBER: number
  const [selections, setSelections] = useState<Record<string, any>>({});
  const [selectedProductOptionIds, setSelectedProductOptionIds] = useState<string[]>([]);

  const availableProductOptions = useMemo(() => {
    return (donut?.options || []).filter((opt) => opt && opt.nameAr && opt.nameAr.trim().length > 0);
  }, [donut?.options]);

  const selectedProductOptions = useMemo(() => {
    return availableProductOptions.filter((opt) => selectedProductOptionIds.includes(opt.id));
  }, [availableProductOptions, selectedProductOptionIds]);

  // Filter applicable groups
  const applicableGroups = useMemo(() => {
    if (!donut) return [];
    return (customizationGroups || [])
      .filter((g) => {
        if (!g.isActive) return false;
        if (g.assignedToAll) return true;
        if (g.assignedProductIds && g.assignedProductIds.includes(donut.id)) return true;
        if (donut.categoryId && g.assignedCategoryIds && g.assignedCategoryIds.includes(donut.categoryId)) return true;
        return false;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [donut, customizationGroups]);

  // Reset state on modal open with product
  useEffect(() => {
    if (donut) {
      setActiveImageIndex(0);
      setQuantity(1);
      setCustomNotes('');
      setValidationError(null);
      setSelectedProductOptionIds([]);

      // Prepopulate defaults for groups
      const initial: Record<string, any> = {};
      applicableGroups.forEach((grp) => {
        if (grp.type === 'SINGLE_SELECT' || grp.type === 'DROPDOWN') {
          // If required and options exist, pick first available by default
          if (grp.isRequired && grp.options && grp.options.length > 0) {
            const avail = grp.options.find((o) => o.isAvailable !== false);
            if (avail) initial[grp.id] = avail.id;
          }
        } else if (grp.type === 'MULTI_SELECT') {
          initial[grp.id] = [];
        } else if (grp.type === 'NUMBER') {
          initial[grp.id] = 0;
        } else {
          initial[grp.id] = '';
        }
      });
      setSelections(initial);
    }
  }, [donut, applicableGroups]);

  if (!donut) return null;

  const images = donut.images && donut.images.length > 0 ? donut.images : (donut.mainImage ? [donut.mainImage] : []);

  // Compute calculated unit price including customizations
  let optionsDeltaTotal = 0;
  const compiledSelections: SelectedCustomizationItem[] = [];

  applicableGroups.forEach((grp) => {
    const val = selections[grp.id];
    if (grp.type === 'SINGLE_SELECT' || grp.type === 'DROPDOWN') {
      if (val) {
        const opt = grp.options.find((o) => o.id === val);
        if (opt && opt.isAvailable !== false) {
          const delta = Number(opt.priceDelta) || 0;
          optionsDeltaTotal += delta;
          compiledSelections.push({
            groupId: grp.id,
            groupNameAr: grp.nameAr,
            groupNameEn: grp.nameEn,
            type: grp.type,
            optionId: opt.id,
            optionNameAr: opt.nameAr,
            optionNameEn: opt.nameEn,
            priceDelta: delta,
          });
        }
      }
    } else if (grp.type === 'MULTI_SELECT') {
      if (Array.isArray(val)) {
        val.forEach((optId: string) => {
          const opt = grp.options.find((o) => o.id === optId);
          if (opt && opt.isAvailable !== false) {
            const delta = Number(opt.priceDelta) || 0;
            optionsDeltaTotal += delta;
            compiledSelections.push({
              groupId: grp.id,
              groupNameAr: grp.nameAr,
              groupNameEn: grp.nameEn,
              type: grp.type,
              optionId: opt.id,
              optionNameAr: opt.nameAr,
              optionNameEn: opt.nameEn,
              priceDelta: delta,
            });
          }
        });
      }
    } else if (grp.type === 'TEXT' || grp.type === 'TEXTAREA') {
      const textVal = String(val || '').trim();
      if (textVal) {
        compiledSelections.push({
          groupId: grp.id,
          groupNameAr: grp.nameAr,
          groupNameEn: grp.nameEn,
          type: grp.type,
          textValue: textVal,
          priceDelta: 0,
        });
      }
    } else if (grp.type === 'NUMBER') {
      const numVal = Number(val) || 0;
      if (numVal > 0) {
        compiledSelections.push({
          groupId: grp.id,
          groupNameAr: grp.nameAr,
          groupNameEn: grp.nameEn,
          type: grp.type,
          numberValue: numVal,
          priceDelta: 0,
        });
      }
    }
  });

  // Include price delta of direct product options
  const productOptionsDelta = selectedProductOptions.reduce(
    (sum, opt) => sum + (Number(opt.priceDelta) || 0),
    0
  );
  optionsDeltaTotal += productOptionsDelta;

  const unitPrice = parseFloat((donut.basePrice + optionsDeltaTotal).toFixed(2));
  const totalPrice = (unitPrice * quantity).toFixed(2);

  const handleMultiSelectToggle = (grpId: string, optId: string, maxSelections?: number) => {
    setSelections((prev) => {
      const currentList: string[] = Array.isArray(prev[grpId]) ? [...prev[grpId]] : [];
      const idx = currentList.indexOf(optId);
      if (idx > -1) {
        currentList.splice(idx, 1);
      } else {
        if (maxSelections && currentList.length >= maxSelections) {
          return prev; // Reached max allowed selections
        }
        currentList.push(optId);
      }
      return { ...prev, [grpId]: currentList };
    });
  };

  const handleConfirm = () => {
    // Validate required groups
    for (const grp of applicableGroups) {
      if (grp.isRequired) {
        const val = selections[grp.id];
        if (grp.type === 'SINGLE_SELECT' || grp.type === 'DROPDOWN') {
          if (!val) {
            setValidationError(lang === 'ar' ? `يرجى تحديد خيار من قسم (${grp.nameAr})` : `Please select an option from ${grp.nameEn}`);
            return;
          }
        } else if (grp.type === 'MULTI_SELECT') {
          const list = Array.isArray(val) ? val : [];
          const minSel = grp.minSelections || 1;
          if (list.length < minSel) {
            setValidationError(
              lang === 'ar'
                ? `يرجى اختيار ${minSel} على الأقل من قسم (${grp.nameAr})`
                : `Please select at least ${minSel} options from ${grp.nameEn}`
            );
            return;
          }
        } else if (grp.type === 'TEXT' || grp.type === 'TEXTAREA') {
          if (!val || !String(val).trim()) {
            setValidationError(lang === 'ar' ? `يرجى كتابة المطلوب في قسم (${grp.nameAr})` : `Please fill the required field ${grp.nameEn}`);
            return;
          }
        }
      }
    }

    const selectedOptionsSummary = selectedProductOptions
      .map((opt) => `${opt.nameAr}${opt.priceDelta > 0 ? ` (+${opt.priceDelta} ج.م.)` : ''}`)
      .join('، ');

    onAddToCart({
      productId: donut.id,
      product: donut,
      quantity,
      selectedOption: selectedOptionsSummary,
      selectedProductOptions,
      selectedCustomizations: compiledSelections,
      customNotes,
      unitPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Product Photo Gallery */}
        <div className="relative h-56 w-full bg-slate-900 shrink-0">
          {images.length > 0 ? (
            <img
              src={images[activeImageIndex] || images[0]}
              alt={donut.nameAr}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
              {donut.productType === 'DRINK' ? '☕' : '🍩'} {donut.nameAr}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Photo Dots if multiple */}
          {images.length > 1 && (
            <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition ${
                    activeImageIndex === i ? 'bg-pink-500 w-5' : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="absolute bottom-4 right-4 left-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black">{donut.nameAr}</h3>
                {donut.nameEn && <p className="text-xs text-white/80">{donut.nameEn}</p>}
              </div>
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl text-sm font-extrabold font-mono text-white">
                {donut.basePrice} {t.currency}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body & Dynamic Customization Groups */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {donut.descAr && (
            <div>
              <p className="text-xs text-slate-600 leading-relaxed">{donut.descAr}</p>
            </div>
          )}

          {/* Ingredients */}
          {donut.ingredients && (
            <div className="p-3.5 rounded-2xl bg-pink-50/60 border border-pink-100 space-y-1">
              <span className="text-[11px] font-bold text-pink-700 uppercase flex items-center gap-1">
                <span>🌿</span>
                <span>{t.ingredientsTitle}</span>
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{donut.ingredients}</p>
            </div>
          )}

          {validationError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Direct Product Options & Choices */}
          {availableProductOptions.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50/70 to-cyan-50/70 border border-pink-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                  <span>{lang === 'ar' ? 'الخيارات والإضافات المتاحة:' : 'Available Options & Extras:'}</span>
                </h4>
                <span className="text-[10px] text-pink-700 font-bold bg-pink-100 px-2 py-0.5 rounded-full">
                  {lang === 'ar' ? 'اختياري' : 'Optional'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableProductOptions.map((opt) => {
                  const isSelected = selectedProductOptionIds.includes(opt.id);
                  const price = Number(opt.priceDelta) || 0;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setSelectedProductOptionIds((prev) =>
                          prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]
                        )
                      }
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-white border-pink-500 shadow-xs ring-1 ring-pink-400 text-slate-900'
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold truncate">{opt.nameAr}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-pink-600 shrink-0">
                        {price > 0 ? `+${price} ج.م.` : 'مجاناً'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Customization Groups */}
          {applicableGroups.map((grp) => {
            const isSingle = grp.type === 'SINGLE_SELECT';
            const isMulti = grp.type === 'MULTI_SELECT';
            const isDropdown = grp.type === 'DROPDOWN';
            const isText = grp.type === 'TEXT';
            const isTextarea = grp.type === 'TEXTAREA';
            const isNumber = grp.type === 'NUMBER';

            return (
              <div key={grp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>{lang === 'ar' ? grp.nameAr : grp.nameEn}</span>
                      {grp.isRequired ? (
                        <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                          {lang === 'ar' ? 'مطلوب' : 'Required'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {lang === 'ar' ? '(اختياري)' : '(Optional)'}
                        </span>
                      )}
                    </h4>
                    {grp.descriptionAr && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'ar' ? grp.descriptionAr : grp.descriptionEn}
                      </p>
                    )}
                  </div>

                  {isMulti && grp.maxSelections && (
                    <span className="text-[10px] font-mono text-slate-500">
                      {lang === 'ar' ? `حد أقصى ${grp.maxSelections}` : `Max ${grp.maxSelections}`}
                    </span>
                  )}
                </div>

                {/* SINGLE_SELECT */}
                {isSingle && (
                  <div className="grid grid-cols-2 gap-2">
                    {grp.options.map((opt) => {
                      const isSelected = selections[grp.id] === opt.id;
                      const disabled = opt.isAvailable === false;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setSelections((prev) => ({
                              ...prev,
                              [grp.id]: isSelected && !grp.isRequired ? '' : opt.id,
                            }));
                            setValidationError(null);
                          }}
                          className={`p-3 rounded-2xl border text-xs font-bold text-right flex items-center justify-between transition cursor-pointer ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100'
                              : isSelected
                              ? 'border-pink-500 bg-pink-50/80 text-pink-700 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                          }`}
                        >
                          <span className="truncate">{lang === 'ar' ? opt.nameAr : opt.nameEn}</span>
                          <span className="text-[11px] font-mono shrink-0 mr-1">
                            {opt.priceDelta > 0 ? `+${opt.priceDelta} ج.م.` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* MULTI_SELECT */}
                {isMulti && (
                  <div className="grid grid-cols-2 gap-2">
                    {grp.options.map((opt) => {
                      const currentList: string[] = Array.isArray(selections[grp.id]) ? selections[grp.id] : [];
                      const isSelected = currentList.includes(opt.id);
                      const disabled =
                        opt.isAvailable === false ||
                        (!isSelected && grp.maxSelections && currentList.length >= grp.maxSelections);

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={Boolean(disabled)}
                          onClick={() => {
                            handleMultiSelectToggle(grp.id, opt.id, grp.maxSelections);
                            setValidationError(null);
                          }}
                          className={`p-3 rounded-2xl border text-xs font-bold text-right flex items-center justify-between transition cursor-pointer ${
                            disabled
                              ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100'
                              : isSelected
                              ? 'border-cyan-500 bg-cyan-50/80 text-cyan-800 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] shrink-0 ${
                                isSelected ? 'bg-cyan-600 text-white border-cyan-600' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{lang === 'ar' ? opt.nameAr : opt.nameEn}</span>
                          </div>
                          <span className="text-[11px] font-mono shrink-0 mr-1">
                            {opt.priceDelta > 0 ? `+${opt.priceDelta} ج.م.` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* DROPDOWN */}
                {isDropdown && (
                  <div>
                    <select
                      value={selections[grp.id] || ''}
                      onChange={(e) => {
                        setSelections((prev) => ({ ...prev, [grp.id]: e.target.value }));
                        setValidationError(null);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-pink-500"
                    >
                      <option value="">{lang === 'ar' ? '-- اختر خياراً --' : '-- Select an option --'}</option>
                      {grp.options.map((opt) => (
                        <option key={opt.id} value={opt.id} disabled={opt.isAvailable === false}>
                          {lang === 'ar' ? opt.nameAr : opt.nameEn}
                          {opt.priceDelta > 0 ? ` (+${opt.priceDelta} ج.م.)` : ''}
                          {opt.isAvailable === false ? ' (غير متوفر)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* TEXT */}
                {isText && (
                  <div>
                    <input
                      type="text"
                      value={selections[grp.id] || ''}
                      onChange={(e) => {
                        setSelections((prev) => ({ ...prev, [grp.id]: e.target.value }));
                        setValidationError(null);
                      }}
                      placeholder={lang === 'ar' ? 'اكتب هنا...' : 'Enter details here...'}
                      maxLength={150}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-pink-500"
                    />
                  </div>
                )}

                {/* TEXTAREA */}
                {isTextarea && (
                  <div>
                    <textarea
                      rows={2}
                      value={selections[grp.id] || ''}
                      onChange={(e) => {
                        setSelections((prev) => ({ ...prev, [grp.id]: e.target.value }));
                        setValidationError(null);
                      }}
                      placeholder={lang === 'ar' ? 'اكتب ملاحظاتك بالتفصيل هنا...' : 'Enter your detailed notes here...'}
                      maxLength={300}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-pink-500"
                    />
                  </div>
                )}

                {/* NUMBER */}
                {isNumber && (
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-600 font-bold">{lang === 'ar' ? 'العدد / الكمية الإضافية:' : 'Count / Quantity:'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelections((prev) => ({
                            ...prev,
                            [grp.id]: Math.max(0, (Number(prev[grp.id]) || 0) - 1),
                          }));
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs w-6 text-center">
                        {selections[grp.id] || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelections((prev) => ({
                            ...prev,
                            [grp.id]: (Number(prev[grp.id]) || 0) + 1,
                          }));
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* General instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              {lang === 'ar' ? 'ملاحظات خاصة للطلب' : 'Special Order Instructions'}
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={lang === 'ar' ? 'أي تعليمات تحب إضافتها لتحضير طلبك...' : 'Any dietary or packing notes...'}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500"
            />
          </div>
        </div>

        {/* Footer with quantity, calculated live price, and Add CTA */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-extrabold text-sm tabular-nums text-slate-900 font-mono">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-l from-[#FF4D8D] to-[#06B6D4] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-between cursor-pointer"
          >
            <span>{lang === 'ar' ? 'إضافة إلى العلبة' : 'Add to Box'}</span>
            <span className="tabular-nums font-mono">{totalPrice} {t.currency}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
