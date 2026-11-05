import React, { useState, useEffect } from 'react';
import { Language, translations } from './lib/i18n.ts';
import { DonutProduct, Category, DeliveryLocation, CartItem, UserProfile, Order, StoreSettings, CustomizationGroup } from './types.ts';
import { api, getToken } from './lib/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { DonutCatalog } from './components/DonutCatalog.tsx';
import { Footer } from './components/Footer.tsx';
import { CustomizationModal } from './components/CustomizationModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderTrackingModal } from './components/OrderTrackingModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ProductDetailsModal } from './components/ProductDetailsModal.tsx';

export default function App() {
  // Arabic is the default language
  const [lang, setLang] = useState<Language>('ar');
  const [viewMode, setViewMode] = useState<'STORE' | 'ADMIN'>(() => {
    try {
      return (localStorage.getItem('wave_view_mode') as 'STORE' | 'ADMIN') || 'STORE';
    } catch {
      return 'STORE';
    }
  });

  // Core Store Data
  const [products, setProducts] = useState<DonutProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Cart State (Persisted in localStorage for customer convenience)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('wave_cart_eg');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedLocation, setSelectedLocation] = useState<DeliveryLocation | null>(null);

  // Modals
  const [customizingDonut, setCustomizingDonut] = useState<DonutProduct | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<DonutProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authAdminTarget, setAuthAdminTarget] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[lang];

  // Save cart
  useEffect(() => {
    localStorage.setItem('wave_cart_eg', JSON.stringify(cart));
  }, [cart]);

  // Save viewMode
  useEffect(() => {
    localStorage.setItem('wave_view_mode', viewMode);
  }, [viewMode]);

  // Set Arabic RTL by default or LTR if English is selected
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Initial load
  useEffect(() => {
    loadStoreSettings();
    loadDonuts();
    loadCustomizationGroups();
    loadLocations();
    loadCurrentUser();
  }, []);

  const loadStoreSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) setSettings(res.settings);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDonuts = async () => {
    try {
      const res = await api.getDonuts();
      if (res.products) setProducts(res.products);
      if (res.categories) setCategories(res.categories);
    } catch (err) {
      console.error('Error loading donuts:', err);
    }
  };

  const loadCustomizationGroups = async () => {
    try {
      const res = await api.getCustomizationGroups();
      if (res.groups) setCustomizationGroups(res.groups);
    } catch (err) {
      console.error('Error loading customization groups:', err);
    }
  };

  const loadLocations = async () => {
    try {
      const res = await api.getDeliveryLocations();
      if (res.locations) {
        setDeliveryLocations(res.locations);
        if (res.locations.length > 0 && !selectedLocation) {
          setSelectedLocation(res.locations[0]);
        }
      }
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const loadCurrentUser = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await api.getMe();
      if (res.user) {
        setCurrentUser(res.user);
      }
    } catch {
      localStorage.removeItem('wave_token');
      setCurrentUser(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === newItem.productId && i.selectedOption === newItem.selectedOption
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });

    showToast(
      lang === 'ar'
        ? `تمت إضافة (${newItem.quantity}x ${newItem.product.nameAr}) إلى علبتك!`
        : `Added ${newItem.quantity}x ${newItem.product.nameAr} to your box!`
    );
    setIsCartOpen(true);
  };

  const handleQuickAdd = (donut: DonutProduct, quantity = 1) => {
    handleAddToCart({
      productId: donut.id,
      product: donut,
      quantity,
      selectedOption: '',
      unitPrice: donut.basePrice,
    });
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].quantity = quantity;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOrderSuccess = (newOrder: Order) => {
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setTrackedOrder(newOrder);
    setIsTrackingOpen(true);
    showToast(lang === 'ar' ? 'تم تأكيد طلبك بنجاح! نقوم الآن بخبز وتحضير الدونتس.' : 'Order placed successfully!');
  };

  const handleOpenAdminTrigger = () => {
    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER') {
      setViewMode('ADMIN');
    } else {
      setAuthAdminTarget(true);
      setIsAuthOpen(true);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 ${lang === 'ar' ? 'font-[Cairo]' : 'font-[Plus_Jakarta_Sans]'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold py-2.5 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="text-pink-400">🌊</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Switch between Storefront and Admin Dashboard */}
      {viewMode === 'ADMIN' && currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'OWNER') ? (
        <AdminDashboard
          lang={lang}
          currentUser={currentUser}
          onExitAdmin={() => setViewMode('STORE')}
          products={products}
          categories={categories}
          deliveryLocations={deliveryLocations}
          onReloadProducts={() => {
            loadDonuts();
            loadStoreSettings();
          }}
          onReloadLocations={loadLocations}
        />
      ) : (
        <>
          {/* Top Announcement Bar if enabled by owner */}
          {settings?.showAnnouncement && settings.announcementAr && (
            <div className="bg-gradient-to-l from-[#FF4D8D] via-[#06B6D4] to-[#FF4D8D] text-white text-xs font-semibold py-2 px-4 text-center tracking-wide flex justify-between items-center">
              <span className="font-bold flex items-center gap-1.5 mx-auto">
                <span>🍩</span>
                <span>{lang === 'ar' ? settings.announcementAr : (settings.announcementEn || settings.announcementAr)}</span>
              </span>
              <button
                onClick={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
                className="bg-white/20 hover:bg-white/30 px-3 py-0.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0"
              >
                {lang === 'ar' ? 'English' : 'العربية'}
              </button>
            </div>
          )}

          {/* Navigation Bar */}
          <Navbar
            lang={lang}
            onToggleLang={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
            cartCount={totalCartCount}
            onOpenCart={() => setIsCartOpen(true)}
            currentUser={currentUser}
            onOpenAuth={() => {
              setAuthAdminTarget(false);
              setIsAuthOpen(true);
            }}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenTracking={() => {
              setTrackedOrder(null);
              setIsTrackingOpen(true);
            }}
            onOpenAdmin={handleOpenAdminTrigger}
            viewMode={viewMode}
            onSwitchView={(mode) => {
              if (mode === 'ADMIN') handleOpenAdminTrigger();
              else setViewMode('STORE');
            }}
            settings={settings}
          />

          {/* Hero Section */}
          <Hero
            lang={lang}
            settings={settings}
            onOrderClick={() => {
              const menu = document.getElementById('menu');
              menu?.scrollIntoView({ behavior: 'smooth' });
            }}
            onTrackClick={() => {
              setTrackedOrder(null);
              setIsTrackingOpen(true);
            }}
          />

          {/* Main Donut Catalog (Regular Donuts, Custom Donut Builder & Drinks) */}
          <DonutCatalog
            lang={lang}
            products={products}
            categories={categories}
            customizationGroups={customizationGroups}
            settings={settings}
            onSelectDonut={(donut) => setCustomizingDonut(donut)}
            onQuickAdd={handleQuickAdd}
            onOpenDetails={(donut) => setSelectedProductForDetails(donut)}
            onAddToCart={handleAddToCart}
          />

          {/* Footer */}
          <Footer
            lang={lang}
            settings={settings}
            onOpenTracking={() => {
              setTrackedOrder(null);
              setIsTrackingOpen(true);
            }}
            onOpenAdmin={handleOpenAdminTrigger}
          />

          {/* Product Details Modal (Ingredients, Image Gallery & Quick Add) */}
          {selectedProductForDetails && (
            <ProductDetailsModal
              lang={lang}
              product={selectedProductForDetails}
              customizationGroups={customizationGroups}
              isOpen={Boolean(selectedProductForDetails)}
              onClose={() => setSelectedProductForDetails(null)}
              onAddToCart={handleAddToCart}
              onOpenCustomizer={(donut) => {
                setSelectedProductForDetails(null);
                setCustomizingDonut(donut);
              }}
            />
          )}

          {/* Donut Customization & Ingredients Modal */}
          {customizingDonut && (
            <CustomizationModal
              lang={lang}
              donut={customizingDonut}
              customizationGroups={customizationGroups}
              onClose={() => setCustomizingDonut(null)}
              onAddToCart={handleAddToCart}
            />
          )}

          {/* Cart Drawer */}
          <CartDrawer
            lang={lang}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            locations={deliveryLocations}
            selectedLocation={selectedLocation}
            onSelectLocation={(loc) => setSelectedLocation(loc)}
            onProceedToCheckout={() => {
              setIsCartOpen(false);
              setIsCheckoutOpen(true);
            }}
          />

          {/* Egyptian Checkout Modal (EGP, Cash on Delivery) */}
          {isCheckoutOpen && (
            <CheckoutModal
              lang={lang}
              isOpen={isCheckoutOpen}
              onClose={() => setIsCheckoutOpen(false)}
              items={cart}
              currentUser={currentUser}
              onRequireAuth={() => {
                setIsCheckoutOpen(false);
                setAuthAdminTarget(false);
                setIsAuthOpen(true);
              }}
              locations={deliveryLocations}
              onOrderSuccess={handleOrderSuccess}
            />
          )}

          {/* Live Order Tracking Modal */}
          {isTrackingOpen && (
            <OrderTrackingModal
              lang={lang}
              isOpen={isTrackingOpen}
              onClose={() => setIsTrackingOpen(false)}
              initialOrder={trackedOrder}
            />
          )}

          {/* Authentication Modal (Owner Setup / Customer Login & Register) */}
          {isAuthOpen && (
            <AuthModal
              lang={lang}
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              onSuccess={(user) => {
                setCurrentUser(user);
                if (authAdminTarget && (user.role === 'ADMIN' || user.role === 'OWNER')) {
                  setViewMode('ADMIN');
                }
                showToast(
                  lang === 'ar'
                    ? `أهلاً بك يا ${user.name}!`
                    : `Welcome, ${user.name}!`
                );
              }}
              isAdminTarget={authAdminTarget}
            />
          )}

          {/* Customer Profile & Saved Addresses Modal */}
          {isProfileOpen && (
            <ProfileModal
              lang={lang}
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              currentUser={currentUser}
              onLogout={() => {
                setCurrentUser(null);
                setViewMode('STORE');
                setTrackedOrder(null);
                setCart([]);
                localStorage.removeItem('wave_cart_eg');
                localStorage.removeItem('wave_token');
                showToast(lang === 'ar' ? 'تم تسجيل الخروج بنجاح.' : 'Logged out successfully.');
              }}
              locations={deliveryLocations}
              onTrackOrder={(order) => {
                setTrackedOrder(order);
                setIsTrackingOpen(true);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
