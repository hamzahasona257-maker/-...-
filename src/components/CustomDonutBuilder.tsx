import React, { useState, useMemo } from 'react';
import { Sparkles, Check, Plus, Minus, ShoppingBag, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { DonutProduct, CustomizationGroup, CustomizationOption, CartItem, SelectedCustomizationItem } from '../types.ts';

interface CustomDonutBuilderProps {
  lang: Language;
  customizationGroups: CustomizationGroup[];
  donutProducts: DonutProduct[];
  onAddToCart: (item: CartItem) => void;
}

export const CustomDonutBuilder: React.FC<CustomDonutBuilderProps> = ({
  lang,
  customizationGroups,
  donutProducts,
  onAddToCart,
}) => {
  const t = translations[lang];

  // Base donut selection
  const publishedDonuts = donutProducts.filter((p) => p.productType !== 'DRINK');
  const [selectedBaseProductId, setSelectedBaseProductId] = useState<string>(
    publishedDonuts[0]?.id || 'custom_base'
  );

  const selectedBaseProduct: DonutProduct = publishedDonuts.find((p) => p.id === selectedBaseProductId) || {
    id: 'custom_base',
    nameAr: 'دونت ويف المخصصة',
    nameEn: 'Custom Wave Donut',
    basePrice: 50,
    mainImage: publishedDonuts[0]?.mainImage || '',
    images: [],
    categoryId: '',
    descAr: 'دونت بريوش طازجة مخبوزة ومصممة حسب اختياراتك وإضافاتك الخاصة.',
    descEn: 'Fresh artisanal donut custom-crafted with your choice of glaze, fillings and toppings.',
    ingredients: 'دقيق فاخر، زبدة طبيعية، حليب طازج، بيض، سكر، خميرة بريوش فرنسية',
    isPublished: true,
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Selections state for customization groups:
  // groupId -> optionId (string) for single, or string[] for multi
  const [selections, setSelections] = useState<Record<string, any>>({});
  const [customNotes, setCustomNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter active groups available for customization
  const activeGroups = useMemo(() => {
    return (customizationGroups || [])
      .filter((g) => g.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [customizationGroups]);

  // Compute total price and compile summary
  const { optionsDeltaTotal, compiledCustomizations } = useMemo(() => {
    let delta = 0;
    const compiled: SelectedCustomizationItem[] = [];

    activeGroups.forEach((grp) => {
      const val = selections[grp.id];
      if (grp.type === 'SINGLE_SELECT' || grp.type === 'DROPDOWN') {
        if (val) {
          const opt = grp.options.find((o) => o.id === val);
          if (opt) {
            delta += Number(opt.priceDelta) || 0;
            compiled.push({
              groupId: grp.id,
              groupNameAr: grp.nameAr,
              groupNameEn: grp.nameEn,
              type: grp.type,
              optionId: opt.id,
              optionNameAr: opt.nameAr,
              optionNameEn: opt.nameEn,
              priceDelta: opt.priceDelta,
            });
          }
        }
      } else if (grp.type === 'MULTI_SELECT') {
        if (Array.isArray(val)) {
          val.forEach((optId) => {
            const opt = grp.options.find((o) => o.id === optId);
            if (opt) {
              delta += Number(opt.priceDelta) || 0;
              compiled.push({
                groupId: grp.id,
                groupNameAr: grp.nameAr,
                groupNameEn: grp.nameEn,
                type: grp.type,
                optionId: opt.id,
                optionNameAr: opt.nameAr,
                optionNameEn: opt.nameEn,
                priceDelta: opt.priceDelta,
              });
            }
          });
        }
      } else if (grp.type === 'NUMBER') {
        const count = Number(val) || 0;
        if (count > 0 && grp.options[0]) {
          const opt = grp.options[0];
          const totalOptDelta = (Number(opt.priceDelta) || 0) * count;
          delta += totalOptDelta;
          compiled.push({
            groupId: grp.id,
            groupNameAr: grp.nameAr,
            groupNameEn: grp.nameEn,
            type: grp.type,
            optionId: opt.id,
            optionNameAr: `${opt.nameAr} (${count})`,
            optionNameEn: `${opt.nameEn} (${count})`,
            priceDelta: totalOptDelta,
            numberValue: count,
          });
        }
      } else if (grp.type === 'TEXT' || grp.type === 'TEXTAREA') {
        const textStr = String(val || '').trim();
        if (textStr) {
          compiled.push({
            groupId: grp.id,
            groupNameAr: grp.nameAr,
            groupNameEn: grp.nameEn,
            type: grp.type,
            textValue: textStr,
            priceDelta: 0,
          });
        }
      }
    });

    return { optionsDeltaTotal: delta, compiledCustomizations: compiled };
  }, [activeGroups, selections]);

  const basePrice = Number(selectedBaseProduct.basePrice) || 50;
  const unitPrice = basePrice + optionsDeltaTotal;
  const totalPrice = unitPrice * quantity;

  // Toggle single selection
  const handleSelectSingle = (groupId: string, optionId: string) => {
    setValidationError(null);
    setSelections((prev) => ({
      ...prev,
      [groupId]: prev[groupId] === optionId ? '' : optionId,
    }));
  };

  // Toggle multi selection
  const handleToggleMulti = (groupId: string, optionId: string, max?: number) => {
    setValidationError(null);
    setSelections((prev) => {
      const currentList: string[] = Array.isArray(prev[groupId]) ? prev[groupId] : [];
      if (currentList.includes(optionId)) {
        return {
          ...prev,
          [groupId]: currentList.filter((id) => id !== optionId),
        };
      } else {
        if (max && currentList.length >= max) {
          return prev;
        }
        return {
          ...prev,
          [groupId]: [...currentList, optionId],
        };
      }
    });
  };

  // Handle Add to Box
  const handleAddCustomDonut = () => {
    // Validate required groups
    for (const grp of activeGroups.filter((g) => g.isRequired)) {
      const val = selections[grp.id];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        setValidationError(
          lang === 'ar'
            ? `يرجى تحديد اختيار في قسم (${grp.nameAr}) للمتابعة.`
            : `Please make a selection in (${grp.nameEn || grp.nameAr}) to proceed.`
        );
        return;
      }
    }

    setValidationError(null);

    // Build custom name
    const customSummaryTitle =
      compiledCustomizations.length > 0
        ? compiledCustomizations.slice(0, 3).map((c) => c.optionNameAr).join(' + ')
        : (lang === 'ar' ? 'دونت مخصصة' : 'Custom Donut');

    const customCartItem: CartItem = {
      productId: selectedBaseProduct.id,
      product: {
        ...selectedBaseProduct,
        nameAr: `${selectedBaseProduct.nameAr} (${customSummaryTitle})`,
      },
      quantity,
      selectedOption: customSummaryTitle,
      selectedCustomizations: compiledCustomizations,
      customNotes: customNotes.trim() || undefined,
      unitPrice,
    };

    onAddToCart(customCartItem);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl border border-pink-100 shadow-md p-6 sm:p-10 font-[Cairo] space-y-8">
      {/* Section Header */}
      <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-black uppercase tracking-wider mb-2 border border-pink-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'استوديو ويف للابتكار' : 'Wave Custom Donut Studio'}</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {lang === 'ar' ? 'صمم دونتك بنفسك' : 'Customize Your Own Donut'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            {lang === 'ar'
              ? 'اختر قاعدة الدونت المفضلة، والجليز الغني، والحشوة السخية، والتوبينج المقرمش، والإضافات الخاصة لتستمتع بدونت مخبوزة على ذوقك تماماً.'
              : 'Choose your donut base, rich coating glaze, generous filling, crunchy toppings and extras to build your dream donut.'}
          </p>
        </div>

        {/* Live Price Tag */}
        <div className="bg-gradient-to-tr from-pink-50 to-cyan-50 p-4 rounded-2xl border border-pink-200/80 text-left md:text-right shrink-0">
          <span className="text-[10px] font-black uppercase text-slate-500 block">
            {lang === 'ar' ? 'السعر المحسوب للقطعة' : 'Calculated Unit Price'}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
            {unitPrice} <span className="text-xs text-pink-600 font-bold">{t.currency}</span>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Grid: Customization Steps vs Live Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Main Column: Step-by-Step Customization Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Choose Donut Base if multiple products exist */}
          {publishedDonuts.length > 1 && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>{lang === 'ar' ? 'اختيار قاعدة الدونت الأساسية' : '1. Choose Donut Base'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {publishedDonuts.length} {lang === 'ar' ? 'أنواع متاحة' : 'options'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {publishedDonuts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedBaseProductId(d.id)}
                    className={`p-3 rounded-xl border text-right transition flex items-center gap-3 cursor-pointer ${
                      selectedBaseProductId === d.id
                        ? 'bg-pink-50 border-pink-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                      {d.mainImage ? (
                        <img src={d.mainImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🍩</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{d.nameAr}</p>
                      <p className="text-[10px] text-pink-600 font-mono font-bold">{d.basePrice} {t.currency}</p>
                    </div>
                    {selectedBaseProductId === d.id && (
                      <Check className="w-4 h-4 text-pink-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Customization Groups (Glazes, Fillings, Toppings, Extras) */}
          {activeGroups.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <div className="text-2xl">✨</div>
              <p className="text-xs font-bold text-slate-700">
                {lang === 'ar'
                  ? 'يمكنك إضافة هذه الدونت إلى علبتك مباشرة أو تخصيص طلبك عبر الخيارات أدناه.'
                  : 'You can add this donut directly to your box.'}
              </p>
            </div>
          ) : (
            activeGroups.map((grp, groupIndex) => {
              const selectedValue = selections[grp.id];
              const stepNumber = publishedDonuts.length > 1 ? groupIndex + 2 : groupIndex + 1;

              return (
                <div
                  key={grp.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {stepNumber}
                      </span>
                      <div>
                        <span className="text-xs font-black text-slate-900">
                          {grp.nameAr}
                        </span>
                        {grp.nameEn && (
                          <span className="text-[10px] text-slate-400 font-sans mr-2">
                            ({grp.nameEn})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {grp.isRequired ? (
                        <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-lg">
                          {lang === 'ar' ? 'إلزامي *' : 'Required *'}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-lg">
                          {lang === 'ar' ? 'اختياري' : 'Optional'}
                        </span>
                      )}
                    </div>
                  </div>

                  {grp.descriptionAr && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {grp.descriptionAr}
                    </p>
                  )}

                  {/* Options List */}
                  {(grp.type === 'SINGLE_SELECT' || grp.type === 'DROPDOWN') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {grp.options.map((opt) => {
                        const isSelected = selectedValue === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectSingle(grp.id, opt.id)}
                            className={`p-3 rounded-xl border text-right transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-pink-50 border-pink-500 text-pink-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-xs font-bold">{opt.nameAr}</span>
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              {opt.priceDelta > 0 ? (
                                <span className="font-bold text-pink-600">+{opt.priceDelta} ج.م.</span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">{lang === 'ar' ? 'مجاني' : 'Free'}</span>
                              )}
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                  isSelected ? 'border-pink-600 bg-pink-600 text-white' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && '✓'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {grp.type === 'MULTI_SELECT' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {grp.options.map((opt) => {
                        const isSelected = Array.isArray(selectedValue) && selectedValue.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleToggleMulti(grp.id, opt.id, grp.maxSelections)}
                            className={`p-3 rounded-xl border text-right transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-50 border-cyan-500 text-cyan-950 shadow-xs'
                                : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-xs font-bold">{opt.nameAr}</span>
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              {opt.priceDelta > 0 ? (
                                <span className="font-bold text-cyan-700">+{opt.priceDelta} ج.م.</span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">{lang === 'ar' ? 'مجاني' : 'Free'}</span>
                              )}
                              <span
                                className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                                  isSelected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && '✓'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {grp.type === 'TEXT' && (
                    <div>
                      <input
                        type="text"
                        value={selectedValue || ''}
                        onChange={(e) => setSelections({ ...selections, [grp.id]: e.target.value })}
                        placeholder={lang === 'ar' ? 'أدخل ملاحظتك هنا...' : 'Enter your note here...'}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500"
                      />
                    </div>
                  )}

                  {grp.type === 'TEXTAREA' && (
                    <div>
                      <textarea
                        rows={2}
                        value={selectedValue || ''}
                        onChange={(e) => setSelections({ ...selections, [grp.id]: e.target.value })}
                        placeholder={lang === 'ar' ? 'اكتب الرسالة المراد كتابتها على العلبة أو تعليمات المطبخ...' : 'Write message or special instructions...'}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Kitchen & Delivery Special Instructions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {lang === 'ar' ? 'ملاحظات خاصة بالمطبخ أو التغليف (اختياري):' : 'Special kitchen notes (optional):'}
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: صوص خارجي منفصل، تغليف خاص للمناسبات...' : 'e.g. separate sauce, gift wrap...'}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-pink-500 bg-white"
            />
          </div>
        </div>

        {/* Right Column: Live Customization Summary & Direct Add Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-slate-50 rounded-3xl border border-slate-200/90 p-5 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <span className="text-lg">📋</span>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {lang === 'ar' ? 'ملخص الدونت المخصصة' : 'Custom Donut Summary'}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {lang === 'ar' ? 'مراجعة خياراتك قبل الإضافة إلى العلبة' : 'Review selections before adding to box'}
                </p>
              </div>
            </div>

            {/* Base Product */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
              <span className="text-slate-600 font-bold">{lang === 'ar' ? 'القاعدة:' : 'Base:'}</span>
              <span className="font-bold text-slate-900">{selectedBaseProduct.nameAr}</span>
            </div>

            {/* Selected Options List */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                {lang === 'ar' ? 'الإضافات والخيارات المختارة:' : 'Selected Customizations:'}
              </span>

              {compiledCustomizations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  {lang === 'ar' ? 'لم تقم بتحديد إضافات بعد (الدونت الكلاسيكية الأصلية)' : 'No extra options selected yet.'}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {compiledCustomizations.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 block">{item.groupNameAr}</span>
                        <span className="font-bold text-slate-800">
                          {item.optionNameAr || item.textValue}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-pink-600 text-xs">
                        {item.priceDelta > 0 ? `+${item.priceDelta} ج.م.` : (lang === 'ar' ? 'مجاني' : 'Free')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{lang === 'ar' ? 'سعر القاعدة:' : 'Base Price:'}</span>
                <span className="font-mono font-bold text-slate-900">{basePrice} {t.currency}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{lang === 'ar' ? 'إجمالي الإضافات:' : 'Options Delta:'}</span>
                <span className="font-mono font-bold text-pink-600">+{optionsDeltaTotal} {t.currency}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>{lang === 'ar' ? 'سعر القطعة:' : 'Unit Price:'}</span>
                <span className="font-mono text-pink-600 text-base">{unitPrice} {t.currency}</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-600">
                {lang === 'ar' ? 'الكمية:' : 'Quantity:'}
              </span>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-bold font-mono tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Total Button */}
            <button
              type="button"
              onClick={handleAddCustomDonut}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                addedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-l from-[#FF4D8D] to-[#06B6D4] hover:from-pink-500 hover:to-cyan-500 text-white active:scale-98'
              }`}
            >
              {addedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تمت الإضافة للعلبة بنجاح!' : 'Added to Box!'}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {lang === 'ar'
                      ? `أضف الدونت المخصصة للعلبة (${totalPrice} ج.م.)`
                      : `Add Custom Donut (${totalPrice} EGP)`}
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
