import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Package, LogOut, Plus, Trash2, Compass, AlertCircle } from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import { UserProfile, Address, Order, DeliveryLocation } from '../types.ts';
import { api, setToken } from '../lib/api.ts';

interface ProfileModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  locations: DeliveryLocation[];
  onTrackOrder: (order: Order) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  lang,
  isOpen,
  onClose,
  currentUser,
  onLogout,
  locations,
  onTrackOrder,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'ADDRESSES'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  // New address form state
  const [showAddAddress, setShowAddAddress] = useState(false);
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
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadData();
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, addrRes] = await Promise.all([
        api.getMyOrders(),
        api.getAddresses(),
      ]);
      if (orderRes.orders) setOrders(orderRes.orders);
      if (addrRes.addresses) setAddresses(addrRes.addresses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationDropdown = (locId: string) => {
    setSelectedLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc) {
      setNewGovernorate(loc.governorate);
      setNewCity(loc.city);
      setNewArea(loc.area);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet || !newBuildingNumber || !selectedLocationId) {
      setAddressError(lang === 'ar' ? 'الشارع ورقم العقار واختيار المنطقة مطلوبة.' : 'Street, building number, and area are required.');
      return;
    }

    try {
      setAddressError(null);
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
        setShowAddAddress(false);
        setNewStreet('');
        setNewBuildingNumber('');
      }
    } catch (err: any) {
      setAddressError(err.message || 'فشل حفظ العنوان');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (
      confirm(
        lang === 'ar'
          ? 'هل أنت متأكد من حذف هذا العنوان المحفوظ من حسابك؟'
          : 'Are you sure you want to delete this saved address from your account?'
      )
    ) {
      try {
        await api.deleteAddress(id);
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      } catch (err: any) {
        alert(err.message || (lang === 'ar' ? 'فشل حذف العنوان' : 'Failed to delete address'));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden font-[Cairo]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-cyan-500 text-white flex items-center justify-center font-black text-xl">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{currentUser.name}</h3>
              <p className="text-xs text-slate-500 font-semibold font-mono">{currentUser.phone} · {currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'ORDERS'
                ? 'bg-pink-50 text-pink-600 border border-pink-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{t.myOrders} ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ADDRESSES')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'ADDRESSES'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{t.savedAddresses} ({addresses.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'ORDERS' ? (
            orders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-xs font-semibold">{lang === 'ar' ? 'لا توجد طلبات سابقة بعد. اطلب علبة دونتس الآن!' : 'No past orders yet.'}</p>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 font-mono">
                        {t.orderNumber}{ord.orderNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-pink-600 border border-pink-200">
                        {t.status[ord.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(ord.createdAt).toLocaleDateString()} · {ord.items.length} {lang === 'ar' ? 'أصناف' : 'items'} · {ord.locationSummary}
                    </p>
                    <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                      {ord.items.map((it, idx) => (
                        <span key={idx} className="inline-block ml-3 text-slate-500">
                          {it.quantity}x {it.productNameAr}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-sm font-black text-slate-900 tabular-nums font-mono">
                      {ord.total} {t.currency} (كاش)
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onTrackOrder(ord);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-cyan-600 border border-cyan-200 text-xs font-bold transition cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{t.trackOrder}</span>
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t.savedAddresses}</span>
                {!showAddAddress && (
                  <button
                    onClick={() => setShowAddAddress(true)}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> {t.addNewAddress}
                  </button>
                )}
              </div>

              {showAddAddress && (
                <form onSubmit={handleAddAddress} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  {addressError && (
                    <div className="text-xs text-red-600 font-semibold">{addressError}</div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="اسم العنوان (المنزل، العمل...)"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                    <select
                      value={selectedLocationId}
                      onChange={(e) => handleLocationDropdown(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-medium"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.governorate} - {loc.city} ({loc.area}) — {loc.deliveryFee} {t.currency} توصيل
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="اسم الشارع *"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={newBuildingNumber}
                      onChange={(e) => setNewBuildingNumber(e.target.value)}
                      placeholder="رقم العقار / العمارة *"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newFloor}
                      onChange={(e) => setNewFloor(e.target.value)}
                      placeholder="الطابق"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={newApartment}
                      onChange={(e) => setNewApartment(e.target.value)}
                      placeholder="رقم الشقة"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={newLandmark}
                      onChange={(e) => setNewLandmark(e.target.value)}
                      placeholder="علامة مميزة"
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 rounded-lg hover:bg-slate-200"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-xs cursor-pointer"
                    >
                      {t.saveAddress}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {addresses.map((a) => (
                  <div key={a.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{a.title}</span>
                        <span className="text-[10px] text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md font-semibold">
                          {a.governorate} - {a.city} ({a.area})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        شارع {a.street} · عمارة {a.buildingNumber}
                        {a.floor ? ` · طابق ${a.floor}` : ''}
                        {a.apartment ? ` · شقة ${a.apartment}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(a.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with logout */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <button
            onClick={() => {
              setToken(null);
              onLogout();
              onClose();
            }}
            className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
