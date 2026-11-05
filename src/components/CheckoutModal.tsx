import React, { useState, useEffect } from 'react';
import { X, MapPin, Plus, CheckCircle, AlertCircle, Truck, ShieldCheck } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { CartItem, DeliveryLocation, Address, UserProfile, Order } from '../types.ts';
import { api } from '../lib/api.ts';

interface CheckoutModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currentUser: UserProfile | null;
  onRequireAuth: () => void;
  locations: DeliveryLocation[];
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  lang,
  isOpen,
  onClose,
  items,
  currentUser,
  onRequireAuth,
  locations,
  onOrderSuccess,
}) => {
  const t = translations[lang];

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New address form state (Egyptian address fields)
  const [newTitle, setNewTitle] = useState('المنزل');
  const [newGovernorate, setNewGovernorate] = useState(locations[0]?.governorate || 'القاهرة');
  const [newCity, setNewCity] = useState(locations[0]?.city || '');
  const [newArea, setNewArea] = useState(locations[0]?.area || '');
  const [newStreet, setNewStreet] = useState('');
  const [newBuildingNumber, setNewBuildingNumber] = useState('');
  const [newFloor, setNewFloor] = useState('');
  const [newApartment, setNewApartment] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0]?.id || '');

  useEffect(() => {
    if (isOpen && currentUser) {
      loadAddresses();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const loadAddresses = async () => {
    try {
      const res = await api.getAddresses();
      if (res.addresses) {
        setAddresses(res.addresses);
        if (res.addresses.length > 0) {
          const defaultAddr = res.addresses.find((a: Address) => a.isDefault) || res.addresses[0];
          setSelectedAddressId(defaultAddr.id);
        } else {
          setIsAddingNewAddress(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sync city & area when location dropdown changes
  const handleLocationDropdownChange = (locId: string) => {
    setSelectedLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) {
      setNewGovernorate(loc.governorate);
      setNewCity(loc.city);
      setNewArea(loc.area);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newStreet || !newBuildingNumber || !selectedLocationId) {
      setError(lang === 'ar' ? 'يرجى إكمال اسم الشارع ورقم العقار واختيار منطقة التوصيل.' : 'Please fill street, building number, and delivery area.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.addAddress({
        title: newTitle,
        governorate: newGovernorate,
        city: newCity,
        area: newArea,
        street: newStreet,
        buildingNumber: newBuildingNumber,
        floor: newFloor,
        apartment: newApartment,
        landmark: newLandmark,
        deliveryLocationId: selectedLocationId,
        isDefault: addresses.length === 0,
      });

      if (res.address) {
        setAddresses((prev) => [...prev, res.address]);
        setSelectedAddressId(res.address.id);
        setIsAddingNewAddress(false);
        // Reset form
        setNewStreet('');
        setNewBuildingNumber('');
        setNewFloor('');
        setNewApartment('');
        setNewLandmark('');
      }
    } catch (err: any) {
      setError(err.message || 'فشل حفظ العنوان');
    } finally {
      setLoading(false);
    }
  };

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const matchedLocation = selectedAddress
    ? locations.find((l) => l.id === selectedAddress.deliveryLocationId || l.area === selectedAddress.area)
    : locations.find((l) => l.id === selectedLocationId) || locations[0];

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = matchedLocation ? matchedLocation.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    if (!selectedAddressId) {
      setError(lang === 'ar' ? 'يرجى اختيار أو حفظ عنوان التوصيل أولاً.' : 'Please select or add a delivery address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderPayload = {
        addressId: selectedAddressId,
        notes: orderNotes,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          selectedOption: i.selectedOption,
          selectedCustomizations: i.selectedCustomizations,
          customNotes: i.customNotes,
        })),
      };

      const res = await api.createOrder(orderPayload);
      if (res.order) {
        onOrderSuccess(res.order);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تأكيد الطلب.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{t.checkout}</h3>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentUser?.block?.isBlocked && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>حسابك معلق حالياً من قِبل إدارة المتجر</span>
              </div>
              <p className="text-[11px] text-red-600">
                السبب: {currentUser.block.reason || 'مخالفة سياسة استلام الطلبات'}.
                يرجى التواصل مع إدارة المتجر لرفع التعليق.
              </p>
            </div>
          )}

          {!currentUser ? (
            <div className="p-6 rounded-2xl bg-pink-50 border border-pink-200 text-center space-y-3">
              <p className="text-sm font-bold text-slate-800">
                {lang === 'ar' ? 'سجل الدخول لإتمام طلب علبة ويف دونتس' : 'Sign in to finish ordering your Wave donuts'}
              </p>
              <button
                onClick={onRequireAuth}
                className="px-6 py-2.5 bg-gradient-to-l from-pink-500 to-cyan-500 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer"
              >
                {t.login} / {t.register}
              </button>
            </div>
          ) : (
            <>
              {/* Delivery Address Section with Egyptian Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-pink-500" />
                    <span>{t.selectAddress}</span>
                  </label>
                  {!isAddingNewAddress && (
                    <button
                      onClick={() => setIsAddingNewAddress(true)}
                      className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t.addNewAddress}
                    </button>
                  )}
                </div>

                {isAddingNewAddress ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.addressTitle}
                        </label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="المنزل، العمل، إلخ"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          منطقة التوصيل المتاحة *
                        </label>
                        <select
                          value={selectedLocationId}
                          onChange={(e) => handleLocationDropdownChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                        >
                          {locations.length === 0 ? (
                            <option value="">لا توجد مناطق توصيل مضافة بعد</option>
                          ) : (
                            locations.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.governorate} - {l.city} ({l.area}) - {l.deliveryFee} ج.م.
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.governorate}
                        </label>
                        <input
                          type="text"
                          value={newGovernorate}
                          onChange={(e) => setNewGovernorate(e.target.value)}
                          placeholder="القاهرة"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.city}
                        </label>
                        <input
                          type="text"
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          placeholder="مدينة نصر"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.area}
                        </label>
                        <input
                          type="text"
                          value={newArea}
                          onChange={(e) => setNewArea(e.target.value)}
                          placeholder="مكرم عبيد"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.street} *
                        </label>
                        <input
                          type="text"
                          value={newStreet}
                          onChange={(e) => setNewStreet(e.target.value)}
                          placeholder="اسم الشارع"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.buildingNumber} *
                        </label>
                        <input
                          type="text"
                          value={newBuildingNumber}
                          onChange={(e) => setNewBuildingNumber(e.target.value)}
                          placeholder="رقم العمارة / العقار"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.floor}
                        </label>
                        <input
                          type="text"
                          value={newFloor}
                          onChange={(e) => setNewFloor(e.target.value)}
                          placeholder="الطابق"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.apartment}
                        </label>
                        <input
                          type="text"
                          value={newApartment}
                          onChange={(e) => setNewApartment(e.target.value)}
                          placeholder="رقم الشقة"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {t.landmark}
                        </label>
                        <input
                          type="text"
                          value={newLandmark}
                          onChange={(e) => setNewLandmark(e.target.value)}
                          placeholder="بجوار..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddingNewAddress(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-200"
                        >
                          {t.cancel}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveNewAddress}
                        disabled={loading}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-xs cursor-pointer"
                      >
                        {t.saveAddress}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'border-pink-500 bg-pink-50/50 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{addr.title}</span>
                              <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">
                                {addr.governorate} - {addr.city} ({addr.area})
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              شارع {addr.street} · عمارة {addr.buildingNumber}
                              {addr.floor ? ` · طابق ${addr.floor}` : ''}
                              {addr.apartment ? ` · شقة ${addr.apartment}` : ''}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-pink-600 bg-pink-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'ملاحظات لمندوب التوصيل' : 'Driver Delivery Notes'}
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: الاتصال قبل الوصول بدقائق...' : 'e.g. Call 5 mins before arrival...'}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-pink-500"
                />
              </div>

              {/* Cash On Delivery Method */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-black">
                    💵
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{t.cod}</p>
                    <p className="text-[11px] text-slate-500">{t.codNotice}</p>
                  </div>
                </div>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>

              {/* Order Breakdown in EGP */}
              <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{t.subtotal} ({items.length} {lang === 'ar' ? 'أصناف' : 'items'})</span>
                  <span className="font-bold tabular-nums text-slate-900 font-mono">{subtotal} {t.currency}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t.deliveryFee}</span>
                  <span className="font-bold tabular-nums text-cyan-600 font-mono">
                    {deliveryFee > 0 ? `${deliveryFee} ${t.currency}` : (lang === 'ar' ? 'حدد المنطقة' : 'Select area')}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-pink-100">
                  <span>{t.total} ({t.cod})</span>
                  <span className="text-pink-600 tabular-nums font-mono">{total} {t.currency}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {currentUser && (
          <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
            <button
              onClick={onClose}
              className="py-3 px-5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !selectedAddressId || locations.length === 0}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-l from-[#FF4D8D] to-[#06B6D4] text-white font-extrabold text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>{lang === 'ar' ? 'جاري التحقق وتأكيد الطلب...' : 'Validating & Placing Order...'}</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{t.placeOrder}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
