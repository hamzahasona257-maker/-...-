import React, { useState } from 'react';
import { Plus, Minus, Sparkles, MessageCircle, SlidersHorizontal, Info, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { DonutProduct, Category, StoreSettings, CustomizationGroup, CartItem } from '../types.ts';

interface DonutCatalogProps {
  lang: Language;
  products: DonutProduct[];
  categories: Category[];
  customizationGroups: CustomizationGroup[];
  settings: StoreSettings | null;
  onSelectDonut: (donut: DonutProduct) => void;
  onQuickAdd: (donut: DonutProduct, quantity?: number) => void;
  onOpenDetails: (donut: DonutProduct) => void;
  onAddToCart: (item: CartItem) => void;
}

export type StoreSectionTab = 'REGULAR_DONUTS' | 'DRINKS';

export const DonutCatalog: React.FC<DonutCatalogProps> = ({
  lang,
  products,
  categories,
  customizationGroups,
  settings,
  onSelectDonut,
  onQuickAdd,
  onOpenDetails,
  onAddToCart,
}) => {
  const t = translations[lang];

  // Main Section Tabs: Regular Donuts / Drinks (Customer view)
  const [activeSection, setActiveSection] = useState<StoreSectionTab>('REGULAR_DONUTS');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Local quantity map for regular cards: productId -> quantity
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [addedItemAnimation, setAddedItemAnimation] = useState<string | null>(null);

  const getQuantity = (id: string) => cardQuantities[id] || 1;
  const setQuantity = (id: string, q: number) => {
    setCardQuantities((prev) => ({ ...prev, [id]: Math.max(1, q) }));
  };

  const handleAddWithQuantity = (donut: DonutProduct) => {
    const q = getQuantity(donut.id);
    onQuickAdd(donut, q);
    setAddedItemAnimation(donut.id);
    setTimeout(() => setAddedItemAnimation(null), 1200);
  };

  // Regular donuts (not drinks)
  const regularDonuts = products.filter((p) => p.productType !== 'DRINK');
  // Drinks
  const drinks = products.filter((p) => p.productType === 'DRINK');

  // Filtered regular donuts by category
  const filteredDonuts = regularDonuts.filter((p) => {
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    return true;
  });

  return (
    <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      {/* Menu Header with Slogan */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-pink-600 mb-1.5">
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'ar' ? 'طازجة ومخبوزة يومياً بأعلى جودة' : 'Freshly Fried Artisanal Brioche Daily'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t.ourMenu}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {lang === 'ar'
              ? 'اركب موجة الحلاوة مع تشكيلة ويف دونتس الفاخرة والمشروبات المميزة.'
              : 'Ride the sweet wave with our signature artisanal donuts and drinks.'}
          </p>
        </div>

        {/* Customer Navigation Tabs: Donuts / Drinks */}
        <div className="flex flex-wrap items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveSection('REGULAR_DONUTS')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeSection === 'REGULAR_DONUTS'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🍩</span>
            <span>{lang === 'ar' ? 'تشكيلة الدونتس الفاخرة' : 'Artisanal Donuts'}</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${activeSection === 'REGULAR_DONUTS' ? 'bg-pink-700/80' : 'bg-slate-200 text-slate-700'}`}>
              {regularDonuts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('DRINKS')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeSection === 'DRINKS'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>☕</span>
            <span>{lang === 'ar' ? 'المشروبات والقهوة' : 'Drinks & Coffee'}</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-md ${activeSection === 'DRINKS' ? 'bg-cyan-700/80' : 'bg-slate-200 text-slate-700'}`}>
              {drinks.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION B: REGULAR DONUTS (Browse, select quantity, add directly to cart) */}
      {/* ========================================================================= */}
      {activeSection === 'REGULAR_DONUTS' && (
        <div className="space-y-6">
          {/* Sub-header with Category Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-bold">
              {lang === 'ar'
                ? 'دونتس جاهزة طازجة مخبوزة بوصفات الشيف الخاصة — أضفها مباشرة إلى علبتك دون إلزام بالتخصيص.'
                : 'Ready-made signature donuts baked fresh daily — add directly to your cart.'}
            </div>

            {/* Category filter pills */}
            {categories.length > 0 && regularDonuts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.allDonuts} ({regularDonuts.length})
                </button>
                {categories.map((cat) => {
                  const count = regularDonuts.filter((p) => p.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lang === 'ar' ? cat.nameAr : cat.nameEn} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Regular Donuts Grid */}
          {regularDonuts.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-pink-50/60 to-white border border-pink-100 text-center space-y-4 max-w-xl mx-auto shadow-xs">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-100 text-pink-600 flex items-center justify-center text-3xl">
                🍩
              </div>
              <h3 className="text-xl font-black text-slate-900">{t.emptyStoreTitle}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t.emptyStoreMessage}</p>
            </div>
          ) : filteredDonuts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-200">
              <p className="text-xs font-bold">{t.emptyCategoryMessage}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {filteredDonuts.map((donut) => {
                const displayImg = donut.mainImage || (donut.images && donut.images[0]) || '';
                const q = getQuantity(donut.id);
                const isAdded = addedItemAnimation === donut.id;

                return (
                  <div
                    key={donut.id}
                    className="group bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    {/* Image Area */}
                    <div
                      onClick={() => onOpenDetails(donut)}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer"
                    >
                      {displayImg ? (
                        <img
                          src={displayImg}
                          alt={donut.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1 bg-gradient-to-tr from-pink-50 to-cyan-50">
                          <span className="text-3xl">🍩</span>
                          <span className="text-xs font-bold">{donut.nameAr}</span>
                        </div>
                      )}

                      {/* Price Badge in EGP */}
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-slate-900 font-black text-sm shadow-sm border border-slate-100 tabular-nums font-mono">
                        {donut.basePrice} {t.currency}
                      </div>

                      {!donut.isAvailable && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                            {t.outOfStock}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            onClick={() => onOpenDetails(donut)}
                            className="text-base sm:text-lg font-black text-slate-900 group-hover:text-pink-600 transition-colors cursor-pointer"
                          >
                            {donut.nameAr}
                          </h3>
                        </div>
                        {donut.nameEn && (
                          <p className="text-[11px] text-slate-400 font-sans">{donut.nameEn}</p>
                        )}
                        {donut.ingredients && (
                          <p className="text-[11px] text-slate-600 font-medium line-clamp-1">
                            🌿 {donut.ingredients}
                          </p>
                        )}
                        {donut.descAr && (
                          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                            {donut.descAr}
                          </p>
                        )}
                      </div>

                      {/* Direct Ordering Controls: Quantity + Direct Add + Details */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          {/* Quantity picker */}
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setQuantity(donut.id, q - 1)}
                              className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold font-mono tabular-nums">
                              {q}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(donut.id, q + 1)}
                              className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Direct Add to Cart Button (NO forced customization) */}
                          <button
                            type="button"
                            disabled={!donut.isAvailable}
                            onClick={() => handleAddWithQuantity(donut)}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : donut.isAvailable
                                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-xs active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{lang === 'ar' ? 'تمت الإضافة!' : 'Added!'}</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-4 h-4" />
                                <span>{donut.isAvailable ? (lang === 'ar' ? `أضف للعلبة (${donut.basePrice * q} ج.م.)` : `Add (${donut.basePrice * q} EGP)`) : t.outOfStock}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Extra Actions: Details & Customize Buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenDetails(donut)}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="عرض تفاصيل ومكونات الدونت"
                          >
                            <Info className="w-3.5 h-3.5 text-cyan-600" />
                            <span>{lang === 'ar' ? 'تفاصيل ومكونات' : 'Details'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectDonut(donut)}
                            className="py-1.5 px-2.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[11px] font-bold border border-cyan-200 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="تخصيص الإضافات والتوبينج"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'تخصيص' : 'Customize'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

  {/* ========================================================================= */}
      {/* SECTION B: DRINKS (Beverages added by Owner with same ordering workflow) */}
      {/* ========================================================================= */}
      {activeSection === 'DRINKS' && (
        <div className="space-y-6">
          <div className="text-xs text-slate-500 font-bold">
            {lang === 'ar'
              ? 'مشروبات قهوة وعصائر طازجة مجهزة لتكمل متعة تناول الدونتس.'
              : 'Specialty coffee and iced drinks crafted to complement your sweet wave donuts.'}
          </div>

          {drinks.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-cyan-50/60 to-white border border-cyan-100 text-center space-y-4 max-w-xl mx-auto shadow-xs">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-3xl">
                ☕
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {lang === 'ar' ? 'المشروبات ستتوفر قريباً' : 'Drinks Coming Soon'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? 'يقوم مالك المتجر حالياً بإعداد قائمة المشروبات الطازجة والقهوة المتخصصة.'
                  : 'Our specialty drinks menu is currently being crafted by the store owner.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {drinks.map((drink) => {
                const displayImg = drink.mainImage || (drink.images && drink.images[0]) || '';
                const q = getQuantity(drink.id);
                const isAdded = addedItemAnimation === drink.id;

                return (
                  <div
                    key={drink.id}
                    className="group bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    <div
                      onClick={() => onOpenDetails(drink)}
                      className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer"
                    >
                      {displayImg ? (
                        <img
                          src={displayImg}
                          alt={drink.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1 bg-gradient-to-tr from-cyan-50 to-pink-50">
                          <span className="text-3xl">☕</span>
                          <span className="text-xs font-bold">{drink.nameAr}</span>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-slate-900 font-black text-sm shadow-sm border border-slate-100 tabular-nums font-mono">
                        {drink.basePrice} {t.currency}
                      </div>

                      {!drink.isAvailable && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                            {t.outOfStock}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between gap-4">
                      <div className="space-y-1.5">
                        <h3
                          onClick={() => onOpenDetails(drink)}
                          className="text-base sm:text-lg font-black text-slate-900 group-hover:text-cyan-600 transition-colors cursor-pointer"
                        >
                          {drink.nameAr}
                        </h3>
                        {drink.nameEn && (
                          <p className="text-[11px] text-slate-400 font-sans">{drink.nameEn}</p>
                        )}
                        {drink.descAr && (
                          <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                            {drink.descAr}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setQuantity(drink.id, q - 1)}
                              className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold font-mono tabular-nums">
                              {q}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(drink.id, q + 1)}
                              className="p-0.5 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={!drink.isAvailable}
                            onClick={() => handleAddWithQuantity(drink)}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : drink.isAvailable
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{lang === 'ar' ? 'تمت الإضافة!' : 'Added!'}</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-4 h-4" />
                                <span>{drink.isAvailable ? (lang === 'ar' ? `أضف (${drink.basePrice * q} ج.م.)` : `Add (${drink.basePrice * q} EGP)`) : t.outOfStock}</span>
                              </>
                            )}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenDetails(drink)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{lang === 'ar' ? 'تفاصيل المشروب' : 'Details'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
