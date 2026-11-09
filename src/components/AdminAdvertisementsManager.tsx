import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Calendar,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  X,
  Layers,
  Sparkles,
  Layout,
  Tv,
} from 'lucide-react';
import { Advertisement, AdPlacement, Language } from '../types';
import { api } from '../lib/api';

interface AdminAdvertisementsManagerProps {
  lang: Language;
  onAdsUpdated?: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export const AdminAdvertisementsManager: React.FC<AdminAdvertisementsManagerProps> = ({
  lang,
  onAdsUpdated,
  showSuccess,
  showError,
}) => {
  const isAr = lang === 'ar';
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlacementFilter, setSelectedPlacementFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  // Form Fields
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [placement, setPlacement] = useState<AdPlacement>('BETWEEN_SECTIONS');
  const [linkUrl, setLinkUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Multiple Images State
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Deletion Modal
  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminAdvertisements();
      if (res && Array.isArray(res.advertisements)) {
        setAds(res.advertisements);
      }
    } catch (err: any) {
      showError(err.message || 'فشل جلب الإعلانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const resetForm = () => {
    setEditingAdId(null);
    setTitleAr('');
    setTitleEn('');
    setDescriptionAr('');
    setDescriptionEn('');
    setPlacement('BETWEEN_SECTIONS');
    setLinkUrl('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setImages([]);
    setImageUrlInput('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ad: Advertisement) => {
    setEditingAdId(ad.id);
    setTitleAr(ad.titleAr || '');
    setTitleEn(ad.titleEn || '');
    setDescriptionAr(ad.descriptionAr || '');
    setDescriptionEn(ad.descriptionEn || '');
    setPlacement(ad.placement || 'BETWEEN_SECTIONS');
    setLinkUrl(ad.linkUrl || '');
    setStartDate(ad.startDate || '');
    setEndDate(ad.endDate || '');
    setIsActive(ad.isActive ?? true);
    const existingImages = ad.images && ad.images.length > 0 ? ad.images : (ad.imageUrl ? [ad.imageUrl] : []);
    setImages(existingImages);
    setIsModalOpen(true);
  };

  // Image Upload handler
  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await api.uploadImage(file);
      if (res && res.imageUrl) {
        setImages((prev) => [...prev, res.imageUrl]);
        showSuccess(isAr ? 'تم رفع صورة الإعلان بنجاح' : 'Ad image uploaded');
      }
    } catch (err: any) {
      showError(err.message || 'فشل رفع صورة الإعلان');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save Ad
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titleAr.trim()) {
      showError(isAr ? 'يرجى إدخال عنوان الإعلان بالعربية' : 'Please provide ad title in Arabic');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim(),
        descriptionAr: descriptionAr.trim(),
        descriptionEn: descriptionEn.trim(),
        imageUrl: images[0] || '',
        images,
        placement,
        linkUrl: linkUrl.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        isActive,
      };

      if (editingAdId) {
        await api.updateAdvertisement(editingAdId, payload);
        showSuccess(isAr ? 'تم تحديث الإعلان بنجاح' : 'Advertisement updated');
      } else {
        await api.createAdvertisement(payload);
        showSuccess(isAr ? 'تم إنشاء الإعلان بنجاح' : 'Advertisement created');
      }

      setIsModalOpen(false);
      resetForm();
      await fetchAds();
      if (onAdsUpdated) onAdsUpdated();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ الإعلان');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (ad: Advertisement) => {
    try {
      await api.toggleAdvertisementActive(ad.id);
      showSuccess(
        ad.isActive
          ? (isAr ? 'تم تعطيل الإعلان' : 'Advertisement deactivated')
          : (isAr ? 'تم تفعيل الإعلان' : 'Advertisement activated')
      );
      await fetchAds();
      if (onAdsUpdated) onAdsUpdated();
    } catch (err: any) {
      showError(err.message || 'فشل تعديل حالة الإعلان');
    }
  };

  // Delete Ad
  const confirmDeleteAd = async () => {
    if (!adToDelete) return;
    try {
      setLoading(true);
      await api.deleteAdvertisement(adToDelete.id);
      showSuccess(isAr ? 'تم حذف الإعلان بنجاح' : 'Advertisement deleted');
      setAdToDelete(null);
      await fetchAds();
      if (onAdsUpdated) onAdsUpdated();
    } catch (err: any) {
      showError(err.message || 'فشل حذف الإعلان');
    } finally {
      setLoading(false);
    }
  };

  // Reordering: move ad up or down within its placement
  const handleMoveOrder = async (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ads.length) return;

    const newAds = [...ads];
    const temp = newAds[index];
    newAds[index] = newAds[targetIdx];
    newAds[targetIdx] = temp;

    setAds(newAds);
    try {
      await api.reorderAdvertisements(newAds.map((a) => a.id));
      showSuccess(isAr ? 'تم حفظ الترتيب الجديد للإعلانات' : 'Order updated');
      if (onAdsUpdated) onAdsUpdated();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ ترتيب الإعلانات');
      fetchAds();
    }
  };

  const placementLabels: Record<AdPlacement, { ar: string; en: string; icon: string }> = {
    TOP_HERO: { ar: 'شريط أعلى الموقع الرئيسي', en: 'Top Bar Announcement', icon: '📢' },
    BETWEEN_SECTIONS: { ar: 'بانر رئيسي مميز بين الأقسام', en: 'Between Sections Banner', icon: '🖼️' },
    POPUP_MODAL: { ar: 'نافذة منبثقة للزوار (Popup)', en: 'Popup Dialog Modal', icon: '🪟' },
    FOOTER_BANNER: { ar: 'بانر أسفل الصفحة قبل الفوتر', en: 'Footer Banner', icon: '📌' },
  };

  const filteredAds = ads.filter((ad) => {
    if (selectedPlacementFilter === 'ALL') return true;
    return ad.placement === selectedPlacementFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-bold mb-2 border border-pink-500/20">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{isAr ? 'إدارة الإعلانات والبانرات الترويجية' : 'Storefront Ads Management'}</span>
          </div>
          <h2 className="text-xl font-black text-white">
            {isAr ? 'صفحة الإعلانات والحملات الترويجية' : 'Advertisements & Banners'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {isAr
              ? 'تحكم كامل في بانرات وإعلانات Wave Donuts: يمكنك رفع صور متعددة، وتحديد موقع ظهور الإعلان في المتجر، وتواريخ النشر والانتهاء، وإعادة ترتيبها بالسحب أو الأزرار.'
              : 'Upload images, manage placement on storefront, set campaign dates, and reorder ads.'}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-l from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? '+ إنشاء إعلان جديد' : '+ Create New Ad'}</span>
        </button>
      </div>

      {/* Filter by Placement */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedPlacementFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedPlacementFilter === 'ALL'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          {isAr ? 'كافة المواقع' : 'All Placements'} ({ads.length})
        </button>

        {(['TOP_HERO', 'BETWEEN_SECTIONS', 'POPUP_MODAL', 'FOOTER_BANNER'] as AdPlacement[]).map((p) => (
          <button
            key={p}
            onClick={() => setSelectedPlacementFilter(p)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedPlacementFilter === p
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>{placementLabels[p].icon}</span>
            <span>{isAr ? placementLabels[p].ar : placementLabels[p].en}</span>
            <span className="text-[10px] opacity-75 font-mono">
              ({ads.filter((a) => a.placement === p).length})
            </span>
          </button>
        ))}
      </div>

      {/* Ads List */}
      {filteredAds.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isAr ? 'لا توجد إعلانات مسجلة في هذا القسم' : 'No advertisements in this section'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {isAr
                ? 'قم بإنشاء إعلان جديد لتسليط الضوء على مناسبات خاصة، أحدث الأصناف، أو عروض التوصيل.'
                : 'Create promotional banners or announcements to engage customers.'}
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-bold hover:bg-pink-500 transition"
          >
            {isAr ? 'إنشاء إعلان جديد الآن' : 'Create Advertisement'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAds.map((ad, index) => {
            const adImages = ad.images && ad.images.length > 0 ? ad.images : (ad.imageUrl ? [ad.imageUrl] : []);

            return (
              <div
                key={ad.id}
                className={`p-4 sm:p-5 rounded-3xl bg-slate-900 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  ad.isActive
                    ? 'border-slate-800 hover:border-pink-500/50 shadow-md'
                    : 'border-slate-800/60 opacity-60'
                }`}
              >
                {/* Left / Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Order controls */}
                  <div className="flex flex-col gap-1 items-center shrink-0">
                    <button
                      onClick={() => handleMoveOrder(index, 'UP')}
                      disabled={index === 0}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 transition"
                      title="تحريك لأعلى"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {ad.displayOrder || index + 1}
                    </span>
                    <button
                      onClick={() => handleMoveOrder(index, 'DOWN')}
                      disabled={index === filteredAds.length - 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 transition"
                      title="تحريك لأسفل"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail / Multiple thumbnails */}
                  <div className="relative shrink-0">
                    {adImages.length > 0 ? (
                      <div className="flex -space-x-4 rtl:space-x-reverse">
                        {adImages.slice(0, 3).map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={ad.titleAr}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-900 shadow-md"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-2xl">
                        📢
                      </div>
                    )}
                    {adImages.length > 1 && (
                      <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-pink-600 text-white px-1.5 py-0.2 rounded-md">
                        {adImages.length} صور
                      </span>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-pink-400 bg-pink-950/60 border border-pink-900/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <span>{placementLabels[ad.placement]?.icon}</span>
                        <span>{isAr ? placementLabels[ad.placement]?.ar : placementLabels[ad.placement]?.en}</span>
                      </span>

                      <h4 className="text-sm font-black text-white truncate">
                        {ad.titleAr}
                      </h4>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ad.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {ad.isActive
                          ? (isAr ? 'منشور ونشط' : 'Active')
                          : (isAr ? 'معطل مؤقتاً' : 'Inactive')}
                      </span>
                    </div>

                    {ad.titleEn && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                        {ad.titleEn}
                      </p>
                    )}

                    {ad.descriptionAr && (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-1 leading-relaxed">
                        {ad.descriptionAr}
                      </p>
                    )}

                    {/* Meta info: dates and link */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 flex-wrap">
                      {(ad.startDate || ad.endDate) && (
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {ad.startDate || '—'} ➔ {ad.endDate || (isAr ? 'مستمر' : 'Ongoing')}
                          </span>
                        </span>
                      )}

                      {ad.linkUrl && (
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{ad.linkUrl}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right / Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      ad.isActive
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {ad.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{ad.isActive ? (isAr ? 'تعطيل' : 'Disable') : (isAr ? 'تفعيل' : 'Enable')}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(ad)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title={isAr ? 'تعديل الإعلان' : 'Edit Ad'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعديل' : 'Edit'}</span>
                  </button>

                  <button
                    onClick={() => setAdToDelete(ad)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-red-400 text-xs font-bold transition cursor-pointer"
                    title={isAr ? 'حذف الإعلان' : 'Delete Ad'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Ad Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingAdId
                      ? (isAr ? 'تعديل الإعلان الترويجي' : 'Edit Advertisement')
                      : (isAr ? 'إنشاء إعلان جديد' : 'Create Advertisement')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'تحكم في نص الإعلان وصوره وموقع ظهوره للعملاء' : 'Configure ad content, images, and storefront placement'}
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

            {/* Modal Form */}
            <form onSubmit={handleSaveAd} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Placement Selector */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  {isAr ? 'مكان ظهور الإعلان في المتجر *' : 'Ad Placement on Storefront *'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['TOP_HERO', 'BETWEEN_SECTIONS', 'POPUP_MODAL', 'FOOTER_BANNER'] as AdPlacement[]).map((p) => (
                    <label
                      key={p}
                      onClick={() => setPlacement(p)}
                      className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition ${
                        placement === p
                          ? 'bg-pink-950/40 border-pink-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="placement"
                        checked={placement === p}
                        onChange={() => setPlacement(p)}
                        className="text-pink-500 focus:ring-pink-500"
                      />
                      <div>
                        <p className="font-bold text-xs flex items-center gap-1.5">
                          <span>{placementLabels[p].icon}</span>
                          <span>{isAr ? placementLabels[p].ar : placementLabels[p].en}</span>
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'عنوان الإعلان (بالعربية) *' : 'Ad Title (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: خصم 20% على جميع مشروبات القهوة"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'عنوان الإعلان (بالإنجليزية - اختياري)' : 'Ad Title (English - Optional)'}
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="e.g. 20% Off All Coffee Drinks"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-pink-500 font-sans"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'وصف أو نص الإعلان (بالعربية)' : 'Description (Arabic)'}
                  </label>
                  <textarea
                    rows={2}
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    placeholder="تفاصيل العرض الترويجي..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'وصف أو نص الإعلان (بالإنجليزية)' : 'Description (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    placeholder="Ad details in English..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-pink-500 font-sans"
                  />
                </div>
              </div>

              {/* Multi-Image Upload */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-pink-400 font-black">
                    {isAr ? 'صور الإعلان (يمكن رفع صور متعددة للبانر أو السلايدر)' : 'Ad Images (Supports Multiple Images)'}
                  </label>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    {images.length} صور
                  </span>
                </div>

                {/* Upload Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? (isAr ? 'جارٍ الرفع...' : 'Uploading...') : (isAr ? 'رفع صورة من جهازك' : 'Upload from Device')}</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadImageFile}
                  />

                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="أو الصق رابط صورة مباشر..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-[11px] placeholder-slate-500 focus:outline-pink-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      disabled={!imageUrlInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                    >
                      {isAr ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </div>

                {/* Image Thumbnails List */}
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-video bg-black">
                        <img src={img} alt={`Ad photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition shadow-md"
                          title="حذف الصورة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-pink-600 text-white px-1.5 py-0.2 rounded">
                            {isAr ? 'رئيسية' : 'Cover'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    {isAr ? 'لم يتم إضافة صور للإعلان بعد. يمكنك رفع صورة أو أكثر.' : 'No images attached yet.'}
                  </p>
                )}
              </div>

              {/* Action / Link URL */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {isAr ? 'رابط الزر أو التوجيه (اختياري)' : 'Target Link URL (Optional)'}
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://... أو /#menu"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-pink-500 font-mono"
                />
              </div>

              {/* Campaign Schedule Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'تاريخ بداية النشر (اختياري)' : 'Start Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-pink-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {isAr ? 'تاريخ انتهاء النشر (اختياري)' : 'Expiration Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-pink-500 font-mono"
                  />
                </div>
              </div>

              {/* IsActive Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="adActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-pink-500 focus:ring-pink-500"
                />
                <label htmlFor="adActive" className="text-white font-bold cursor-pointer">
                  {isAr ? 'تفعيل ونشر الإعلان فوراً في المكان المحدد' : 'Publish advertisement immediately'}
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-l from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-black shadow-md cursor-pointer disabled:opacity-40"
                >
                  {loading ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الإعلان' : 'Save Advertisement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {adToDelete && (
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
                {isAr ? 'تأكيد حذف الإعلان' : 'Confirm Delete Advertisement'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? `هل أنت متأكد من حذف الإعلان (${adToDelete.titleAr}) نهائياً؟`
                  : `Are you sure you want to permanently delete "${adToDelete.titleAr}"?`}
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setAdToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmDeleteAd}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {isAr ? 'نعم، احذف الإعلان' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
