import React, { useState, useEffect, useRef } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Calendar,
  DollarSign,
  CheckCircle,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { SpecialOffer, SpecialOfferItem, DonutProduct, Language } from '../types';
import { api } from '../lib/api';

interface AdminOffersManagerProps {
  lang: Language;
  products: DonutProduct[];
  onOffersUpdated?: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export const AdminOffersManager: React.FC<AdminOffersManagerProps> = ({
  lang,
  products,
  onOffersUpdated,
  showSuccess,
  showError,
}) => {
  const isAr = lang === 'ar';
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Drawer state for Create or Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Form Fields
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Included Items Builder
  const [includedItems, setIncludedItems] = useState<SpecialOfferItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Image Uploading
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Deletion Modal
  const [offerToDelete, setOfferToDelete] = useState<SpecialOffer | null>(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminOffers();
      if (res && Array.isArray(res.offers)) {
        setOffers(res.offers);
      }
    } catch (err: any) {
      showError(err.message || 'فشل جلب العروض الخاصة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const resetForm = () => {
    setEditingOfferId(null);
    setNameAr('');
    setNameEn('');
    setDescriptionAr('');
    setDescriptionEn('');
    setImageUrl('');
    setPriceInput('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setIncludedItems([]);
    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (offer: SpecialOffer) => {
    setEditingOfferId(offer.id);
    setNameAr(offer.nameAr || '');
    setNameEn(offer.nameEn || '');
    setDescriptionAr(offer.descriptionAr || '');
    setDescriptionEn(offer.descriptionEn || '');
    setImageUrl(offer.imageUrl || '');
    setPriceInput(String(offer.price || ''));
    setStartDate(offer.startDate || '');
    setEndDate(offer.endDate || '');
    setIsActive(offer.isActive ?? true);
    setIncludedItems(offer.items || []);
    setIsModalOpen(true);
  };

  // Add Item to Included Items list
  const handleAddIncludedItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setIncludedItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.productId === selectedProductId);
      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += Number(selectedQuantity) || 1;
        return copy;
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productNameAr: prod.nameAr,
          productNameEn: prod.nameEn || prod.nameAr,
          quantity: Number(selectedQuantity) || 1,
        },
      ];
    });

    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const handleRemoveIncludedItem = (idx: number) => {
    setIncludedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemQuantity = (idx: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveIncludedItem(idx);
      return;
    }
    setIncludedItems((prev) => {
      const copy = [...prev];
      copy[idx].quantity = qty;
      return copy;
    });
  };

  // Handle Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await api.uploadImage(file);
      if (res && res.imageUrl) {
        setImageUrl(res.imageUrl);
        showSuccess(isAr ? 'تم رفع صورة العرض بنجاح' : 'Offer image uploaded');
      }
    } catch (err: any) {
      showError(err.message || 'فشل رفع صورة العرض');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save (Create or Update)
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameAr.trim()) {
      showError(isAr ? 'يرجى كتابة اسم العرض بالعربية' : 'Please provide offer name in Arabic');
      return;
    }

    const price = Number(priceInput);
    if (isNaN(price) || price < 0) {
      showError(isAr ? 'يرجى إدخال سعر صالح للعرض بالجنيه المصري' : 'Please provide a valid price');
      return;
    }

    if (includedItems.length === 0) {
      showError(isAr ? 'يرجى إضافة صنف واحد على الأقل مشمول في هذا العرض' : 'Please include at least one item');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        descriptionAr: descriptionAr.trim(),
        descriptionEn: descriptionEn.trim(),
        imageUrl: imageUrl.trim(),
        price,
        items: includedItems,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        isActive,
      };

      if (editingOfferId) {
        await api.updateOffer(editingOfferId, payload);
        showSuccess(isAr ? 'تم تحديث العرض الخاص بنجاح' : 'Offer updated successfully');
      } else {
        await api.createOffer(payload);
        showSuccess(isAr ? 'تم إنشاء العرض الخاص بنجاح' : 'Offer created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      await fetchOffers();
      if (onOffersUpdated) onOffersUpdated();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ العرض');
    } finally {
      setLoading(false);
    }
  };

  // Toggle active
  const handleToggleActive = async (offer: SpecialOffer) => {
    try {
      await api.toggleOfferActive(offer.id);
      showSuccess(
        offer.isActive
          ? (isAr ? 'تم تعطيل العرض مؤقتاً' : 'Offer deactivated')
          : (isAr ? 'تم تفعيل العرض بنجاح' : 'Offer activated')
      );
      await fetchOffers();
      if (onOffersUpdated) onOffersUpdated();
    } catch (err: any) {
      showError(err.message || 'فشل تغيير حالة العرض');
    }
  };

  // Delete Offer
  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      setLoading(true);
      await api.deleteOffer(offerToDelete.id);
      showSuccess(isAr ? 'تم حذف العرض بنجاح' : 'Offer deleted successfully');
      setOfferToDelete(null);
      await fetchOffers();
      if (onOffersUpdated) onOffersUpdated();
    } catch (err: any) {
      showError(err.message || 'فشل حذف العرض');
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.nameAr && o.nameAr.toLowerCase().includes(q)) ||
      (o.nameEn && o.nameEn.toLowerCase().includes(q)) ||
      (o.descriptionAr && o.descriptionAr.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-2 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'نظام العروض الخاصة والبوكسات' : 'Special Offers System'}</span>
          </div>
          <h2 className="text-xl font-black text-white">
            {isAr ? 'إدارة العروض الخاصة والبوكسات التوفيرية' : 'Manage Special Offers'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isAr
              ? 'العروض في Wave Donuts تُعامل كمنتجات خاصة كاملة: يمكنك رفع صورتها، وتحديد الأصناف والمشروبات المشمولة فيها بكمياتها المحددة، وضبط سعر العرض الإجمالي بالجنيه المصري وصلاحيته.'
              : 'Offers act as real bundle products with custom items, quantities, pricing, and validity dates.'}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? '+ إنشاء عرض خاص جديد' : '+ Create New Offer'}</span>
        </button>
      </div>

      {/* Offers List & Search */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في العروض بالاسم أو المحتوى...' : 'Search offers...'}
            className="w-full max-w-xs px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-amber-500"
          />
          <span className="text-xs font-bold text-slate-400">
            {isAr ? 'إجمالي العروض:' : 'Total Offers:'} {offers.length}
          </span>
        </div>

        {filteredOffers.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Tag className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'لا توجد عروض خاصة مسجلة حالياً' : 'No offers found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {isAr
                  ? 'قم بإنشاء أول عرض خاص لـ Wave Donuts مع تحديد الدونتس والمشروبات المشمولة لزيادة المبيعات.'
                  : 'Create your first special offer with custom donuts, drinks, and bundle pricing.'}
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition"
            >
              {isAr ? 'إنشاء أول عرض الآن' : 'Create Offer Now'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOffers.map((offer) => {
              const totalItemsCount = offer.items
                ? offer.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
                : 0;

              return (
                <div
                  key={offer.id}
                  className={`p-5 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between ${
                    offer.isActive
                      ? 'border-slate-800 hover:border-amber-500/60 shadow-md'
                      : 'border-slate-800/60 opacity-65'
                  }`}
                >
                  <div>
                    {/* Header: Thumbnail + Title + Status */}
                    <div className="flex gap-3 items-start">
                      {offer.imageUrl ? (
                        <img
                          src={offer.imageUrl}
                          alt={offer.nameAr}
                          className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-800"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl shrink-0">
                          🎁
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-black text-white truncate">
                            {offer.nameAr}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              offer.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {offer.isActive
                              ? (isAr ? 'نشط ومعروض' : 'Active')
                              : (isAr ? 'معطل' : 'Inactive')}
                          </span>
                        </div>

                        {offer.nameEn && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                            {offer.nameEn}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-base font-black text-amber-400 font-mono">
                            {offer.price} {isAr ? 'ج.م.' : 'EGP'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                            {totalItemsCount} {isAr ? 'قطع مشمولة' : 'items'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {offer.descriptionAr && (
                      <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                        {offer.descriptionAr}
                      </p>
                    )}

                    {/* Included Items Pill List */}
                    {offer.items && offer.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {isAr ? 'الأصناف المشمولة في العرض:' : 'Included items:'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {offer.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded-lg border border-slate-700/50 flex items-center gap-1"
                            >
                              <span className="font-bold text-white">×{it.quantity}</span>
                              <span>{it.productNameAr}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    {(offer.startDate || offer.endDate) && (
                      <div className="mt-3 pt-2 text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {offer.startDate ? offer.startDate : '—'} ➔ {offer.endDate ? offer.endDate : (isAr ? 'مستمر' : 'Ongoing')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleActive(offer)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        offer.isActive
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                      }`}
                      title={offer.isActive ? (isAr ? 'تعطيل العرض' : 'Deactivate') : (isAr ? 'تفعيل العرض' : 'Activate')}
                    >
                      {offer.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{offer.isActive ? (isAr ? 'تعطيل' : 'Hide') : (isAr ? 'تفعيل' : 'Show')}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(offer)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title={isAr ? 'تعديل بيانات العرض' : 'Edit Offer'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{isAr ? 'تعديل' : 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => setOfferToDelete(offer)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-red-400 text-xs font-bold transition cursor-pointer"
                        title={isAr ? 'حذف العرض' : 'Delete Offer'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Offer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingOfferId
                      ? (isAr ? 'تعديل العرض الخاص' : 'Edit Special Offer')
                      : (isAr ? 'إنشاء عرض خاص جديد' : 'Create Special Offer')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'حدد مكونات العرض وسعره وصلاحيته بالجنيه المصري' : 'Specify bundle items, price in EGP, and validity'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveOffer} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'اسم العرض (بالعربية) *' : 'Offer Name (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: بوكس عائلي 12 قطعة + 2 قهوة"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'اسم العرض (بالإنجليزية - اختياري)' : 'Offer Name (English - Optional)'}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Family Box 12 Pcs + 2 Coffees"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-amber-500 font-sans"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'وصف العرض (بالعربية)' : 'Description (Arabic)'}
                  </label>
                  <textarea
                    rows={2}
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    placeholder="تفاصيل العرض ومميزاته للعملاء..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'وصف العرض (بالإنجليزية)' : 'Description (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder="Offer description in English..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-amber-500 font-sans"
                  />
                </div>
              </div>

              {/* Image Upload & Preview */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isAr ? 'صورة العرض الرئيسية *' : 'Offer Image *'}
                </label>
                <div className="flex gap-3 items-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                      🎁
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? (isAr ? 'جارٍ الرفع...' : 'Uploading...') : (isAr ? 'رفع صورة من جهازك' : 'Upload Image')}</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileChange}
                      />
                    </div>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="أو الصق رابط الصورة المباشر هنا..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-[11px] placeholder-slate-500 focus:outline-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Included Products & Items Builder */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-amber-400 font-black flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isAr ? 'محتويات وبوكس العرض (الدونتس والمشروبات المشمولة) *' : 'Included Products & Quantities *'}</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {includedItems.length} {isAr ? 'أصناف محددة' : 'items selected'}
                  </span>
                </div>

                {/* Add Item Row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-amber-500"
                  >
                    <option value="">{isAr ? '-- اختر منتجاً مشمولاً في العرض --' : '-- Select Product --'}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productType === 'DRINK' ? '☕' : '🍩'} {p.nameAr} ({p.basePrice} ج.م.)
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 font-bold">{isAr ? 'الكمية:' : 'Qty:'}</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-center font-bold font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddIncludedItem}
                      disabled={!selectedProductId}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إضافة' : 'Add'}</span>
                    </button>
                  </div>
                </div>

                {/* Current Included Items List */}
                {includedItems.length > 0 ? (
                  <div className="space-y-1.5 pt-2">
                    {includedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0 font-mono">
                            ×{item.quantity}
                          </span>
                          <span className="font-bold text-white truncate text-xs">
                            {item.productNameAr}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveIncludedItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-400"
                            title="حذف"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    {isAr ? 'لم يتم إضافة أصناف إلى العرض بعد. اختر المنتجات وكمياتها أعلاه.' : 'No items added yet.'}
                  </p>
                )}
              </div>

              {/* Pricing & Validity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'سعر العرض النهائي (ج.م.) *' : 'Final Price (EGP) *'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="مثال: 180"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold focus:outline-amber-500"
                    />
                    <span className="absolute left-3 top-2.5 text-[11px] text-slate-500 font-bold">
                      {isAr ? 'ج.م.' : 'EGP'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'تاريخ بداية العرض (اختياري)' : 'Start Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'تاريخ انتهاء العرض (اختياري)' : 'Expiration Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="offerActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="offerActive" className="text-white font-bold cursor-pointer">
                  {isAr ? 'تفعيل العرض وعرضه للعملاء في المتجر فوراً' : 'Make offer active immediately'}
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black shadow-md cursor-pointer disabled:opacity-40"
                >
                  {loading ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ العرض' : 'Save Offer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {offerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">
                {isAr ? 'تأكيد حذف العرض الخاص' : 'Confirm Delete Offer'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? `هل أنت متأكد من حذف (${offerToDelete.nameAr})؟ لن يتأثر سجل الطلبات السابقة.`
                  : `Are you sure you want to delete "${offerToDelete.nameAr}"? Historical orders will not be affected.`}
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setOfferToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteOffer}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {isAr ? 'نعم، احذف العرض' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
