import React, { useState, useEffect } from 'react';
import { X, Search, RefreshCw, CheckCircle, Clock, Truck, ChefHat, AlertTriangle, MapPin } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { Order, OrderStatus } from '../types.ts';
import { api } from '../lib/api.ts';

interface OrderTrackingModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  initialOrder: Order | null;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  lang,
  isOpen,
  onClose,
  initialOrder,
}) => {
  const t = translations[lang];
  const [searchInput, setSearchInput] = useState(initialOrder ? String(initialOrder.orderNumber) : '');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialOrder) {
      setOrder(initialOrder);
      setSearchInput(String(initialOrder.orderNumber));
    }
  }, [isOpen, initialOrder]);

  if (!isOpen) return null;

  const fetchOrder = async (query: string, phoneInput?: string) => {
    if (!query) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.trackOrder(query.trim(), phoneInput || verifyPhone.trim() || undefined);
      if (res.order) {
        setOrder(res.order);
        setShowPhoneInput(false);
      }
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'لم يتم العثور على طلب بهذا الرقم أو الوصول غير مصرح به' : 'Order not found or access denied'));
      if (err.message && (err.message.includes('هاتف') || err.message.includes('خصوصية') || err.message.includes('صلاحية'))) {
        setShowPhoneInput(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(searchInput);
  };

  const getStepState = (stepStatus: OrderStatus) => {
    if (!order) return 'upcoming';
    if (order.status === 'CANCELLED') return 'cancelled';

    const orderHierarchy: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = orderHierarchy.indexOf(order.status);
    const stepIndex = orderHierarchy.indexOf(stepStatus);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const steps: { status: OrderStatus; labelAr: string; labelEn: string; icon: any }[] = [
    { status: 'PENDING', labelAr: 'تم استلام الطلب', labelEn: 'Order Received', icon: Clock },
    { status: 'CONFIRMED', labelAr: 'تم تأكيد المطبخ', labelEn: 'Kitchen Confirmed', icon: CheckCircle },
    { status: 'PREPARING', labelAr: 'جاري التحضير والخبز', labelEn: 'Preparing & Baking', icon: ChefHat },
    { status: 'OUT_FOR_DELIVERY', labelAr: 'في الطريق مع المندوب', labelEn: 'Out for Delivery', icon: Truck },
    { status: 'DELIVERED', labelAr: 'تم التوصيل بنجاح', labelEn: 'Delivered Fresh', icon: CheckCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-cyan-400 text-white flex items-center justify-center font-black">
              🌊
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{t.tracking}</h3>
              <p className="text-xs text-slate-500 font-semibold">{t.slogan}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 pb-2 space-y-2">
          <form onSubmit={handleSearch} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={lang === 'ar' ? 'أدخل رقم الطلب (مثال: 101)...' : 'Enter Order # (e.g. 101)...'}
                  className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-pink-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-2xl hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.trackOrder}
              </button>
            </div>

            {showPhoneInput && (
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl space-y-1.5 animate-in fade-in">
                <label className="block text-[11px] font-bold text-pink-700">
                  {lang === 'ar' ? 'أدخل رقم الهاتف المسجل مع الطلب للتحقق من هويتك:' : 'Enter customer phone number to verify:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={verifyPhone}
                    onChange={(e) => setVerifyPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-pink-300 font-mono focus:outline-pink-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => fetchOrder(searchInput, verifyPhone)}
                    disabled={loading || !verifyPhone}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {lang === 'ar' ? 'تأكيد' : 'Verify'}
                  </button>
                </div>
              </div>
            )}
          </form>
          {error && <p className="text-xs text-red-600 mt-2 font-medium">{error}</p>}
        </div>

        {/* Order Details Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {order ? (
            <>
              {/* Order Status Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-l from-pink-50 to-cyan-50 border border-pink-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {t.orderNumber}{order.orderNumber}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white text-pink-600 border border-pink-200">
                      {t.status[order.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {order.locationSummary}
                  </p>
                </div>
                <button
                  onClick={() => fetchOrder(String(order.orderNumber))}
                  className="p-2 rounded-xl bg-white text-cyan-600 hover:bg-cyan-50 border border-cyan-200 transition cursor-pointer"
                  title="تحديث الحالة"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Cancellation Reason Banner */}
              {order.status === 'CANCELLED' && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>{lang === 'ar' ? 'تم الاعتذار عن هذا الطلب' : 'Order Cancelled'}</span>
                  </div>
                  <p>{order.cancellationReason || (lang === 'ar' ? 'عذراً، نفدت الكمية المطلوبة حالياً.' : 'Item out of stock')}</p>
                </div>
              )}

              {/* Progress Steps Timeline */}
              {order.status !== 'CANCELLED' && (
                <div className="py-2">
                  <div className="relative">
                    <div className="absolute top-4 bottom-4 right-4 w-0.5 bg-slate-200" />

                    <div className="space-y-6">
                      {steps.map((st, idx) => {
                        const state = getStepState(st.status);
                        const Icon = st.icon;
                        const isCompleted = state === 'completed';
                        const isCurrent = state === 'current';

                        return (
                          <div key={idx} className="flex items-center gap-4 relative z-10">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-gradient-to-l from-pink-500 to-cyan-500 text-white ring-4 ring-pink-100 shadow-md animate-pulse'
                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className={`text-xs font-bold ${isCurrent ? 'text-pink-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                                {lang === 'ar' ? st.labelAr : st.labelEn}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Box Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {lang === 'ar' ? 'محتويات علبة الدونتس' : 'Donut Box Contents'}
                </h4>
                <div className="space-y-2">
                  {order.items.map((it, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-pink-600 tabular-nums font-mono">{it.quantity}x</span>
                        <div>
                          <span className="font-bold text-slate-800">{it.productNameAr}</span>
                          {it.selectedOption && (
                            <p className="text-[10px] text-slate-400">{it.selectedOption}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-extrabold tabular-nums text-slate-900 font-mono">
                        {it.unitPrice * it.quantity} {t.currency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Egyptian Delivery Address & Cash to Pay */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">{order.addressDetails.title}</span>
                    <p className="text-slate-500">
                      {order.addressDetails.governorate} - {order.addressDetails.city} - {order.addressDetails.area} - شارع {order.addressDetails.street} - عمارة {order.addressDetails.buildingNumber}
                      {order.addressDetails.floor ? ` · طابق ${order.addressDetails.floor}` : ''}
                      {order.addressDetails.apartment ? ` · شقة ${order.addressDetails.apartment}` : ''}
                      {order.addressDetails.landmark ? ` (${order.addressDetails.landmark})` : ''}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{lang === 'ar' ? 'مجموع الأصناف:' : 'Items Subtotal:'}</span>
                    <span className="font-bold tabular-nums text-slate-900 font-mono">{order.subtotal} {t.currency}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <span>{lang === 'ar' ? 'رسوم التوصيل:' : 'Delivery Fee:'}</span>
                      {order.locationSummary && (
                        <span className="text-[10px] text-slate-500 font-semibold">({order.locationSummary.split('-').pop()?.trim() || order.locationSummary})</span>
                      )}
                    </span>
                    <span className="font-bold tabular-nums text-cyan-600 font-mono">{order.deliveryFee} {t.currency}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                    <span>{lang === 'ar' ? 'المبلغ المطلوب سداده للمندوب:' : 'Amount to pay on delivery:'}</span>
                    <span className="text-pink-600 tabular-nums font-mono">{order.total} {t.currency} (كاش)</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                🔎
              </div>
              <p className="text-xs font-semibold">
                {lang === 'ar' ? 'أدخل رقم طلبك أعلاه لمتابعة الخَبز والتوصيل المباشر.' : 'Enter your Order # above to track live status.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
