import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Users,
  Settings,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Check,
  TrendingUp,
  Phone,
  MessageCircle,
  Globe,
  Eye,
  EyeOff,
  AlertCircle,
  Save,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  FileText,
  Ban,
  Search,
  Key,
  Lock,
  Sparkles,
  Calendar,
  DollarSign,
  Download,
  Printer,
  Archive,
  FolderPlus,
  Unlock,
  Tag,
  Megaphone,
} from 'lucide-react';
import { Language, translations } from '../lib/i18n.ts';
import {
  Order,
  DonutProduct,
  Category,
  DeliveryLocation,
  OrderStatus,
  StoreSettings,
  UserProfile,
  AdminPermissions,
  AuditLog,
  CustomerDetailProfile,
  Address,
  CustomizationGroup,
  CustomizationOption,
  CustomizationFieldType,
  ProductOption,
  CartItem,
  MonthlyAccountingSummary,
  MonthlyAccountingReport,
  MonthlyArchiveRecord,
} from '../types.ts';
import { api } from '../lib/api.ts';
import { CustomDonutBuilder } from './CustomDonutBuilder.tsx';
import { AdminOffersManager } from './AdminOffersManager.tsx';
import { AdminAdvertisementsManager } from './AdminAdvertisementsManager.tsx';

export function normalizeSearchText(val: string): string {
  if (!val) return '';
  return val
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .toLowerCase()
    .trim();
}

export function getNextMonthKey(currentKey: string): string {
  if (!currentKey || !/^\d{4}-\d{2}$/.test(currentKey)) {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  const [y, m] = currentKey.split('-').map(Number);
  const nextDate = new Date(y, m, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
}

interface AdminDashboardProps {
  lang: Language;
  onExitAdmin: () => void;
  products: DonutProduct[];
  categories: Category[];
  deliveryLocations: DeliveryLocation[];
  onReloadProducts: () => void;
  onReloadLocations: () => void;
  onUpdateSettings?: (updated: StoreSettings) => void;
  currentUser?: UserProfile | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  onExitAdmin,
  products,
  categories,
  deliveryLocations,
  onReloadProducts,
  onReloadLocations,
  onUpdateSettings,
  currentUser,
}) => {
  const t = translations[lang];
  const isOwner = currentUser?.role === 'OWNER';

  type TabType =
    | 'PRODUCTS'
    | 'OFFERS'
    | 'ADVERTISEMENTS'
    | 'ORDERS'
    | 'DELIVERY'
    | 'CUSTOMIZATION'
    | 'SETTINGS'
    | 'CUSTOMERS'
    | 'ADMINS'
    | 'AUDIT_LOGS'
    | 'STATS'
    | 'ACCOUNTING';

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      return (localStorage.getItem('wave_admin_tab') as TabType) || 'PRODUCTS';
    } catch {
      return 'PRODUCTS';
    }
  });

  useEffect(() => {
    localStorage.setItem('wave_admin_tab', activeTab);
  }, [activeTab]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [administrators, setAdministrators] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Internal Admin State for Products, Categories, Locations (Authoritative state from backend)
  const [adminProducts, setAdminProducts] = useState<DonutProduct[]>(products || []);
  const [adminCategories, setAdminCategories] = useState<Category[]>(categories || []);
  const [adminLocations, setAdminLocations] = useState<DeliveryLocation[]>(deliveryLocations || []);
  const fetchRequestIdRef = useRef(0);

  // Product type filter for PRODUCTS tab
  const [productTypeFilter, setProductTypeFilter] = useState<'ALL' | 'DONUT' | 'DRINK'>('ALL');

  // Customization Groups State
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<Partial<CustomizationGroup> | null>(null);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [groupOptions, setGroupOptions] = useState<CustomizationOption[]>([]);

  // Customer search & filter
  const [customerSearch, setCustomerSearch] = useState('');

  // Order search state
  const [orderSearch, setOrderSearch] = useState('');

  // Audit log search & role filter
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState<'ALL' | 'OWNER' | 'ADMIN'>('ALL');

  // Monthly Accounting state (Owner-Only)
  const [accountingMonths, setAccountingMonths] = useState<string[]>([]);
  const [activeAccountingMonthKey, setActiveAccountingMonthKey] = useState<string>('');
  const [accountingArchives, setAccountingArchives] = useState<MonthlyArchiveRecord[]>([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [accountingReport, setAccountingReport] = useState<MonthlyAccountingReport | null>(null);
  const [loadingAccounting, setLoadingAccounting] = useState<boolean>(false);
  const [showCloseMonthModal, setShowCloseMonthModal] = useState<boolean>(false);
  const [closeMonthNotes, setCloseMonthNotes] = useState<string>('');
  const [showNewPeriodModal, setShowNewPeriodModal] = useState<boolean>(false);
  const [newPeriodMonthInput, setNewPeriodMonthInput] = useState<string>('');
  const [newPeriodNotes, setNewPeriodNotes] = useState<string>('');
  const [closingOrStartingPeriod, setClosingOrStartingPeriod] = useState<boolean>(false);

  // Owner custom donut studio tester
  const [showOwnerCustomDonutTester, setShowOwnerCustomDonutTester] = useState<boolean>(false);
  const [testedCustomDonuts, setTestedCustomDonuts] = useState<CartItem[]>([]);

  // Product modal state
  const [editingProduct, setEditingProduct] = useState<Partial<DonutProduct> | null>(null);
  const [basePriceInput, setBasePriceInput] = useState<string>('');
  const [productOptions, setProductOptions] = useState<
    Array<{ id: string; nameAr: string; nameEn?: string; priceDelta: string }>
  >([]);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');

  // Delivery Location modal state
  const [editingLocation, setEditingLocation] = useState<Partial<DeliveryLocation> | null>(null);
  const [isNewLocation, setIsNewLocation] = useState(false);

  // Order Rejection or Failed Delivery Modal
  const [orderActionModal, setOrderActionModal] = useState<{
    orderId: string;
    type: 'CANCEL' | 'NOT_RECEIVED';
  } | null>(null);
  const [actionReason, setActionReason] = useState('لم يرد العميل على اتصالات المندوب المتكررة');

  // Customer Blocking Modal
  const [blockingCustomer, setBlockingCustomer] = useState<UserProfile | null>(null);
  const [blockType, setBlockType] = useState<'TEMPORARY' | 'PERMANENT'>('PERMANENT');
  const [blockDurationDays, setBlockDurationDays] = useState('30');
  const [blockReason, setBlockReason] = useState('تكرار عدم استلام الطلبات عند وصول المندوب');

  // Customer Profile & Deletion States
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<CustomerDetailProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<UserProfile | null>(null);

  // Customer Notes & Details Modal
  const [selectedCustomerForNotes, setSelectedCustomerForNotes] = useState<UserProfile | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Admin Management Modal (Owner Only)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
    canManageProducts: true,
    canManageOrders: true,
    canManageDelivery: false,
    canManageSettings: false,
    canManageCustomers: false,
    canManageOffers: true,
    canManageAdvertisements: false,
  });

  // Owner Profile Edit State
  const [ownerProfileName, setOwnerProfileName] = useState(currentUser?.name || '');
  const [ownerProfileEmail, setOwnerProfileEmail] = useState(currentUser?.email || '');
  const [ownerProfilePhone, setOwnerProfilePhone] = useState(currentUser?.phone || '');
  const [ownerProfilePassword, setOwnerProfilePassword] = useState('');
  const [savingOwnerProfile, setSavingOwnerProfile] = useState(false);

  // Success and Error message toasts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  // Dedicated In-App Confirmation Modal (Bypasses iframe blocked window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen?: boolean;
    title: string;
    itemName?: string;
    warningText?: string;
    message?: string;
    confirmButtonText?: string;
    isDangerous?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [confirmModalLoading, setConfirmModalLoading] = useState(false);

  const handleUpdateOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingOwnerProfile(true);
      const res = await api.updateOwnerProfile({
        name: ownerProfileName,
        email: ownerProfileEmail,
        phone: ownerProfilePhone,
        password: ownerProfilePassword || undefined,
      });
      if (res.token) {
        localStorage.setItem('wave_token', res.token);
      }
      showSuccess(lang === 'ar' ? 'تم تحديث بيانات مالك المتجر بنجاح' : 'Owner profile updated');
      setOwnerProfilePassword('');
    } catch (err: any) {
      showError(err.message || 'فشل تحديث البيانات');
    } finally {
      setSavingOwnerProfile(false);
    }
  };

  const loadAccountingData = async (targetMonth?: string) => {
    if (!isOwner) return;
    try {
      setLoadingAccounting(true);
      const monthsRes = await api.getAccountingMonths();
      const avail = monthsRes.availableMonths || [];
      const active = monthsRes.activeMonth || '';
      setAccountingMonths(avail);
      setActiveAccountingMonthKey(active);
      setAccountingArchives(monthsRes.archives || []);

      const monthToFetch = targetMonth || selectedMonthKey || active || avail[0] || new Date().toISOString().slice(0, 7);
      setSelectedMonthKey(monthToFetch);

      const reportRes = await api.getAccountingReport(monthToFetch);
      setAccountingReport(reportRes.report);
    } catch (err: any) {
      console.error('Failed to load accounting data:', err);
      showError(err.message || 'فشل تحميل بيانات المحاسبة الشهرية');
    } finally {
      setLoadingAccounting(false);
    }
  };

  const handleSelectAccountingMonth = async (monthKey: string) => {
    setSelectedMonthKey(monthKey);
    try {
      setLoadingAccounting(true);
      const reportRes = await api.getAccountingReport(monthKey);
      setAccountingReport(reportRes.report);
    } catch (err: any) {
      showError(err.message || 'فشل تحميل تقرير الشهر المحدد');
    } finally {
      setLoadingAccounting(false);
    }
  };

  const handleCloseMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonthKey) return;
    try {
      setClosingOrStartingPeriod(true);
      await api.closeAccountingMonth(selectedMonthKey, { notes: closeMonthNotes });
      showSuccess(lang === 'ar' ? `تم إغلاق وأرشفة شهر ${selectedMonthKey} بنجاح` : `Month ${selectedMonthKey} closed and archived`);
      setShowCloseMonthModal(false);
      setCloseMonthNotes('');
      await loadAccountingData(selectedMonthKey);
      await fetchData();
    } catch (err: any) {
      showError(err.message || 'فشل إغلاق الشهر المحاسبي');
    } finally {
      setClosingOrStartingPeriod(false);
    }
  };

  const handleStartNewPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodMonthInput.trim()) return;
    try {
      setClosingOrStartingPeriod(true);
      await api.startNewAccountingPeriod({ monthKey: newPeriodMonthInput.trim(), notes: newPeriodNotes });
      showSuccess(lang === 'ar' ? `تم بدء الفترة المحاسبية الجديدة ${newPeriodMonthInput} بنجاح` : `New accounting period ${newPeriodMonthInput} started`);
      setShowNewPeriodModal(false);
      const newMonth = newPeriodMonthInput.trim();
      setNewPeriodMonthInput('');
      setNewPeriodNotes('');
      await loadAccountingData(newMonth);
      await fetchData();
    } catch (err: any) {
      showError(err.message || 'فشل بدء الفترة المحاسبية');
    } finally {
      setClosingOrStartingPeriod(false);
    }
  };

  const handleReopenMonth = (monthKey: string) => {
    setConfirmModal({
      isOpen: true,
      title: lang === 'ar' ? 'إعادة فتح الشهر المحاسبي' : 'Reopen Accounting Month',
      itemName: monthKey,
      warningText: lang === 'ar'
        ? `هل أنت متأكد من إعادة فتح الفترة المحاسبية لشهر ${monthKey}؟ سيتمكن النظام من تعديل وإضافة السجلات لهذا الشهر.`
        : `Reopen accounting period for ${monthKey}?`,
      confirmButtonText: lang === 'ar' ? 'نعم، أعد فتح الشهر' : 'Yes, Reopen',
      onConfirm: async () => {
        try {
          await api.reopenAccountingMonth(monthKey);
          showSuccess(lang === 'ar' ? `تمت إعادة فتح شهر ${monthKey} بنجاح` : `Month ${monthKey} reopened`);
          await loadAccountingData(monthKey);
          await fetchData();
        } catch (err: any) {
          showError(err.message || 'فشل إعادة فتح الشهر');
        }
      },
    });
  };

  const handleExportCSV = () => {
    if (!accountingReport) return;
    const summary = accountingReport.summary;
    const rows: string[][] = [
      ['Wave Donuts Egypt - تقرير المحاسبة والمبيعات الشهري المعتمد'],
      ['الفترة المحاسبية', summary.monthKey, summary.monthNameAr],
      ['حالة الإغلاق', accountingReport.isClosed ? 'مغلق ومؤرشف' : 'فترة نشطة'],
      [],
      ['المؤشر المالي', 'القيمة'],
      ['إجمالي عدد الطلبات', String(summary.totalOrders)],
      ['الطلبات المسلمة والناجحة', String(summary.deliveredOrders)],
      ['الطلبات الملغاة أو المرفوضة', String(summary.cancelledOrders)],
      ['الطلبات قيد التوصيل والتحصيل', String(summary.unpaidOrders)],
      ['إجمالي المبيعات المحصلة نقداً (ج.م.)', summary.collectedAmount.toFixed(2)],
      ['إجمالي المبيعات المسجلة (ج.م.)', summary.grossSales.toFixed(2)],
      ['مبيعات قيد التوصيل والتحصيل (ج.م.)', summary.unpaidAmount.toFixed(2)],
      ['قيمة الطلبات الملغاة (ج.م.)', summary.cancelledAmount.toFixed(2)],
      ['رسوم التوصيل المحصلة (ج.م.)', summary.deliveryFeesCollected.toFixed(2)],
      ['صافي مبيعات المنتجات (ج.م.)', summary.productsSalesTotal.toFixed(2)],
      ['متوسط قيمة الطلب (ج.م.)', summary.averageOrderValue.toFixed(2)],
      [],
      ['سجل تفاصيل طلبات الشهر:'],
      [
        'رقم الطلب',
        'تاريخ ووقت الطلب',
        'اسم العميل',
        'رقم الهاتف',
        'المحافظة',
        'المدينة',
        'المنطقة',
        'العنوان بالتفصيل',
        'قيمة المنتجات (ج.م.)',
        'رسوم التوصيل (ج.م.)',
        'إجمالي الطلب (ج.م.)',
        'طريقة الدفع',
        'حالة الطلب',
        'سبب الإلغاء (إن وجد)',
        'تفاصيل المنتجات المختارة',
      ],
    ];

    accountingReport.orders.forEach((o) => {
      const itemsSummary = o.items
        .map((it) => `${it.product?.nameAr || it.productNameAr} x${it.quantity} (${(it.unitPrice * it.quantity).toFixed(2)} ج.م.)`)
        .join(' + ');
      const addr = o.addressDetails;
      const fullAddr = `${addr.governorate} - ${addr.city} - ${addr.area} - ش ${addr.street} - عمارة ${addr.buildingNumber}`;
      rows.push([
        String(o.orderNumber),
        new Date(o.createdAt).toLocaleString('ar-EG'),
        o.customerName,
        o.customerPhone,
        addr.governorate,
        addr.city,
        addr.area,
        fullAddr,
        String(o.subtotal.toFixed(2)),
        String(o.deliveryFee.toFixed(2)),
        String(o.total.toFixed(2)),
        'الدفع عند الاستلام (COD)',
        t.status[o.status] || o.status,
        o.cancellationReason || '',
        itemsSummary,
      ]);
    });

    const csvContent =
      '\uFEFF' +
      rows
        .map((r) =>
          r
            .map((cell) => {
              const str = (cell ?? '').toString().replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(',')
        )
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wave_donuts_accounting_${summary.monthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess(lang === 'ar' ? 'تم تصدير ملف الإكسل بنجاح' : 'CSV exported successfully');
  };

  const handlePrintReport = () => {
    window.print();
  };

  useEffect(() => {
    fetchData();
    loadStoreSettings();
  }, []);

  const fetchData = async (showToast = false) => {
    if (isRefreshing) return;
    const currentReqId = ++fetchRequestIdRef.current;
    try {
      setIsRefreshing(true);
      setRefreshError(null);

      const [
        ordersRes,
        statsRes,
        custRes,
        groupsRes,
        prodRes,
        catRes,
        locRes,
        settingsRes,
      ] = await Promise.all([
        api.getAdminOrders().catch(() => null),
        api.getAdminStats().catch(() => null),
        api.getAdminCustomers().catch(() => null),
        api.getAdminCustomizationGroups().catch(() => null),
        api.getAdminProducts().catch(() => null),
        api.getAdminCategories().catch(() => null),
        api.getAdminDeliveryLocations().catch(() => null),
        api.getSettings().catch(() => null),
      ]);

      // Protect against out-of-order race conditions: ignore if superseded by newer request
      if (currentReqId !== fetchRequestIdRef.current) {
        return;
      }

      if (ordersRes && Array.isArray(ordersRes.orders)) setOrders(ordersRes.orders);
      if (statsRes) setStats(statsRes);
      if (custRes && Array.isArray(custRes.customers)) setCustomers(custRes.customers);
      if (groupsRes && Array.isArray(groupsRes.groups)) setCustomizationGroups(groupsRes.groups);
      if (prodRes && Array.isArray(prodRes.products)) setAdminProducts(prodRes.products);
      if (catRes && Array.isArray(catRes.categories)) setAdminCategories(catRes.categories);
      if (locRes && Array.isArray(locRes.locations)) setAdminLocations(locRes.locations);
      if (settingsRes && settingsRes.settings && typeof settingsRes.settings === 'object') setSettings(settingsRes.settings);

      if (isOwner) {
        const adminsRes = await api.getAdministrators().catch(() => null);
        if (currentReqId === fetchRequestIdRef.current && adminsRes && Array.isArray(adminsRes.admins)) {
          setAdministrators(adminsRes.admins);
        }
      }

      const logsRes = await api.getAuditLogs().catch(() => null);
      if (currentReqId === fetchRequestIdRef.current && logsRes && Array.isArray(logsRes.logs)) {
        setAuditLogs(logsRes.logs);
      }

      if (showToast) {
        showSuccess(lang === 'ar' ? 'تم تحديث ومزامنة جميع البيانات بنجاح من قاعدة البيانات!' : 'All data refreshed successfully!');
      }
    } catch (err: any) {
      console.error('FetchData error:', err);
      setRefreshError(err.message || 'فشل تحديث البيانات من الخادم');
      if (showToast) {
        alert(err.message || 'فشل تحديث ومزامنة البيانات من الخادم');
      }
    } finally {
      if (currentReqId === fetchRequestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  const handleOpenAddGroup = () => {
    setIsNewGroup(true);
    setEditingGroup({
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      type: 'SINGLE_SELECT',
      isRequired: false,
      minSelections: 1,
      maxSelections: 1,
      displayOrder: customizationGroups.length + 1,
      isActive: true,
      assignedToAll: true,
      assignedProductIds: [],
      assignedCategoryIds: [],
    });
    setGroupOptions([
      { id: `opt_${Date.now()}_1`, nameAr: '', nameEn: '', priceDelta: 0, isAvailable: true },
    ]);
  };

  const handleOpenEditGroup = (grp: CustomizationGroup) => {
    setIsNewGroup(false);
    setEditingGroup(grp);
    setGroupOptions(grp.options || []);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editingGroup.nameAr) return;

    try {
      setLoading(true);
      const sanitizedOptions = groupOptions
        .filter((o) => o.nameAr && o.nameAr.trim().length > 0)
        .map((o) => ({
          ...o,
          priceDelta: typeof o.priceDelta === 'number' ? o.priceDelta : parseFloat(String(o.priceDelta || '0')) || 0,
        }));

      const payload = {
        ...editingGroup,
        options: sanitizedOptions,
      };

      if (isNewGroup) {
        await api.createCustomizationGroup(payload);
        showSuccess(lang === 'ar' ? 'تم إنشاء مجموعة التخصيص بنجاح!' : 'Customization group created!');
      } else {
        await api.updateCustomizationGroup(editingGroup.id!, payload);
        showSuccess(lang === 'ar' ? 'تم تحديث مجموعة التخصيص بنجاح!' : 'Customization group updated!');
      }
      setEditingGroup(null);
      await fetchData();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ مجموعة التخصيص');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: lang === 'ar' ? 'تأكيد حذف مجموعة التخصيص' : 'Delete Customization Group',
      itemName: name,
      warningText:
        lang === 'ar'
          ? `هل أنت متأكد من حذف مجموعة التخصيص (${name}) نهائياً من قاعدة البيانات وفك ارتباطها بكافة المنتجات؟`
          : `Delete group ${name}?`,
      isDangerous: true,
      confirmButtonText: lang === 'ar' ? 'نعم، احذف المجموعة' : 'Yes, Delete Group',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.deleteCustomizationGroup(id);
          setCustomizationGroups((prev) => prev.filter((g) => g.id !== id));
          showSuccess(lang === 'ar' ? 'تم حذف مجموعة التخصيص بنجاح' : 'Customization group deleted');
          await fetchData();
          onReloadProducts();
        } catch (err: any) {
          showError(err.message || 'فشل حذف مجموعة التخصيص');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const loadStoreSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) setSettings(res.settings);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    reason?: string
  ) => {
    try {
      setLoading(true);
      await api.updateOrderStatus(orderId, status, reason);
      await fetchData();
      setOrderActionModal(null);
      showSuccess(lang === 'ar' ? 'تم تحديث حالة الطلب بنجاح' : 'Order status updated');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ في تحديث الطلب');
    } finally {
      setLoading(false);
    }
  };

  // Image Upload Handler from Device
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImage(true);
      const filesArray = Array.from(files);
      const res = await api.uploadMultipleImages(filesArray);
      if (res.imageUrls && res.imageUrls.length > 0) {
        setProductImages((prev) => {
          const updated = [...prev, ...res.imageUrls];
          if (!mainImage) setMainImage(res.imageUrls[0]);
          return updated;
        });
        showSuccess(lang === 'ar' ? 'تم رفع الصور بنجاح من جهازك!' : 'Photos uploaded successfully!');
      }
    } catch (err: any) {
      alert(err.message || 'فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddProductOption = () => {
    setProductOptions((prev) => [
      ...prev,
      {
        id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nameAr: '',
        nameEn: '',
        priceDelta: '',
      },
    ]);
  };

  const handleProductOptionChange = (idx: number, field: 'nameAr' | 'nameEn' | 'priceDelta', value: string) => {
    setProductOptions((prev) => {
      const updated = [...prev];
      if (field === 'priceDelta') {
        const cleaned = value.replace(/[^0-9.]/g, '');
        updated[idx] = { ...updated[idx], priceDelta: cleaned };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  const handleRemoveProductOption = (idx: number) => {
    setProductOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveImage = (imgUrl: string) => {
    setConfirmModal({
      isOpen: true,
      title: lang === 'ar' ? 'تأكيد حذف صورة المنتج' : 'Confirm Delete Image',
      warningText: lang === 'ar' ? 'هل أنت متأكد من حذف هذه الصورة المرفوعة نهائياً؟' : 'Delete this image permanently?',
      isDangerous: true,
      confirmButtonText: lang === 'ar' ? 'نعم، احذف الصورة' : 'Yes, Delete Image',
      onConfirm: async () => {
        try {
          if (imgUrl.startsWith('/uploads/')) {
            await api.deleteImage(imgUrl).catch(() => {});
          }
          setProductImages((prev) => {
            const updated = prev.filter((u) => u !== imgUrl);
            if (mainImage === imgUrl) {
              setMainImage(updated[0] || '');
            }
            return updated;
          });
          showSuccess(lang === 'ar' ? 'تم حذف الصورة بنجاح' : 'Image deleted');
        } catch (err: any) {
          showError(err.message || 'فشل حذف الصورة');
        }
      },
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!basePriceInput.trim() || isNaN(Number(basePriceInput)) || Number(basePriceInput) < 0) {
      showError(lang === 'ar' ? 'يرجى إدخال السعر الأساسي للدونت بالجنيه المصري (مثال: 50).' : 'Please enter a valid base price in EGP.');
      return;
    }

    try {
      setLoading(true);
      const parsedOptions: ProductOption[] = productOptions
        .filter((o) => o.nameAr.trim().length > 0)
        .map((o) => ({
          id: o.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          nameAr: o.nameAr.trim(),
          nameEn: (o.nameEn && o.nameEn.trim()) || o.nameAr.trim(),
          priceDelta: o.priceDelta !== '' && !isNaN(Number(o.priceDelta)) ? Math.max(0, Number(o.priceDelta)) : 0,
        }));

      const payload = {
        ...editingProduct,
        basePrice: Number(basePriceInput),
        options: parsedOptions,
        images: productImages,
        mainImage: mainImage || productImages[0] || '',
      };

      if (isNewProduct) {
        await api.createProduct(payload);
        showSuccess(lang === 'ar' ? 'تمت إضافة المنتج بنجاح!' : 'Product added successfully!');
      } else {
        await api.updateProduct(editingProduct.id!, payload);
        showSuccess(lang === 'ar' ? 'تم حفظ تعديلات المنتج بنجاح!' : 'Product updated successfully!');
      }
      setEditingProduct(null);
      await fetchData();
      onReloadProducts();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ المنتج');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    const targetProd = adminProducts.find((p) => p.id === id);
    const prodName = targetProd?.nameAr || (lang === 'ar' ? 'المنتج' : 'product');

    setConfirmModal({
      isOpen: true,
      title: lang === 'ar' ? 'تأكيد حذف المنتج نهائياً' : 'Confirm Delete Product',
      itemName: prodName,
      warningText:
        lang === 'ar'
          ? `هل أنت متأكد من حذف المنتج (${prodName}) نهائياً من قاعدة البيانات والمتجر؟\nسيتم الاحتفاظ بكافة سجلات الطلبات التاريخية وسجلات المبيعات بأمان تام.`
          : `Are you sure you want to delete (${prodName}) permanently? Order records will remain intact.`,
      isDangerous: true,
      confirmButtonText: lang === 'ar' ? 'نعم، احذف المنتج نهائياً' : 'Yes, Delete Permanently',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.deleteProduct(id);
          setAdminProducts((prev) => prev.filter((p) => p.id !== id));
          onReloadProducts();
          showSuccess(lang === 'ar' ? `تم حذف المنتج (${prodName}) بنجاح` : `Product (${prodName}) deleted successfully`);
          await fetchData();
        } catch (err: any) {
          console.error('Delete product error:', err);
          showError(err.message || 'فشل حذف المنتج من قاعدة البيانات');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameAr.trim()) return;
    try {
      setLoading(true);
      await api.createCategory({ nameAr: newCatNameAr.trim(), nameEn: (newCatNameEn || newCatNameAr).trim() });
      setNewCatNameAr('');
      setNewCatNameEn('');
      setShowCategoryModal(false);
      showSuccess(lang === 'ar' ? 'تمت إضافة التصنيف بنجاح' : 'Category added successfully');
      await fetchData();
      onReloadProducts();
    } catch (err: any) {
      showError(err.message || 'فشل إنشاء التصنيف');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (id: string) => {
    const targetCat = adminCategories.find((c) => c.id === id);
    const catName = targetCat?.nameAr || (lang === 'ar' ? 'التصنيف' : 'category');

    setConfirmModal({
      isOpen: true,
      title: lang === 'ar' ? 'تأكيد حذف التصنيف' : 'Confirm Delete Category',
      itemName: catName,
      warningText:
        lang === 'ar'
          ? `هل أنت متأكد من حذف التصنيف (${catName})؟\nسيتم فك ارتباطه بالمنتجات التابعة له بأمان دون حذف أي منتجات.`
          : `Are you sure you want to delete category (${catName})?`,
      isDangerous: true,
      confirmButtonText: lang === 'ar' ? 'نعم، احذف التصنيف' : 'Yes, Delete Category',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.deleteCategory(id);
          setAdminCategories((prev) => prev.filter((c) => c.id !== id));
          onReloadProducts();
          showSuccess(lang === 'ar' ? `تم حذف التصنيف (${catName}) بنجاح` : `Category (${catName}) deleted successfully`);
          await fetchData();
        } catch (err: any) {
          console.error('Delete category error:', err);
          showError(err.message || 'فشل حذف التصنيف من قاعدة البيانات');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    try {
      const gov = (editingLocation.governorate || '').trim();
      const city = (editingLocation.city || '').trim();
      const area = (editingLocation.area || '').trim();

      if (!gov) {
        showError(lang === 'ar' ? 'يرجى إدخال اسم المحافظة.' : 'Please enter governorate.');
        return;
      }
      if (!city) {
        showError(lang === 'ar' ? 'يرجى إدخال اسم المدينة / المركز.' : 'Please enter city.');
        return;
      }
      if (!area) {
        showError(lang === 'ar' ? 'يرجى إدخال اسم المنطقة أو الحي المحدد.' : 'Please enter delivery area.');
        return;
      }

      const feeStr = String(editingLocation.deliveryFee ?? '').trim();
      if (feeStr === '') {
        showError(lang === 'ar' ? 'يرجى إدخال رسوم التوصيل لهذه المنطقة بالجنيه المصري (ج.م.).' : 'Please enter delivery fee in EGP.');
        return;
      }

      const deliveryFee = parseFloat(feeStr);
      if (isNaN(deliveryFee) || deliveryFee < 0) {
        showError(lang === 'ar' ? 'رسوم التوصيل يجب أن تكون قيمة رقمية موجبة أو صفر.' : 'Delivery fee must be a valid non-negative number.');
        return;
      }

      const minOrder = editingLocation.minOrder !== undefined && editingLocation.minOrder !== null && String(editingLocation.minOrder).trim() !== ''
        ? parseFloat(String(editingLocation.minOrder)) || 0
        : 0;
      const estimatedMin = editingLocation.estimatedMin !== undefined && editingLocation.estimatedMin !== null && String(editingLocation.estimatedMin).trim() !== ''
        ? parseInt(String(editingLocation.estimatedMin), 10) || 45
        : 45;

      setLoading(true);
      const payload = {
        ...editingLocation,
        governorate: gov,
        city,
        area,
        deliveryFee,
        minOrder,
        estimatedMin,
      };

      if (isNewLocation) {
        await api.createDeliveryLocation(payload);
        showSuccess(lang === 'ar' ? `تمت إضافة منطقة (${area}) ورسوم توصيلها (${deliveryFee} ج.م.) بنجاح!` : 'Delivery area and fee added successfully!');
      } else {
        await api.updateDeliveryLocation(payload.id!, payload);
        showSuccess(lang === 'ar' ? `تم تحديث رسوم وبيانات منطقة (${area}) إلى (${deliveryFee} ج.م.) بنجاح!` : 'Delivery area and fee updated successfully!');
      }
      setEditingLocation(null);
      await fetchData();
      onReloadLocations();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ منطقة التوصيل');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = (id: string) => {
    const targetLoc = adminLocations.find((l) => l.id === id);
    const locName = targetLoc ? `${targetLoc.governorate} - ${targetLoc.area}` : (lang === 'ar' ? 'المنطقة' : 'location');

    setConfirmModal({
      isOpen: true,
      title: lang === 'ar' ? 'تأكيد حذف منطقة التوصيل' : 'Confirm Delete Location',
      itemName: locName,
      warningText:
        lang === 'ar'
          ? `هل أنت متأكد من حذف منطقة التوصيل (${locName}) نهائياً؟\nلن يتمكن العملاء الجدد من اختيار هذه المنطقة.`
          : `Delete delivery location (${locName})?`,
      isDangerous: true,
      confirmButtonText: lang === 'ar' ? 'نعم، احذف المنطقة' : 'Yes, Delete Location',
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.deleteDeliveryLocation(id);
          setAdminLocations((prev) => prev.filter((l) => l.id !== id));
          onReloadLocations();
          showSuccess(lang === 'ar' ? `تم حذف منطقة التوصيل (${locName}) بنجاح` : `Delivery location (${locName}) deleted successfully`);
          await fetchData();
        } catch (err: any) {
          console.error('Delete location error:', err);
          showError(err.message || 'فشل حذف منطقة التوصيل من قاعدة البيانات');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleClearAnnouncement = async () => {
    if (!settings) return;
    setConfirmModal({
      title: lang === 'ar' ? 'مسح شريط الإعلان' : 'Clear Announcement',
      message: lang === 'ar'
        ? 'هل أنت متأكد من مسح وحذف شريط الإعلان الحالي وإخفائه من أعلى الموقع؟'
        : 'Are you sure you want to clear and delete the announcement banner?',
      onConfirm: async () => {
        try {
          setLoading(true);
          const updated = {
            ...settings,
            announcementAr: '',
            announcementEn: '',
            showAnnouncement: false,
          };
          await api.updateSettings(updated);
          setSettings(updated);
          if (onUpdateSettings) onUpdateSettings(updated);
          onReloadProducts();
          showSuccess(lang === 'ar' ? 'تم مسح الإعلان بنجاح' : 'Announcement cleared');
        } catch (err: any) {
          showError(err.message || 'فشل مسح الإعلان');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setLoading(true);
      const res = await api.updateSettings(settings);
      const updated = res.settings || settings;
      setSettings(updated);
      if (onUpdateSettings) onUpdateSettings(updated);
      onReloadProducts();
      showSuccess(lang === 'ar' ? 'تم حفظ إعدادات المتجر وبيانات التواصل بنجاح!' : 'Settings saved successfully!');
    } catch (err: any) {
      showError(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  // Block customer action
  const handleBlockCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockingCustomer) return;
    try {
      setLoading(true);
      await api.blockCustomer(blockingCustomer.id, {
        type: blockType,
        reason: blockReason,
        durationDays: blockType === 'TEMPORARY' ? parseInt(blockDurationDays, 10) : undefined,
      });
      await fetchData();
      setBlockingCustomer(null);
      showSuccess(lang === 'ar' ? 'تم حظر العميل ورقم هاتفه بنجاح ومنعه من الطلب.' : 'Customer & phone blocked successfully.');
    } catch (err: any) {
      alert(err.message || 'فشل حظر العميل');
    } finally {
      setLoading(false);
    }
  };

  // Unblock customer
  const handleUnblockCustomer = async (cust: UserProfile) => {
    setConfirmModal({
      title: lang === 'ar' ? 'فك حظر العميل' : 'Unblock Customer',
      message: lang === 'ar'
        ? `هل أنت متأكد من فك الحظر عن العميل (${cust.name}) ورقم هاتفه؟`
        : `Unblock customer ${cust.name}?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.unblockCustomer(cust.id);
          await fetchData();
          showSuccess(lang === 'ar' ? 'تم فك الحظر بنجاح ويمكن للعميل الآن الطلب مجدداً.' : 'Customer unblocked successfully.');
        } catch (err: any) {
          showError(err.message || 'فشل فك الحظر');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Add customer note
  const handleAddCustomerNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForNotes || !newNoteText.trim()) return;
    try {
      setLoading(true);
      await api.addCustomerNote(selectedCustomerForNotes.id, newNoteText.trim());
      setNewNoteText('');
      await fetchData();
      // Update selected customer view
      const updatedCust = customers.find((c) => c.id === selectedCustomerForNotes.id);
      if (updatedCust) setSelectedCustomerForNotes(updatedCust);
      showSuccess(lang === 'ar' ? 'تمت إضافة الملاحظة الإدارية بنجاح' : 'Admin note added');
    } catch (err: any) {
      showError(err.message || 'فشل إضافة الملاحظة');
    } finally {
      setLoading(false);
    }
  };

  // Open individual customer profile drawer/modal
  const handleOpenCustomerProfile = async (cust: UserProfile) => {
    try {
      setLoadingProfile(true);
      const res = await api.getCustomerDetails(cust.id);
      if (res.customer) {
        setSelectedCustomerProfile(res.customer);
      }
    } catch (err: any) {
      showError(err.message || 'فشل تحميل الملف الشخصي للعميل');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Toggle customer activation status (Active / Deactivated)
  const handleToggleCustomerActive = async (cust: UserProfile) => {
    const nextState = cust.isActive === false ? true : false;
    const confirmTitle = nextState ? (lang === 'ar' ? 'تفعيل حساب العميل' : 'Activate Customer') : (lang === 'ar' ? 'تعطيل حساب العميل' : 'Deactivate Customer');
    const confirmMsg = nextState
      ? (lang === 'ar' ? `هل تريد تفعيل حساب العميل (${cust.name}) مجدداً؟` : `Activate account for ${cust.name}?`)
      : (lang === 'ar' ? `هل تريد تعطيل حساب العميل (${cust.name})؟ لن يتمكن من تسجيل الدخول أو إتمام طلبات جديدة.` : `Deactivate account for ${cust.name}?`);

    setConfirmModal({
      title: confirmTitle,
      message: confirmMsg,
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.updateCustomerActiveStatus(cust.id, nextState);
          await fetchData();
          if (selectedCustomerProfile && selectedCustomerProfile.id === cust.id) {
            setSelectedCustomerProfile((prev: any) => prev ? { ...prev, isActive: nextState } : null);
          }
          showSuccess(nextState ? 'تم تفعيل حساب العميل بنجاح!' : 'تم تعطيل حساب العميل بنجاح.');
        } catch (err: any) {
          showError(err.message || 'فشل تحديث حالة العميل');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Open safe customer deletion confirmation dialog
  const handleDeleteCustomerClick = (cust: UserProfile) => {
    setCustomerToDelete(cust);
  };

  // Confirm safe customer deletion
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      setLoading(true);
      await api.deleteCustomerSafely(customerToDelete.id);
      await fetchData();
      if (selectedCustomerProfile && selectedCustomerProfile.id === customerToDelete.id) {
        setSelectedCustomerProfile(null);
      }
      setCustomerToDelete(null);
      showSuccess(lang === 'ar' ? 'تم حذف حساب العميل بنجاح مع الاحتفاظ بكافة سجلات الطلبات والمبيعات التاريخية بدقة.' : 'Customer account deleted safely, order history preserved.');
    } catch (err: any) {
      alert(err.message || 'فشل حذف حساب العميل');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomerNoteFromProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerProfile || !newNoteText.trim()) return;
    try {
      setLoading(true);
      const res = await api.addCustomerNote(selectedCustomerProfile.id, newNoteText.trim());
      setNewNoteText('');
      if (res.note) {
        setSelectedCustomerProfile((prev) =>
          prev ? { ...prev, notes: [res.note, ...(prev.notes || [])] } : null
        );
      }
      await fetchData();
      showSuccess(lang === 'ar' ? 'تمت إضافة الملاحظة الإدارية بنجاح' : 'Admin note added');
    } catch (err: any) {
      alert(err.message || 'فشل إضافة الملاحظة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomerNoteFromProfile = async (noteId: string) => {
    if (!selectedCustomerProfile) return;
    setConfirmModal({
      title: lang === 'ar' ? 'حذف الملاحظة الإدارية' : 'Delete Note',
      message: lang === 'ar' ? 'هل أنت متأكد من حذف هذه الملاحظة الإدارية؟' : 'Delete this administrative note?',
      onConfirm: async () => {
        try {
          await api.deleteCustomerNote(selectedCustomerProfile.id, noteId);
          setSelectedCustomerProfile((prev) =>
            prev ? { ...prev, notes: (prev.notes || []).filter((n) => n.id !== noteId) } : null
          );
          showSuccess(lang === 'ar' ? 'تم حذف الملاحظة الإدارية بنجاح' : 'Admin note deleted');
          await fetchData();
        } catch (err: any) {
          showError(err.message || 'فشل حذف الملاحظة');
        }
      },
    });
  };

  // Admin Management Actions (Owner Only)
  const handleOpenAddAdmin = () => {
    setEditingAdmin(null);
    setAdminName('');
    setAdminEmail('');
    setAdminPhone('');
    setAdminPassword('');
    setAdminPermissions({
      canManageProducts: true,
      canManageOrders: true,
      canManageDelivery: false,
      canManageSettings: false,
      canManageCustomers: false,
      canManageOffers: true,
      canManageAdvertisements: false,
    });
    setShowAdminModal(true);
  };

  const handleOpenEditAdmin = (admin: UserProfile) => {
    setEditingAdmin(admin);
    setAdminName(admin.name);
    setAdminEmail(admin.email);
    setAdminPhone(admin.phone);
    setAdminPassword('');
    setAdminPermissions(
      admin.permissions || {
        canManageProducts: false,
        canManageOrders: false,
        canManageDelivery: false,
        canManageSettings: false,
        canManageCustomers: false,
        canManageOffers: false,
        canManageAdvertisements: false,
      }
    );
    setShowAdminModal(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingAdmin) {
        await api.updateAdminUser(editingAdmin.id, {
          name: adminName,
          phone: adminPhone,
          permissions: adminPermissions,
          password: adminPassword || undefined,
        });
        showSuccess(lang === 'ar' ? 'تم تحديث بيانات وصلاحيات المشرف بنجاح!' : 'Admin updated successfully!');
      } else {
        await api.createAdminUser({
          name: adminName,
          email: adminEmail,
          phone: adminPhone,
          password: adminPassword,
          permissions: adminPermissions,
        });
        showSuccess(lang === 'ar' ? 'تم إنشاء حساب المشرف وتعيين صلاحياته بنجاح!' : 'Admin created successfully!');
      }
      setShowAdminModal(false);
      await fetchData();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ المشرف');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminStatus = async (admin: UserProfile) => {
    if (admin.role === 'OWNER') return;
    try {
      setLoading(true);
      await api.updateAdminUser(admin.id, { isActive: !admin.isActive });
      await fetchData();
      showSuccess(lang === 'ar' ? 'تم تغيير حالة المشرف بنجاح' : 'Admin status toggled');
    } catch (err: any) {
      showError(err.message || 'فشل تحديث المشرف');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (admin: UserProfile) => {
    if (admin.role === 'OWNER') {
      showError(lang === 'ar' ? 'لا يمكن حذف حساب مالك المتجر الرئيسي نهائياً.' : 'The Owner account cannot be deleted.');
      return;
    }
    setConfirmModal({
      title: lang === 'ar' ? 'حذف حساب المشرف' : 'Delete Admin',
      message: lang === 'ar'
        ? `هل أنت متأكد من حذف المشرف (${admin.name}) نهائياً؟\nسيتم إلغاء كافة صلاحيات وصوله للمتجر.`
        : `Delete admin ${admin.name}?`,
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.deleteAdminUser(admin.id);
          setAdministrators((prev) => prev.filter((a) => a.id !== admin.id));
          showSuccess(lang === 'ar' ? `تم حذف حساب المشرف (${admin.name}) بنجاح` : `Admin ${admin.name} deleted successfully`);
          await fetchData();
        } catch (err: any) {
          showError(err.message || 'فشل حذف المشرف');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== 'ALL' && o.status !== filterStatus) return false;
    if (!orderSearch.trim()) return true;
    const q = normalizeSearchText(orderSearch);
    const cleanNum = q.replace(/[^0-9]/g, '');
    const numMatch =
      cleanNum.length > 0 &&
      (normalizeSearchText(String(o.orderNumber)).includes(cleanNum) ||
        normalizeSearchText(o.customerPhone || '').replace(/[^0-9]/g, '').includes(cleanNum));
    const nameMatch = normalizeSearchText(o.customerName || '').includes(q);
    const areaMatch =
      normalizeSearchText(o.addressDetails?.area || '').includes(q) ||
      normalizeSearchText(o.addressDetails?.city || '').includes(q) ||
      normalizeSearchText(o.addressDetails?.governorate || '').includes(q);
    return numMatch || nameMatch || areaMatch;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditRoleFilter !== 'ALL' && log.performedByRole !== auditRoleFilter) return false;
    if (!auditLogSearch.trim()) return true;
    const q = normalizeSearchText(auditLogSearch);
    return (
      normalizeSearchText(log.performedByName).includes(q) ||
      normalizeSearchText(log.action).includes(q) ||
      normalizeSearchText(log.details || '').includes(q)
    );
  });

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = normalizeSearchText(customerSearch);
    const cleanQ = q.replace(/[^0-9]/g, '');
    const nameNorm = normalizeSearchText(c.name);
    const emailNorm = normalizeSearchText(c.email);
    const phoneNorm = normalizeSearchText(c.phone).replace(/[^0-9]/g, '');

    return (
      nameNorm.includes(q) ||
      emailNorm.includes(q) ||
      (cleanQ.length > 0 && phoneNorm.includes(cleanQ))
    );
  });

  const displayedProducts = adminProducts.filter((p) => {
    if (productTypeFilter === 'ALL') return true;
    if (productTypeFilter === 'DRINK') return p.productType === 'DRINK';
    return p.productType !== 'DRINK';
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased font-[Cairo]">
      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold py-2.5 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF4D8D] to-[#06B6D4] flex items-center justify-center font-black text-xl text-white shadow-lg shadow-pink-500/20">
              W
            </div>
            <div>
              <h2 className="text-base font-black text-white">{t.brand}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isOwner ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950">
                    👑 {lang === 'ar' ? 'مالك المتجر (Owner)' : 'Store Owner'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    🛡️ {lang === 'ar' ? 'مشرف المتجر (Admin)' : 'Admin'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('PRODUCTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'PRODUCTS'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إدارة الدونتس' : 'Donut Products'} ({adminProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('OFFERS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'OFFERS'
                  ? 'bg-gradient-to-l from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Tag className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'العروض الخاصة والبوكسات' : 'Special Offers'}</span>
            </button>

            <button
              onClick={() => setActiveTab('ADVERTISEMENTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'ADVERTISEMENTS'
                  ? 'bg-gradient-to-l from-pink-600 to-rose-500 text-white shadow-md'
                  : 'text-rose-400 hover:text-rose-300 hover:bg-slate-800'
              }`}
            >
              <Megaphone className="w-4 h-4 text-rose-400" />
              <span>{lang === 'ar' ? 'الإعلانات والبانرات' : 'Advertisements'}</span>
            </button>

            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'ORDERS'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الطلبات المباشرة' : 'Live Orders'}</span>
              {orders.filter((o) => o.status === 'PENDING').length > 0 && (
                <span className="mr-auto bg-cyan-500 text-white text-[11px] px-2 py-0.5 rounded-full font-black animate-pulse">
                  {orders.filter((o) => o.status === 'PENDING').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('DELIVERY')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'DELIVERY'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>{lang === 'ar' ? 'مناطق ورسوم التوصيل' : 'Delivery & Fees'} ({adminLocations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CUSTOMIZATION')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'CUSTOMIZATION'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-pink-400 hover:text-pink-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>{lang === 'ar' ? 'مجموعات التخصيص والإضافات' : 'Customization Groups'} ({customizationGroups.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'CUSTOMERS'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'ar' ? 'العملاء وسجل الحظر' : 'Customer Blocking'} ({customers.length})</span>
              {customers.filter((c) => c.block?.isBlocked).length > 0 && (
                <span className="mr-auto bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {customers.filter((c) => c.block?.isBlocked).length}
                </span>
              )}
            </button>

            {/* Owner-Only Tab: Administrators & Permissions */}
            {isOwner && (
              <button
                onClick={() => setActiveTab('ADMINS')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'ADMINS'
                    ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ar' ? 'المشرفين والصلاحيات' : 'Admins & Access'} ({administrators.length})</span>
              </button>
            )}

            {/* Owner-Only Tab: Monthly Accounting */}
            {isOwner && (
              <button
                onClick={() => {
                  setActiveTab('ACCOUNTING');
                  loadAccountingData();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'ACCOUNTING'
                    ? 'bg-gradient-to-l from-emerald-600 to-emerald-500 text-white shadow-md'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'ar' ? 'المحاسبة والأرشيف الشهري' : 'Monthly Accounting'}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('AUDIT_LOGS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'AUDIT_LOGS'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'ar' ? 'سجل النشاط الإداري' : 'Audit Logs'}</span>
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'SETTINGS'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{lang === 'ar' ? 'معلومات المتجر والتواصل' : 'Store Settings'}</span>
            </button>

            <button
              onClick={() => setActiveTab('STATS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'STATS'
                  ? 'bg-gradient-to-l from-pink-600 to-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{lang === 'ar' ? 'المبيعات والإحصائيات' : 'Sales Analytics'}</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 space-y-3">
          <button
            onClick={onExitAdmin}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition cursor-pointer"
          >
            <span>{t.customerStore}</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
          <div className="text-center text-[10px] text-slate-500">
            <p className="font-bold text-slate-400">{currentUser?.name}</p>
            <p className="font-mono text-slate-500">{currentUser?.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">
              {activeTab === 'PRODUCTS' && (lang === 'ar' ? 'إدارة تشكيلة الدونتس والصور' : 'Donut Catalog & Photo Uploads')}
              {activeTab === 'OFFERS' && (lang === 'ar' ? 'إدارة العروض الخاصة وبوكسات التوفير' : 'Special Bundle Offers & Deals')}
              {activeTab === 'ADVERTISEMENTS' && (lang === 'ar' ? 'إدارة الإعلانات، البانرات والنوافذ المنبثقة' : 'Storefront Ads & Promotional Banners')}
              {activeTab === 'ORDERS' && (lang === 'ar' ? 'متابعة وتحديث الطلبات المباشرة' : 'Live Incoming Orders')}
              {activeTab === 'DELIVERY' && (lang === 'ar' ? 'إدارة المحافظات ومناطق ورسوم التوصيل' : 'Egyptian Delivery Locations & Fees')}
              {activeTab === 'CUSTOMERS' && (lang === 'ar' ? 'إدارة العملاء، سجل الحظر، والملاحظات' : 'Customer Management & Phone Blocking')}
              {activeTab === 'ADMINS' && (lang === 'ar' ? 'إدارة حسابات المشرفين وتعيين الصلاحيات' : 'Administrator Management & Role Permissions')}
              {activeTab === 'ACCOUNTING' && (lang === 'ar' ? 'المحاسبة الشهرية، الأرشيف والتقارير المعتمدة' : 'Monthly Accounting, Archiving & Certified Reports')}
              {activeTab === 'AUDIT_LOGS' && (lang === 'ar' ? 'سجل العمليات والنشاط الإداري' : 'Administrative Audit Trail')}
              {activeTab === 'SETTINGS' && (lang === 'ar' ? 'بيانات المتجر والواتساب وإعلانات الصفحة' : 'Business Info, WhatsApp & Announcements')}
              {activeTab === 'STATS' && (lang === 'ar' ? 'إحصائيات المبيعات والأرباح' : 'Sales & Revenue Analytics')}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'ar'
                ? 'لوحة إدارة متكاملة لمشروع ويف دونتس مصر — جميع العمليات موثقة بالجنيه المصري (ج.م.).'
                : 'Fully integrated Wave Donuts Egypt administrative center — all operations calculated in EGP.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchData(true);
                onReloadProducts();
                onReloadLocations();
                loadStoreSettings();
              }}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 rounded-2xl text-xs font-bold border border-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{lang === 'ar' ? 'تحديث ومزامنة' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* ---------------- 1. Product Management & Image Uploads ---------------- */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-3xl border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">التصنيفات ({adminCategories.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {adminCategories.map((c) => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{c.nameAr}</span>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-slate-400 hover:text-red-400 text-[10px]"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Product Type Filter Pills */}
                <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
                  <button
                    onClick={() => setProductTypeFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      productTypeFilter === 'ALL' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    الكل ({adminProducts.length})
                  </button>
                  <button
                    onClick={() => setProductTypeFilter('DONUT')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      productTypeFilter === 'DONUT' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🍩 الدونتس ({adminProducts.filter((p) => p.productType !== 'DRINK').length})
                  </button>
                  <button
                    onClick={() => setProductTypeFilter('DRINK')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      productTypeFilter === 'DRINK' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ☕ المشروبات ({adminProducts.filter((p) => p.productType === 'DRINK').length})
                  </button>
                </div>

                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة تصنيف</span>
                </button>
                <button
                  onClick={() => {
                    setEditingProduct({ productType: 'DONUT', customizationGroupIds: [] });
                    setBasePriceInput('');
                    setProductOptions([]);
                    setProductImages([]);
                    setMainImage('');
                    setIsNewProduct(true);
                  }}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-l from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة منتج جديد</span>
                </button>
              </div>
            </div>

            {/* Product Grid */}
            {displayedProducts.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-950/60 text-pink-400 flex items-center justify-center">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">لا توجد منتجات مطابقة لهذا القسم</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    يمكنك إضافة منتج دونتس أو مشروب وتحديد الأسعار والصور وتخصيص الخيارات.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct({ productType: 'DONUT', customizationGroupIds: [] });
                    setBasePriceInput('');
                    setProductOptions([]);
                    setProductImages([]);
                    setMainImage('');
                    setIsNewProduct(true);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  + إضافة منتج جديد
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  return (
                    <div
                      key={p.id}
                      className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-slate-700 transition flex flex-col justify-between p-4 space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950">
                          {p.mainImage || (p.images && p.images[0]) ? (
                            <img
                              src={p.mainImage || p.images[0]}
                              alt={p.nameAr}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-bold">
                              بدون صورة
                            </div>
                          )}

                          <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-xs font-black text-pink-400 font-mono">
                            {p.basePrice} ج.م.
                          </div>

                          <div className="absolute bottom-2 right-2 flex gap-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                p.isPublished ? 'bg-cyan-600/90 text-white' : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {p.isPublished ? t.published : t.draft}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                p.isAvailable ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'
                              }`}
                            >
                              {p.isAvailable ? t.inStock : t.outOfStock}
                            </span>
                          </div>
                        </div>

                        <div>
                          {cat && (
                            <span className="text-[10px] text-cyan-400 font-bold">{cat.nameAr}</span>
                          )}
                          <h3 className="font-bold text-sm text-white">{p.nameAr}</h3>
                          {p.nameEn && <p className="text-[11px] text-slate-400">{p.nameEn}</p>}
                          {p.ingredients && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                              🌿 {p.ingredients}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setBasePriceInput(p.basePrice !== undefined && p.basePrice !== null ? String(p.basePrice) : '');
                            setProductOptions((p.options || []).map((o) => ({
                              id: o.id,
                              nameAr: o.nameAr,
                              nameEn: o.nameEn || '',
                              priceDelta: o.priceDelta !== undefined && o.priceDelta !== null ? String(o.priceDelta) : '',
                            })));
                            setProductImages(p.images || []);
                            setMainImage(p.mainImage || (p.images && p.images[0]) || '');
                            setIsNewProduct(false);
                          }}
                          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>تعديل</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---------------- 1b. Special Offers & Bundle Management ---------------- */}
        {activeTab === 'OFFERS' && (
          <AdminOffersManager
            lang={lang}
            products={adminProducts}
            onOffersUpdated={onReloadProducts}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}

        {/* ---------------- 1c. Advertisements & Banner Campaigns ---------------- */}
        {activeTab === 'ADVERTISEMENTS' && (
          <AdminAdvertisementsManager
            lang={lang}
            onAdsUpdated={onReloadProducts}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}

        {/* ---------------- 2. Live Order Intake & Status Dispatch ---------------- */}
        {activeTab === 'ORDERS' && (
          <div className="space-y-6">
            {/* Search Bar for Orders */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'بحث في الطلبات برقم الطلب (مثال: 101)، اسم العميل، رقم الهاتف، أو المنطقة...'
                      : 'Search orders by #, customer name, phone, or delivery area...'
                  }
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {orderSearch && (
                  <button
                    onClick={() => setOrderSearch('')}
                    className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'NOT_RECEIVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterStatus === st
                      ? 'bg-cyan-500 text-white shadow-xs'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st === 'ALL' ? (lang === 'ar' ? 'جميع الطلبات' : 'All Orders') : t.status[st as OrderStatus]}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="p-16 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-500">
                  <p className="text-sm font-semibold">{lang === 'ar' ? 'لا توجد طلبات مطابقة لهذه الحالة حالياً.' : 'No orders found.'}</p>
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const customerAccount = customers.find((c) => c.id === ord.userId);
                  const isCustomerBlocked = customerAccount?.block?.isBlocked;
                  const failedCount = customerAccount?.failedDeliveriesCount || 0;

                  return (
                    <div
                      key={ord.id}
                      className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-pink-400 font-mono">
                            طلب #{ord.orderNumber}
                          </span>
                          <span
                            className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full border ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : ord.status === 'NOT_RECEIVED'
                                ? 'bg-red-950 text-red-400 border-red-800 font-bold'
                                : ord.status === 'CANCELLED'
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : 'bg-slate-800 text-cyan-400 border-cyan-800/80'
                            }`}
                          >
                            {t.status[ord.status]}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(ord.createdAt).toLocaleDateString()}
                          </span>

                          {isCustomerBlocked && (
                            <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full">
                              ⛔ عميل محظور
                            </span>
                          )}

                          {failedCount > 0 && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full">
                              ⚠️ رفض سابقاً ({failedCount}) طلب
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-300">
                          <span className="font-bold text-white">{ord.customerName}</span> ·{' '}
                          <a href={`tel:${ord.customerPhone}`} className="text-cyan-400 hover:underline font-mono">
                            {ord.customerPhone}
                          </a>
                        </div>

                        <div className="text-xs text-slate-400 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                          <span>
                            {ord.addressDetails.governorate} - {ord.addressDetails.city} - {ord.addressDetails.area} - شارع {ord.addressDetails.street} - عمارة {ord.addressDetails.buildingNumber}
                            {ord.addressDetails.floor ? ` · طابق ${ord.addressDetails.floor}` : ''}
                            {ord.addressDetails.apartment ? ` · شقة ${ord.addressDetails.apartment}` : ''}
                            {ord.addressDetails.landmark ? ` (${ord.addressDetails.landmark})` : ''}
                          </span>
                        </div>

                        {ord.notes && (
                          <p className="text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40">
                            💬 ملاحظة العميل: {ord.notes}
                          </p>
                        )}

                        {ord.cancellationReason && (
                          <p className="text-xs text-red-300 bg-red-950/40 p-2 rounded-xl border border-red-800/40">
                            سبب الإلغاء أو عدم الاستلام: {ord.cancellationReason}
                          </p>
                        )}

                        {/* Items */}
                        <div className="pt-2 flex flex-wrap gap-2 text-xs">
                          {ord.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-950 text-slate-200 px-3 py-1 rounded-xl border border-slate-800"
                            >
                              <b className="text-pink-400 font-bold">{it.quantity}x</b> {it.productNameAr}
                              {it.selectedOption ? ` (${it.selectedOption})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Price in EGP & Status Actions */}
                      <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                        <div className="text-xl font-black text-white tabular-nums">
                          {ord.total} <span className="text-xs text-cyan-400 font-bold">ج.م. (كاش)</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          <span>الأصناف: {ord.subtotal} ج.م.</span>
                          <span className="mx-1 text-slate-600">|</span>
                          <span className="text-pink-400 font-bold">التوصيل: {ord.deliveryFee} ج.م.</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {ord.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(ord.id, 'CONFIRMED')}
                                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                تأكيد الطلب
                              </button>
                              <button
                                onClick={() => {
                                  setOrderActionModal({ orderId: ord.id, type: 'CANCEL' });
                                  setActionReason('نفدت الكمية المطلوبة حالياً في المطبخ');
                                }}
                                className="px-3.5 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                اعتذار / إلغاء
                              </button>
                            </>
                          )}

                          {ord.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              <ChefHat className="w-3.5 h-3.5" />
                              <span>بدء التجهيز والخبز</span>
                            </button>
                          )}

                          {ord.status === 'PREPARING' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, 'OUT_FOR_DELIVERY')}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>تسليم للمندوب (في الطريق)</span>
                            </button>
                          )}

                          {ord.status === 'OUT_FOR_DELIVERY' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(ord.id, 'DELIVERED')}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>تم التوصيل واستلام المبلغ</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOrderActionModal({ orderId: ord.id, type: 'NOT_RECEIVED' });
                                  setActionReason('لم يرد العميل على اتصالات المندوب المتكررة');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/60 hover:bg-red-900 text-red-300 border border-red-700/60 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>لم يتم الاستلام</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ---------------- 3. Egyptian Delivery Locations & Fees ---------------- */}
        {activeTab === 'DELIVERY' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-3xl border border-slate-800">
              <p className="text-xs text-slate-400">
                {lang === 'ar'
                  ? 'أضف المحافظات والمناطق التي تخدمها، وحدد رسوم التوصيل والحد الأدنى لكل منطقة بالجنيه المصري (ج.م.).'
                  : 'Manage Egyptian delivery zones, fees, and minimum orders in EGP.'}
              </p>
              <button
                onClick={() => {
                  setEditingLocation({
                    governorate: 'القاهرة',
                    city: '',
                    area: '',
                    deliveryFee: '' as any,
                    minOrder: '' as any,
                    estimatedMin: '' as any,
                    isActive: true,
                  });
                  setIsNewLocation(true);
                }}
                className="px-4 py-2 bg-gradient-to-l from-pink-600 to-cyan-600 text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة منطقة توصيل</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminLocations.map((loc) => (
                <div key={loc.id} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-pink-400 font-bold">{loc.governorate}</span>
                      <h3 className="font-bold text-white text-sm">{loc.area}</h3>
                      <p className="text-xs text-slate-400">{loc.city}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        loc.isActive ? 'bg-cyan-600/90 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {loc.isActive ? 'متاحة للطلب' : 'معطلة'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500">رسوم التوصيل</span>
                      <p className="font-black text-pink-400 tabular-nums">{loc.deliveryFee} ج.م.</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">الحد الأدنى</span>
                      <p className="font-black text-cyan-400 tabular-nums">{loc.minOrder} ج.م.</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">الوقت المتوقع</span>
                      <p className="font-black text-slate-200 tabular-nums">{loc.estimatedMin} دقيقة</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setEditingLocation(loc);
                        setIsNewLocation(false);
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition cursor-pointer"
                    >
                      تعديل الرسوم
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="p-2 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- 3.5. Product Customization Builder ---------------- */}
        {activeTab === 'CUSTOMIZATION' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-4 rounded-3xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>منشئ مجموعات التخصيص والإضافات (Product Customization Builder)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  أنشئ مجموعات تخصيص غير محدودة بـ 6 أنواع من الحقول (اختيار فردي، متعدد، قائمة، نص، كتابة على العلب، كميات) وفروق أسعار بالجنيه المصري.
                </p>
              </div>

              <button
                onClick={handleOpenAddGroup}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-l from-pink-600 to-cyan-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة مجموعة تخصيص جديدة</span>
              </button>
            </div>

            {/* Owner Exclusive: Live Custom Donut Design Studio */}
            {isOwner && (
              <div className="p-6 rounded-3xl bg-slate-900 border border-pink-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-cyan-500 flex items-center justify-center text-white shadow-md">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>استوديو تصميم الدونت الخاص بالمالك (حصري للمالك)</span>
                        <span className="text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full font-bold">
                          Owner Only Preview
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        متاح فقط لحساب مالك المتجر لاختبار وتجربة مصمم الدونت المخصص والإضافات والأسعار مباشرة. تم إخفاؤه تماماً عن واجهة العملاء.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowOwnerCustomDonutTester(!showOwnerCustomDonutTester)}
                    className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-pink-400 border border-pink-500/30 transition cursor-pointer"
                  >
                    {showOwnerCustomDonutTester ? 'إخفاء استوديو التصميم' : 'فتح استوديو التصميم للاختبار'}
                  </button>
                </div>

                {showOwnerCustomDonutTester && (
                  <div className="pt-4 border-t border-slate-800">
                    <CustomDonutBuilder
                      lang={lang}
                      customizationGroups={customizationGroups}
                      donutProducts={adminProducts}
                      onAddToCart={(item) => {
                        setTestedCustomDonuts((prev) => [item, ...prev]);
                        showSuccess(
                          lang === 'ar'
                            ? `تمت تجربة تصميم الدونت بنجاح (${item.unitPrice} ج.م.)`
                            : `Custom donut tested successfully (${item.unitPrice} EGP)`
                        );
                      }}
                    />

                    {testedCustomDonuts.length > 0 && (
                      <div className="mt-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-300">سجل تصميمات الدونت المجربة في هذه الجلسة:</h5>
                          <button
                            onClick={() => setTestedCustomDonuts([])}
                            className="text-[11px] text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            مسح سجل التجربة
                          </button>
                        </div>
                        <div className="space-y-2">
                          {testedCustomDonuts.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-white">{item.product.nameAr}</span>
                                <span className="text-pink-400 font-mono font-bold mr-2">
                                  {item.unitPrice} ج.م.
                                </span>
                                {item.selectedCustomizations && item.selectedCustomizations.length > 0 && (
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    الإضافات: {item.selectedCustomizations.map((c) => `${c.groupName}: ${c.optionName}`).join(' · ')}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                                تم الحساب بنجاح
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {customizationGroups.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-950/60 text-pink-400 flex items-center justify-center">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">لا توجد مجموعات تخصيص بعد</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    يمكنك إنشاء مجموعات تخصيص مثل (الحجم، نوع الحشو، صوصات إضافية، رسالة على البوكس، سكر قليل) وتحديد أسعار كل خيار بالجنيه المصري وربطها بالدونتس والمشروبات.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddGroup}
                  className="px-5 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  + إنشاء أول مجموعة تخصيص
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customizationGroups.map((grp) => (
                  <div
                    key={grp.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between hover:border-slate-700 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{grp.nameAr}</h4>
                            {grp.isRequired ? (
                              <span className="text-[10px] bg-pink-950 text-pink-400 border border-pink-800 font-bold px-2 py-0.5 rounded-md">
                                إلزامي
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded-md">
                                اختياري
                              </span>
                            )}
                          </div>
                          {grp.nameEn && <p className="text-xs text-slate-400 mt-0.5">{grp.nameEn}</p>}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            grp.isActive
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {grp.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="bg-slate-950 text-cyan-400 px-2 py-1 rounded-lg border border-slate-800">
                          نوع الحقل:{' '}
                          {grp.type === 'SINGLE_SELECT'
                            ? 'اختيار فردي'
                            : grp.type === 'MULTI_SELECT'
                            ? 'اختيارات متعددة'
                            : grp.type === 'DROPDOWN'
                            ? 'قائمة منسدلة'
                            : grp.type === 'TEXT'
                            ? 'حقل نصي'
                            : grp.type === 'TEXTAREA'
                            ? 'كتابة على العلبة'
                            : 'عداد أرقام'}
                        </span>
                        <span className="bg-slate-950 text-slate-400 px-2 py-1 rounded-lg border border-slate-800">
                          {grp.assignedToAll
                            ? 'مطبق على كل المنتجات'
                            : `مربوط بـ ${grp.assignedProductIds?.length || 0} منتج`}
                        </span>
                      </div>

                      {/* Options Preview */}
                      {grp.options && grp.options.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                            الخيارات المتاحة ({grp.options.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {grp.options.slice(0, 6).map((opt) => (
                              <span
                                key={opt.id}
                                className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300"
                              >
                                {opt.nameAr}
                                {opt.priceDelta > 0 ? ` (+${opt.priceDelta} ج.م.)` : ' (مجاني)'}
                              </span>
                            ))}
                            {grp.options.length > 6 && (
                              <span className="text-[10px] text-slate-500 self-center">
                                +{grp.options.length - 6} إضافية...
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleOpenEditGroup(grp)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>تعديل المجموعة</span>
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(grp.id, grp.nameAr)}
                        className="p-2 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl transition cursor-pointer"
                        title="حذف المجموعة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- 4. Customer Directory, Blocking & Notes ---------------- */}
        {activeTab === 'CUSTOMERS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-4 rounded-3xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="ابحث بالاسم، رقم الموبايل، أو الإيميل..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-white focus:outline-pink-500"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>إجمالي العملاء: <b className="text-white">{customers.length}</b></span>
                <span>·</span>
                <span className="text-red-400">
                  المحظورين: <b>{customers.filter((c) => c.block?.isBlocked).length}</b>
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">{t.name}</th>
                    <th className="p-4">{t.phone}</th>
                    <th className="p-4 text-center">طلبات مكتملة</th>
                    <th className="p-4 text-center">فشل التوصيل</th>
                    <th className="p-4 text-center">حالة الحساب</th>
                    <th className="p-4 text-left">إجمالي الإنفاق</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        لا يوجد عملاء مسجلين يطابقون البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const isBlocked = c.block?.isBlocked;
                      const failedCount = c.failedDeliveriesCount || 0;

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4 font-bold text-white">
                            <button
                              type="button"
                              onClick={() => handleOpenCustomerProfile(c)}
                              className="text-right hover:text-pink-400 transition cursor-pointer flex flex-col items-start group"
                              title="اضغط لفتح الملف الكامل وسجل الطلبات والعناوين"
                            >
                              <span className="font-bold text-white group-hover:text-pink-400 underline decoration-dotted underline-offset-4">
                                {c.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans">{c.email}</span>
                            </button>
                          </td>
                          <td className="p-4 font-mono text-cyan-400">
                            <a
                              href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline flex items-center gap-1"
                              title="محادثة واتساب"
                            >
                              <span>{c.phone}</span>
                            </a>
                          </td>
                          <td className="p-4 text-center font-bold tabular-nums text-pink-400">
                            {c.totalOrders || 0}
                          </td>
                          <td className="p-4 text-center">
                            {failedCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 font-bold border border-red-800/60">
                                {failedCount} مرات
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {isBlocked ? (
                              <span className="px-2.5 py-1 rounded-xl bg-red-600 text-white font-black text-[11px] shadow-xs">
                                {c.block?.type === 'TEMPORARY' ? 'محظور مؤقتاً' : 'محظور دائم'}
                              </span>
                            ) : c.isActive === false ? (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-950 text-amber-400 font-bold text-[11px] border border-amber-800/60">
                                معطل
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-400 font-bold text-[11px] border border-emerald-800/60">
                                حساب نشط
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-left font-black text-white tabular-nums">
                            {c.totalSpent || 0} ج.م.
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Open Dedicated Profile */}
                              <button
                                onClick={() => handleOpenCustomerProfile(c)}
                                className="px-2.5 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                                title="عرض الملف الشخصي وسجل الطلبات والعناوين"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>عرض الملف</span>
                              </button>

                              {/* Deactivate / Reactivate Customer Toggle */}
                              <button
                                onClick={() => handleToggleCustomerActive(c)}
                                className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer transition ${
                                  c.isActive === false
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                                title={c.isActive === false ? 'تفعيل حساب العميل' : 'تعطيل حساب العميل'}
                              >
                                {c.isActive === false ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>تفعيل</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>تعطيل</span>
                                  </>
                                )}
                              </button>

                              {/* Block or Unblock button */}
                              {isBlocked ? (
                                <button
                                  onClick={() => handleUnblockCustomer(c)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="فك الحظر عن العميل ورقم هاتفه"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>فك الحظر</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setBlockingCustomer(c)}
                                  className="px-2 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="حظر العميل"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Customer Button (Protected & Preserves Orders) */}
                              <button
                                onClick={() => handleDeleteCustomerClick(c)}
                                className="p-1.5 rounded-xl bg-slate-900 hover:bg-red-950 text-slate-500 hover:text-red-400 border border-slate-800 transition cursor-pointer"
                                title="حذف حساب العميل مع الاحتفاظ بسجل الطلبات والمبيعات"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- 5. Administrator Management & Roles (Owner Only) ---------------- */}
        {activeTab === 'ADMINS' && isOwner && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-3xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-300 font-bold">
                  إدارة المشرفين والصلاحيات المخصصة (Owner Control)
                </p>
                <p className="text-[11px] text-slate-500">
                  بصفتك مالك المتجر، يمكنك إنشاء مشرفين، تعيين صلاحيات دقيقة لكل مشرف، تفعيل أو تعطيل الحسابات، أو سحب الصلاحيات.
                </p>
              </div>
              <button
                onClick={handleOpenAddAdmin}
                className="px-4 py-2.5 bg-gradient-to-l from-pink-600 to-cyan-600 text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة مشرف جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {administrators.map((adm) => {
                const isAdmOwner = adm.role === 'OWNER';
                return (
                  <div
                    key={adm.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">{adm.name}</h3>
                          {isAdmOwner ? (
                            <span className="text-[10px] bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-md">
                              👑 المالك (Owner)
                            </span>
                          ) : (
                            <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold px-2 py-0.5 rounded-md">
                              🛡️ مشرف (Admin)
                            </span>
                          )}
                          {!adm.isActive && (
                            <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 font-bold px-2 py-0.5 rounded-md">
                              معطل
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{adm.email}</p>
                        <p className="text-xs text-slate-500 font-mono">{adm.phone}</p>
                      </div>

                      {!isAdmOwner && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleAdminStatus(adm)}
                            className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition ${
                              adm.isActive
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900'
                            }`}
                            title={adm.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          >
                            {adm.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleOpenEditAdmin(adm)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer"
                            title="تعديل الصلاحيات"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(adm)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-red-400 cursor-pointer"
                            title="حذف المشرف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Permissions list */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        الصلاحيات الممنوحة:
                      </span>
                      {isAdmOwner ? (
                        <p className="text-xs text-emerald-400 font-bold">
                          ✓ صلاحيات مالك مطلقة غير مقيدة لجميع أقسام المتجر والسيرفر
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <span className={adm.permissions?.canManageProducts ? 'text-emerald-400' : 'text-slate-600 line-through'}>
                            {adm.permissions?.canManageProducts ? '✓' : '✗'} إدارة الدونتس والصور
                          </span>
                          <span className={adm.permissions?.canManageOffers ? 'text-amber-400 font-bold' : 'text-slate-600 line-through'}>
                            {adm.permissions?.canManageOffers ? '✓' : '✗'} إدارة العروض الخاصة
                          </span>
                          <span className={adm.permissions?.canManageAdvertisements ? 'text-pink-400 font-bold' : 'text-slate-600 line-through'}>
                            {adm.permissions?.canManageAdvertisements ? '✓' : '✗'} إدارة الإعلانات والبانرات
                          </span>
                          <span className={adm.permissions?.canManageOrders ? 'text-emerald-400' : 'text-slate-600 line-through'}>
                            {adm.permissions?.canManageOrders ? '✓' : '✗'} إدارة وتأكيد الطلبات
                          </span>
                          <span className={adm.permissions?.canManageDelivery ? 'text-emerald-400' : 'text-slate-600 line-through'}>
                            {adm.permissions?.canManageDelivery ? '✓' : '✗'} مناطق ورسوم التوصيل
                          </span>
                          <span className={adm.permissions?.canManageCustomers ? 'text-emerald-400' : 'text-slate-600 line-through'}>
                            {adm.permissions?.canManageCustomers ? '✓' : '✗'} سجل العملاء والحظر
                          </span>
                          <span className={adm.permissions?.canManageSettings ? 'text-emerald-400' : 'text-slate-600 line-through'}>
                            {adm.permissions?.canManageSettings ? '✓' : '✗'} إعدادات المتجر وبيانات التواصل
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- 6. Audit Logs ---------------- */}
        {activeTab === 'AUDIT_LOGS' && (
          <div className="space-y-4">
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-200">سجل النشاط الإداري والعمليات</h3>
                <p className="text-[11px] text-slate-500">
                  توثيق آلي لجميع الإجراءات الإدارية: تغيير حالات الطلبات، الحظر، تعديل الأسعار، ومناطق التوصيل.
                </p>
              </div>
              <span className="text-xs text-cyan-400 font-mono font-bold">
                {filteredAuditLogs.length} من {auditLogs.length} سجل محفوظ
              </span>
            </div>

            {/* Search and Role Filter for Audit Trail */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
                <input
                  type="text"
                  value={auditLogSearch}
                  onChange={(e) => setAuditLogSearch(e.target.value)}
                  placeholder="ابحث في سجل العمليات باسم المنفذ، نوع الإجراء، أو تفاصيل العملية..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {auditLogSearch && (
                  <button
                    onClick={() => setAuditLogSearch('')}
                    className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {(['ALL', 'OWNER', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAuditRoleFilter(r)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      auditRoleFilter === r
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {r === 'ALL' ? 'كافة الأدوار' : r === 'OWNER' ? 'المالك (Owner)' : 'المشرفين (Admins)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">الوقت والتاريخ</th>
                    <th className="p-4">المنفذ</th>
                    <th className="p-4">الدور</th>
                    <th className="p-4">الإجراء</th>
                    <th className="p-4">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-sans">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500 font-[Cairo]">
                        لا توجد سجلات مطابقة للبحث أو الدور المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('ar-EG', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="p-4 font-bold text-white">{log.performedByName}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.performedByRole === 'OWNER'
                                ? 'bg-pink-950 text-pink-400 border border-pink-800'
                                : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            }`}
                          >
                            {log.performedByRole}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-200 font-[Cairo]">{log.action}</td>
                        <td className="p-4 text-slate-400 text-[11px] font-[Cairo] max-w-xs truncate">
                          {log.details || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- 7. Store Settings & Socials ---------------- */}
        {activeTab === 'SETTINGS' && settings && (
          <div className="space-y-8 max-w-3xl">
            <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-pink-400" />
                <span>أرقام التواصل والواتساب</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">رقم الموبايل / الهاتف</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="010xxxxxxxx أو 02xxxxxxxx"
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">رقم الواتساب للطلبات السريعة</label>
                  <input
                    type="text"
                    value={settings.whatsapp}
                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    placeholder="2010xxxxxxxx"
                    className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>إعلانات المتجر والعروض وساعات العمل</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">شريط الإعلان أعلى الصفحة الرئيسية</label>
                <input
                  type="text"
                  value={settings.announcementAr}
                  onChange={(e) => setSettings({ ...settings, announcementAr: e.target.value })}
                  placeholder="مثال: خصم 20% على بوكسات الدونتس العائلية لفترة محدودة!"
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showAnnounceCheck"
                  checked={settings.showAnnouncement}
                  onChange={(e) => setSettings({ ...settings, showAnnouncement: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <label htmlFor="showAnnounceCheck" className="text-xs text-slate-300 font-bold">
                  تفعيل شريط الإعلان أعلى الموقع
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">ساعات العمل</label>
                <input
                  type="text"
                  value={settings.workingHoursAr}
                  onChange={(e) => setSettings({ ...settings, workingHoursAr: e.target.value })}
                  placeholder="يومياً من ١٠ صباحاً حتى ١١ مساءً"
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">عن ويف دونتس (قصة المتجر)</label>
                <textarea
                  rows={3}
                  value={settings.aboutAr}
                  onChange={(e) => setSettings({ ...settings, aboutAr: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">روابط السوشيال ميديا</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="رابط إنستجرام Instagram"
                  value={settings.instagramUrl}
                  onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="رابط فيسبوك Facebook"
                  value={settings.facebookUrl}
                  onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="رابط تيك توك TikTok"
                  value={settings.tiktokUrl}
                  onChange={(e) => setSettings({ ...settings, tiktokUrl: e.target.value })}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-l from-pink-600 to-cyan-600 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'ar' ? 'حفظ إعدادات المتجر' : 'Save Settings'}</span>
              </button>

              {Boolean(settings.announcementAr || settings.showAnnouncement) && (
                <button
                  type="button"
                  onClick={handleClearAnnouncement}
                  disabled={loading}
                  className="px-4 py-3 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'مسح وحذف الإعلان' : 'Clear Announcement'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Owner-Only Account Credentials & Recovery Settings */}
          {isOwner && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 max-w-3xl mt-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4D8D] to-[#06B6D4] text-white flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {lang === 'ar' ? 'بيانات حساب مالك المتجر الرئيسي (Owner Profile)' : 'Store Owner Profile & Credentials'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lang === 'ar'
                        ? 'يمكنك تعديل بيانات تسجيل الدخول الخاصة بك أو تحديث البريد الإلكتروني وكلمة المرور'
                        : 'Update your personal store owner credentials or email and password'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateOwnerProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {lang === 'ar' ? 'اسم مالك المتجر' : 'Owner Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerProfileName}
                      onChange={(e) => setOwnerProfileName(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: أحمد محمد' : 'e.g. Ahmed Mohamed'}
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {lang === 'ar' ? 'رقم الهاتف' : 'Phone'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={ownerProfilePhone}
                      onChange={(e) => setOwnerProfilePhone(e.target.value)}
                      placeholder="010xxxxxxxx"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {lang === 'ar' ? 'البريد الإلكتروني للدخول' : 'Login Email'}
                    </label>
                    <input
                      type="email"
                      required
                      value={ownerProfileEmail}
                      onChange={(e) => setOwnerProfileEmail(e.target.value)}
                      placeholder="your-email@gmail.com"
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {lang === 'ar' ? 'كلمة المرور الجديدة (اختياري)' : 'New Password (optional)'}
                    </label>
                    <input
                      type="password"
                      value={ownerProfilePassword}
                      onChange={(e) => setOwnerProfilePassword(e.target.value)}
                      placeholder={lang === 'ar' ? 'اتركها فارغة إذا لم ترد تغييرها' : 'Leave blank to keep unchanged'}
                      className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={savingOwnerProfile}
                    className="px-6 py-3 bg-gradient-to-l from-pink-600 to-pink-500 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingOwnerProfile ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ بيانات المالك' : 'Save Owner Profile')}</span>
                  </button>

                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{lang === 'ar' ? 'حساب المالك دائم ومحمي ولا يمكن حذفه أو استبداله' : 'Owner account is permanent and protected'}</span>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

        {/* ---------------- 8. Sales Analytics ---------------- */}
        {activeTab === 'STATS' && stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400">إجمالي المبيعات المكتملة</span>
                <p className="text-3xl font-black text-pink-400 tabular-nums">{stats.totalRevenue} <span className="text-sm">ج.م.</span></p>
                <p className="text-[10px] text-slate-500">طلبات مسلمة كاش</p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400">الطلبات الجارية الآن</span>
                <p className="text-3xl font-black text-cyan-400 tabular-nums">{stats.activeOrders}</p>
                <p className="text-[10px] text-slate-500">قيد التحضير أو مع المندوب</p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400">إجمالي الطلبات المسلمة</span>
                <p className="text-3xl font-black text-emerald-400 tabular-nums">{stats.completedOrdersCount}</p>
                <p className="text-[10px] text-slate-500">طلب تم توصيله بنجاح</p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs font-bold text-slate-400">متوسط قيمة الطلب</span>
                <p className="text-3xl font-black text-purple-400 tabular-nums">{stats.averageOrderValue} <span className="text-sm">ج.م.</span></p>
                <p className="text-[10px] text-slate-500">لكل طلب مكتمل</p>
              </div>
            </div>

            {/* Popular donuts leaderboard */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">ترتيب الدونتس الأكثر مبيعاً</h3>
              {stats.popularDonuts?.length === 0 ? (
                <p className="text-xs text-slate-500">سيظهر ترتيب الأصناف فور اكتمال أول طلبات التوصيل.</p>
              ) : (
                <div className="space-y-3">
                  {stats.popularDonuts.map((d: any, idx: number) => (
                    <div key={d.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-black text-pink-400 text-sm">#{idx + 1}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{d.nameAr}</p>
                          {d.nameEn && <p className="text-[10px] text-slate-400">{d.nameEn}</p>}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-black text-white tabular-nums">{d.count} قطعة</span>
                        <p className="text-[10px] text-cyan-400 tabular-nums">{d.revenue} ج.م.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- 9. Monthly Accounting & Certified Archives (Owner Only) ---------------- */}
        {activeTab === 'ACCOUNTING' && isOwner && (
          <div className="space-y-6">
            {/* Top Toolbar: Month Picker & Actions */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    {lang === 'ar' ? 'اختر الفترة المحاسبية الشهرية:' : 'Select Accounting Period:'}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMonthKey}
                      onChange={(e) => handleSelectAccountingMonth(e.target.value)}
                      className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer min-w-[200px]"
                    >
                      {accountingMonths.map((m) => {
                        const isArchived = accountingArchives.some((a) => a.monthKey === m);
                        const isActive = m === activeAccountingMonthKey;
                        return (
                          <option key={m} value={m}>
                            {m} {isArchived ? '(مؤرشف ومغلق)' : isActive ? '(فترة نشطة)' : ''}
                          </option>
                        );
                      })}
                      {accountingMonths.length === 0 && (
                        <option value={new Date().toISOString().slice(0, 7)}>
                          {new Date().toISOString().slice(0, 7)} (فترة نشطة)
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="pt-4 sm:pt-4">
                  {accountingReport?.isClosed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'ar' ? 'شهر مغلق ومؤرشف رسمياً' : 'Closed & Archived Month'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'ar' ? 'فترة محاسبية نشطة مفتوحة للعمليات' : 'Active Operational Period'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Export, Print, Close, New Period */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition cursor-pointer"
                  title="طباعة التقرير الشهري المعتمد"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'ar' ? 'طباعة التقرير الرسمي' : 'Print Report'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition cursor-pointer"
                  title="تصدير السجلات إلى ملف Excel متوافق مع اللغة العربية"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'ar' ? 'تصدير كشف Excel (CSV)' : 'Export CSV'}</span>
                </button>

                {!accountingReport?.isClosed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCloseMonthNotes('');
                      setShowCloseMonthModal(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer"
                  >
                    <Archive className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إغلاق وأرشفة الشهر' : 'Close Month'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReopenMonth(selectedMonthKey)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إعادة فتح الشهر' : 'Reopen Month'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const nextKey = getNextMonthKey(selectedMonthKey || activeAccountingMonthKey);
                    setNewPeriodMonthInput(nextKey);
                    setNewPeriodNotes('');
                    setShowNewPeriodModal(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'بدء فترة محاسبية جديدة' : 'Start New Period'}</span>
                </button>
              </div>
            </div>

            {/* Closed Archive Banner Notice */}
            {accountingReport?.isClosed && accountingReport.archiveRecord && (
              <div className="p-4 rounded-3xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="font-bold">
                      تم إغلاق وأرشفة هذا الشهر رسمياً بتاريخ{' '}
                      {new Date(accountingReport.archiveRecord.closedAt).toLocaleString('ar-EG')} بواسطة{' '}
                      {accountingReport.archiveRecord.closedByName || accountingReport.archiveRecord.closedById}
                    </p>
                    {accountingReport.archiveRecord.closingNotes && (
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        ملاحظات الإغلاق: {accountingReport.archiveRecord.closingNotes}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-mono shrink-0">
                  سجل مؤرشف ومحمي
                </span>
              </div>
            )}

            {loadingAccounting && (
              <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-xs font-bold">جاري تحميل وتدقيق البيانات المحاسبية للشهر المحدد...</span>
              </div>
            )}

            {/* Financial Summary Cards */}
            {accountingReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Collected Cash (Highlight) */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/70 to-slate-900 border-2 border-emerald-500/60 shadow-lg space-y-1">
                    <span className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                      <span>إجمالي المبيعات المحصلة نقداً</span>
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                    </span>
                    <p className="text-3xl font-black text-emerald-400 tabular-nums">
                      {accountingReport.summary.collectedAmount.toFixed(2)}{' '}
                      <span className="text-sm">ج.م.</span>
                    </p>
                    <p className="text-[10px] text-emerald-300/80">
                      الدفع عند الاستلام (COD) للطلبات المسلمة
                    </p>
                  </div>

                  {/* Card 2: Gross Sales */}
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">إجمالي المبيعات المسجلة</span>
                    <p className="text-3xl font-black text-pink-400 tabular-nums">
                      {accountingReport.summary.grossSales.toFixed(2)}{' '}
                      <span className="text-sm">ج.م.</span>
                    </p>
                    <p className="text-[10px] text-slate-500">القيمة الإجمالية لكافة الطلبات</p>
                  </div>

                  {/* Card 3: Pending / Unpaid COD */}
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">مبيعات قيد التوصيل والتحصيل</span>
                    <p className="text-3xl font-black text-amber-400 tabular-nums">
                      {accountingReport.summary.unpaidAmount.toFixed(2)}{' '}
                      <span className="text-sm">ج.م.</span>
                    </p>
                    <p className="text-[10px] text-slate-500">طلبات جارية مع المناديب</p>
                  </div>

                  {/* Card 4: Cancelled Amount */}
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">طلبات ملغاة أو غير مستلمة</span>
                    <p className="text-3xl font-black text-red-400 tabular-nums">
                      {accountingReport.summary.cancelledAmount.toFixed(2)}{' '}
                      <span className="text-sm">ج.م.</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {accountingReport.summary.cancelledOrders} طلبات ملغاة
                    </p>
                  </div>

                  {/* Card 5: Delivery Fees Collected */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">رسوم التوصيل المحصلة</span>
                    <p className="text-2xl font-black text-cyan-400 tabular-nums">
                      {accountingReport.summary.deliveryFeesCollected.toFixed(2)}{' '}
                      <span className="text-xs">ج.م.</span>
                    </p>
                    <p className="text-[10px] text-slate-500">للطلبات المسلمة للعملاء</p>
                  </div>

                  {/* Card 6: Products Net Sales */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">صافي مبيعات المنتجات</span>
                    <p className="text-2xl font-black text-purple-400 tabular-nums">
                      {accountingReport.summary.productsSalesTotal.toFixed(2)}{' '}
                      <span className="text-xs">ج.م.</span>
                    </p>
                    <p className="text-[10px] text-slate-500">دون احتساب رسوم التوصيل</p>
                  </div>

                  {/* Card 7: Average Order Value */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">متوسط قيمة الطلب</span>
                    <p className="text-2xl font-black text-white tabular-nums">
                      {accountingReport.summary.averageOrderValue.toFixed(2)}{' '}
                      <span className="text-xs">ج.م.</span>
                    </p>
                    <p className="text-[10px] text-slate-500">لكل طلب مكتمل ومحصل</p>
                  </div>

                  {/* Card 8: Delivered Orders Count */}
                  <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-slate-400">نسبة نجاح التوصيل</span>
                    <p className="text-2xl font-black text-emerald-400 tabular-nums">
                      {accountingReport.summary.deliveredOrders}{' '}
                      <span className="text-xs text-slate-400">من {accountingReport.summary.totalOrders}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {accountingReport.summary.totalOrders > 0
                        ? `${Math.round((accountingReport.summary.deliveredOrders / accountingReport.summary.totalOrders) * 100)}% معدل التسليم`
                        : 'لا توجد طلبات'}
                    </p>
                  </div>
                </div>

                {/* Historical Itemized Orders Table for this Month */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900 border border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>كشف الطلبات التاريخي المفصل لشهر {accountingReport.summary.monthKey} ({accountingReport.summary.monthNameAr})</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        جميع الطلبات محفوظة ومؤرشفة نهائياً مع تفاصيل أسعارها ورسوم توصيلها الأصلية دون أي تعديل.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                      {accountingReport.orders.length} طلب في هذا الشهر
                    </span>
                  </div>

                  <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-4 whitespace-nowrap">رقم الطلب</th>
                            <th className="p-4 whitespace-nowrap">الوقت والتاريخ</th>
                            <th className="p-4 whitespace-nowrap">العميل ورقم الهاتف</th>
                            <th className="p-4 whitespace-nowrap">المنطقة والعنوان</th>
                            <th className="p-4 whitespace-nowrap">المنتجات</th>
                            <th className="p-4 whitespace-nowrap">قيمة المنتجات</th>
                            <th className="p-4 whitespace-nowrap">رسوم التوصيل</th>
                            <th className="p-4 whitespace-nowrap">إجمالي الطلب</th>
                            <th className="p-4 whitespace-nowrap">حالة الطلب والتحصيل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300 font-sans">
                          {accountingReport.orders.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-12 text-center text-slate-500 font-[Cairo]">
                                لا توجد طلبات مسجلة في شهر {selectedMonthKey}.
                              </td>
                            </tr>
                          ) : (
                            accountingReport.orders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-slate-800/40">
                                <td className="p-4 font-mono font-black text-pink-400">
                                  #{ord.orderNumber}
                                </td>
                                <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                                  {new Date(ord.createdAt).toLocaleString('ar-EG', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-white font-[Cairo]">{ord.customerName}</p>
                                  <a href={`tel:${ord.customerPhone}`} className="text-cyan-400 font-mono text-[11px] hover:underline">
                                    {ord.customerPhone}
                                  </a>
                                </td>
                                <td className="p-4 max-w-xs font-[Cairo]">
                                  <p className="text-slate-200 font-bold">{ord.addressDetails.area} - {ord.addressDetails.city}</p>
                                  <p className="text-slate-400 text-[11px] truncate">
                                    ش {ord.addressDetails.street} · عمارة {ord.addressDetails.buildingNumber}
                                  </p>
                                </td>
                                <td className="p-4 max-w-xs font-[Cairo]">
                                  {ord.items.map((it, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-300">
                                      • {it.product?.nameAr || it.productNameAr} x{it.quantity} ({(it.unitPrice * it.quantity).toFixed(2)} ج.م.)
                                    </div>
                                  ))}
                                </td>
                                <td className="p-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                                  {ord.subtotal.toFixed(2)} ج.م.
                                </td>
                                <td className="p-4 font-mono text-cyan-400 whitespace-nowrap">
                                  {ord.deliveryFee.toFixed(2)} ج.م.
                                </td>
                                <td className="p-4 font-mono font-black text-white whitespace-nowrap">
                                  {ord.total.toFixed(2)} ج.م.
                                </td>
                                <td className="p-4 whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${
                                      ord.status === 'DELIVERED'
                                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                        : ord.status === 'CANCELLED' || ord.status === 'NOT_RECEIVED'
                                        ? 'bg-red-950 text-red-400 border-red-800'
                                        : 'bg-amber-950 text-amber-400 border-amber-800'
                                    }`}
                                  >
                                    {t.status[ord.status] || ord.status}
                                    {ord.status === 'DELIVERED' && ' (كاش محصل)'}
                                  </span>
                                  {ord.cancellationReason && (
                                    <p className="text-[10px] text-red-400 mt-1 max-w-[160px] truncate">
                                      السبب: {ord.cancellationReason}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---------------- Modals ---------------- */}

      {/* 1. Product Add/Edit Modal with Real Image Upload */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProduct}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">
                {isNewProduct ? 'إضافة دونت جديدة' : 'تعديل بيانات الدونت'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Essential Image Upload Section */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>صور الدونت (رفع من هاتفك أو جهازك مباشرة)</span>
                </label>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? t.uploading : t.uploadImage}</span>
                </button>
              </div>

              {/* Uploaded Photos Thumbnails & Main Image Selector */}
              {productImages.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-6 text-center cursor-pointer space-y-1.5"
                >
                  <Upload className="w-6 h-6 mx-auto text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">اضغط هنا لاختيار صور من جهازك (JPG, PNG, WebP)</p>
                  <p className="text-[10px] text-slate-500">يمكنك رفع صورة واحدة أو عدة صور لنفس الدونت</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {productImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                        mainImage === imgUrl ? 'border-pink-500' : 'border-slate-700'
                      }`}
                    >
                      <img src={imgUrl} alt="Donut preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(imgUrl)}
                        className="absolute top-1 left-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-1"
                        title={t.removeImage}
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => setMainImage(imgUrl)}
                        className={`absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          mainImage === imgUrl ? 'bg-pink-600 text-white' : 'bg-black/70 text-slate-300'
                        }`}
                      >
                        {mainImage === imgUrl ? 'رئيسية' : 'تعيين'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Names in Arabic & English */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  اسم الدونت بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.nameAr || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameAr: e.target.value })}
                  placeholder="مثال: دونت لوتس كرانش"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  الاسم بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={editingProduct.nameEn || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nameEn: e.target.value })}
                  placeholder="e.g. Lotus Crunch Donut"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            {/* Price in EGP & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  السعر الأساسي بالجنيه المصري (ج.م.) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={basePriceInput}
                  onChange={(e) => setBasePriceInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="مثال: 45"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  التصنيف
                </label>
                <select
                  value={editingProduct.categoryId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="">بدون تصنيف</option>
                  {adminCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameAr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Simple Customer Choices & Options */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-pink-400">
                    خيارات وإضافات المنتج للزبائن (Customer Options & Choices)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    أضف خيارات إضافية يختار منها الزبون (مثل صوص إضافي، نكهة، حشوة) مع تحديد سعرها بالجنيه المصري.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddProductOption}
                  className="px-3 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة خيار جديد</span>
                </button>
              </div>

              {productOptions.length === 0 ? (
                <div className="text-center py-3 px-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-500">
                  لا توجد خيارات مخصصة لهذا المنتج بعد. اضغط على "+ إضافة خيار جديد" لإضافة خيار مع سعره.
                </div>
              ) : (
                <div className="space-y-2">
                  {productOptions.map((opt, idx) => (
                    <div
                      key={opt.id || idx}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800"
                    >
                      <div className="col-span-5">
                        <label className="block text-[9px] text-slate-400 font-bold mb-0.5">
                          اسم الخيار بالعربية *
                        </label>
                        <input
                          type="text"
                          required
                          value={opt.nameAr}
                          onChange={(e) => handleProductOptionChange(idx, 'nameAr', e.target.value)}
                          placeholder="مثال: إضافة صوص كندر"
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[9px] text-slate-400 font-bold mb-0.5">
                          الاسم بالإنجليزية (اختياري)
                        </label>
                        <input
                          type="text"
                          value={opt.nameEn || ''}
                          onChange={(e) => handleProductOptionChange(idx, 'nameEn', e.target.value)}
                          placeholder="e.g. Extra Kinder Sauce"
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] text-slate-400 font-bold mb-0.5">
                          السعر (ج.م.) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          value={opt.priceDelta}
                          onChange={(e) =>
                            handleProductOptionChange(
                              idx,
                              'priceDelta',
                              e.target.value.replace(/[^0-9.]/g, '')
                            )
                          }
                          placeholder="15"
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono text-center"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pt-3.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveProductOption(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 cursor-pointer transition"
                          title="حذف هذا الخيار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                المكونات الطبيعية (المحتويات)
              </label>
              <input
                type="text"
                value={editingProduct.ingredients || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })}
                placeholder="مثال: دقيق فاخر، زبدة فرنسية، شوكولاتة بلجيكية 70%، كريمة طبيعية..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            {/* Product Type (Donut vs Drink) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                نوع المنتج *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct({ ...editingProduct, productType: 'DONUT' })}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    editingProduct.productType !== 'DRINK'
                      ? 'bg-pink-600 text-white border-pink-500 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>🍩 دونتس فاخرة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct({ ...editingProduct, productType: 'DRINK' })}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                    editingProduct.productType === 'DRINK'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>☕ مشروبات وقهوة</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                وصف المنتج
              </label>
              <textarea
                rows={2}
                value={editingProduct.descAr || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, descAr: e.target.value })}
                placeholder="صف طعم ومميزات المنتج للعملاء..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            {/* Customization Groups Assignment */}
            {customizationGroups.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="block text-[10px] font-black text-cyan-400 uppercase">
                  ربط مجموعات التخصيص والإضافات بهذا المنتج:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customizationGroups.map((grp) => {
                    const currentIds: string[] = editingProduct.customizationGroupIds || [];
                    const isChecked = grp.assignedToAll || currentIds.includes(grp.id);
                    return (
                      <label
                        key={grp.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={grp.assignedToAll}
                          checked={isChecked}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...currentIds, grp.id]
                              : currentIds.filter((id) => id !== grp.id);
                            setEditingProduct({ ...editingProduct, customizationGroupIds: updated });
                          }}
                          className="rounded text-cyan-600"
                        />
                        <span className="font-bold truncate">{grp.nameAr}</span>
                        {grp.assignedToAll && (
                          <span className="text-[9px] text-slate-500 mr-auto">(مطبق على الكل)</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Availability & Publishing Toggles */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.isPublished || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isPublished: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <span className="text-xs text-slate-300 font-bold">نشر المنتج في المتجر للزبائن</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.isAvailable !== false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <span className="text-xs text-slate-300 font-bold">متوفر للطلب (غير نافد)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-gradient-to-l from-pink-600 to-cyan-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                {t.saveChanges}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleSaveCategory}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4"
          >
            <h3 className="font-bold text-white text-sm">إضافة تصنيف دونتس جديد</h3>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">اسم التصنيف بالعربية *</label>
              <input
                type="text"
                required
                value={newCatNameAr}
                onChange={(e) => setNewCatNameAr(e.target.value)}
                placeholder="مثال: دونتس كلاسيك، بوكسات، محشوة"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">الاسم بالإنجليزية</label>
              <input
                type="text"
                value={newCatNameEn}
                onChange={(e) => setNewCatNameEn(e.target.value)}
                placeholder="e.g. Classic, Stuffed, Party Boxes"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold cursor-pointer"
              >
                حفظ التصنيف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Delivery Location Modal */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <form
            onSubmit={handleSaveLocation}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="font-bold text-white text-sm">
              {isNewLocation ? 'إضافة منطقة توصيل مصرية جديدة' : 'تعديل رسوم ومنطقة التوصيل'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">المحافظة *</label>
                <input
                  type="text"
                  required
                  value={editingLocation.governorate || ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, governorate: e.target.value })}
                  placeholder="مثال: القاهرة أو الجيزة"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">المدينة / المركز *</label>
                <input
                  type="text"
                  required
                  value={editingLocation.city || ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, city: e.target.value })}
                  placeholder="مثال: القاهرة الجديدة أو الشيخ زايد"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">المنطقة / الحي المحدد *</label>
              <input
                type="text"
                required
                value={editingLocation.area || ''}
                onChange={(e) => setEditingLocation({ ...editingLocation, area: e.target.value })}
                placeholder="مثال: التجمع الخامس، المعادي، الدقي، الرحاب..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">رسوم التوصيل (ج.م.) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={editingLocation.deliveryFee !== undefined && editingLocation.deliveryFee !== null ? editingLocation.deliveryFee : ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, deliveryFee: e.target.value.replace(/[^0-9.]/g, '') as any })}
                  placeholder="مثال: 45"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">الحد الأدنى (ج.م.)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingLocation.minOrder !== undefined && editingLocation.minOrder !== null ? editingLocation.minOrder : ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, minOrder: e.target.value.replace(/[^0-9.]/g, '') as any })}
                  placeholder="مثال: 100"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">الوقت المتوقع (دقيقة)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editingLocation.estimatedMin !== undefined && editingLocation.estimatedMin !== null ? editingLocation.estimatedMin : ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, estimatedMin: e.target.value.replace(/[^0-9]/g, '') as any })}
                  placeholder="مثال: 40"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingLocation.isActive !== false}
                onChange={(e) => setEditingLocation({ ...editingLocation, isActive: e.target.checked })}
                className="rounded text-pink-600"
              />
              <span className="text-xs text-slate-300 font-bold">المنطقة متاحة لاستقبال طلبات الزبائن</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingLocation(null)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-600 text-white text-xs font-bold cursor-pointer"
              >
                حفظ المنطقة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3.5 Customization Group Add/Edit Modal (Builder) */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleSaveGroup}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>{isNewGroup ? 'إنشاء مجموعة تخصيص جديدة' : 'تعديل مجموعة التخصيص'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Names in Arabic & English */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  اسم المجموعة بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={editingGroup.nameAr || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, nameAr: e.target.value })}
                  placeholder="مثال: اختيار الحجم، صوص إضافي، نوع الحليب"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  الاسم بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={editingGroup.nameEn || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, nameEn: e.target.value })}
                  placeholder="e.g. Size, Extra Topping, Milk Type"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                وصف توضيحي للعملاء (اختياري)
              </label>
              <input
                type="text"
                value={editingGroup.descriptionAr || ''}
                onChange={(e) => setEditingGroup({ ...editingGroup, descriptionAr: e.target.value })}
                placeholder="مثال: اختر حجماً واحداً مناسباً لك..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            {/* Field Type Selection (6 Types) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  نوع الحقل *
                </label>
                <select
                  value={editingGroup.type || 'SINGLE_SELECT'}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, type: e.target.value as CustomizationFieldType })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold"
                >
                  <option value="SINGLE_SELECT">اختيار فردي (Single Choice / Radio)</option>
                  <option value="MULTI_SELECT">اختيارات متعددة (Multi Select / Checkboxes)</option>
                  <option value="DROPDOWN">قائمة منسدلة (Dropdown List)</option>
                  <option value="TEXT">حقل نصي قصير (Short Text)</option>
                  <option value="TEXTAREA">حقل نصي تفصيلي / كتابة على العلبة (Textarea)</option>
                  <option value="NUMBER">عداد أرقام / كميات إضافية (Number Counter)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  ترتيب العرض
                </label>
                <input
                  type="number"
                  value={editingGroup.displayOrder || 1}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, displayOrder: parseInt(e.target.value, 10) })
                  }
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Requirements & Selection Limits */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingGroup.isRequired || false}
                    onChange={(e) => setEditingGroup({ ...editingGroup, isRequired: e.target.checked })}
                    className="rounded text-pink-600"
                  />
                  <span className="text-xs text-slate-300 font-bold">حقل إلزامي (يجب على العميل الاختيار للمتابعة)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingGroup.isActive !== false}
                    onChange={(e) => setEditingGroup({ ...editingGroup, isActive: e.target.checked })}
                    className="rounded text-pink-600"
                  />
                  <span className="text-xs text-slate-300 font-bold">المجموعة نشطة ومفعلة</span>
                </label>
              </div>

              {editingGroup.type === 'MULTI_SELECT' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      الحد الأدنى للاختيارات
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editingGroup.minSelections || 0}
                      onChange={(e) =>
                        setEditingGroup({ ...editingGroup, minSelections: parseInt(e.target.value, 10) })
                      }
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      الحد الأقصى للاختيارات
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingGroup.maxSelections || 3}
                      onChange={(e) =>
                        setEditingGroup({ ...editingGroup, maxSelections: parseInt(e.target.value, 10) })
                      }
                      className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Scope / Assignment */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingGroup.assignedToAll !== false}
                  onChange={(e) => setEditingGroup({ ...editingGroup, assignedToAll: e.target.checked })}
                  className="rounded text-cyan-600"
                />
                <span className="text-xs text-cyan-300 font-bold">
                  تطبيق هذه المجموعة تلقائياً على جميع المنتجات (Donuts & Drinks)
                </span>
              </label>

              {!editingGroup.assignedToAll && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    أو حدد منتجات معينة:
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {adminProducts.map((p) => {
                      const cur = editingGroup.assignedProductIds || [];
                      const isSel = cur.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...cur, p.id]
                                : cur.filter((id) => id !== p.id);
                              setEditingGroup({ ...editingGroup, assignedProductIds: next });
                            }}
                            className="rounded text-pink-600"
                          />
                          <span>{p.nameAr}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Options Builder (For Choice Types) */}
            {(editingGroup.type === 'SINGLE_SELECT' ||
              editingGroup.type === 'MULTI_SELECT' ||
              editingGroup.type === 'DROPDOWN') && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    <span>قائمة الخيارات المتاحة</span>
                    <span className="text-slate-500 font-normal">({groupOptions.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupOptions([
                        ...groupOptions,
                        {
                          id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          nameAr: '',
                          nameEn: '',
                          priceDelta: 0,
                          isAvailable: true,
                        },
                      ]);
                    }}
                    className="px-3 py-1 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    + إضافة خيار
                  </button>
                </div>

                <div className="space-y-2">
                  {groupOptions.map((opt, optIdx) => (
                    <div
                      key={opt.id || optIdx}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs"
                    >
                      <input
                        type="text"
                        required
                        placeholder="اسم الخيار (عربي) *"
                        value={opt.nameAr}
                        onChange={(e) => {
                          const updated = [...groupOptions];
                          updated[optIdx].nameAr = e.target.value;
                          setGroupOptions(updated);
                        }}
                        className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="English (optional)"
                        value={opt.nameEn || ''}
                        onChange={(e) => {
                          const updated = [...groupOptions];
                          updated[optIdx].nameEn = e.target.value;
                          setGroupOptions(updated);
                        }}
                        className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                      <div className="w-28 flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">+</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={opt.priceDelta !== undefined && opt.priceDelta !== null ? opt.priceDelta : ''}
                          onChange={(e) => {
                            const updated = [...groupOptions];
                            updated[optIdx].priceDelta = e.target.value.replace(/[^0-9.]/g, '') as any;
                            setGroupOptions(updated);
                          }}
                          className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-pink-400 font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400">ج.م.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setGroupOptions(groupOptions.filter((_, i) => i !== optIdx));
                        }}
                        className="p-2 text-slate-500 hover:text-red-400 cursor-pointer"
                        title="حذف الخيار"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-pink-600 to-cyan-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                {loading ? 'جاري الحفظ...' : 'حفظ مجموعة التخصيص'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Order Action Modal (Cancellation or NOT_RECEIVED) */}
      {orderActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white text-sm">
              {orderActionModal.type === 'NOT_RECEIVED'
                ? 'تسجيل عدم استلام الطلب (فشل التوصيل)'
                : 'الاعتذار عن الطلب / إلغاء'}
            </h3>
            <p className="text-xs text-slate-400">
              {orderActionModal.type === 'NOT_RECEIVED'
                ? 'سيتم تسجيل هذا الإجراء في سجل نشاط العميل وتوثيق سبب فشل التسليم.'
                : 'يرجى تحديد سبب الإلغاء ليتم إرساله في سجل حالة الطلب.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">السبب / التوضيح:</label>
              <select
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white mb-2"
              >
                {orderActionModal.type === 'NOT_RECEIVED' ? (
                  <>
                    <option value="لم يرد العميل على اتصالات المندوب المتكررة">لم يرد العميل على اتصالات المندوب المتكررة</option>
                    <option value="رفض العميل الاستلام ودفع المبلغ عند وصول المندوب">رفض العميل الاستلام ودفع المبلغ عند وصول المندوب</option>
                    <option value="العنوان المذكور غير صحيح أو خارج نطاق التغطية">العنوان المذكور غير صحيح أو خارج نطاق التغطية</option>
                    <option value="هاتف العميل مغلق طوال فترة التوصيل">هاتف العميل مغلق طوال فترة التوصيل</option>
                  </>
                ) : (
                  <>
                    <option value="نفدت الكمية المطلوبة حالياً في المطبخ">نفدت الكمية المطلوبة حالياً في المطبخ</option>
                    <option value="ضغط طلبات كثيف وغير قادرين على التوصيل في الوقت المحدد">ضغط طلبات كثيف وغير قادرين على التوصيل في الوقت المحدد</option>
                    <option value="عنوان التوصيل خارج نطاق تغطية المندوبين حالياً">عنوان التوصيل خارج نطاق تغطية المندوبين حالياً</option>
                    <option value="بناء على رغبة العميل">بناءً على رغبة العميل عبر الهاتف</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderActionModal(null)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (orderActionModal.type === 'NOT_RECEIVED') {
                    handleUpdateOrderStatus(orderActionModal.orderId, 'NOT_RECEIVED', actionReason);
                  } else {
                    handleUpdateOrderStatus(orderActionModal.orderId, 'CANCELLED', actionReason);
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                تأكيد الإجراء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Customer Blocking Modal */}
      {blockingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleBlockCustomerSubmit}
            className="bg-slate-900 border border-red-900/60 rounded-3xl p-6 max-w-md w-full space-y-4"
          >
            <div className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-white text-base">
                حظر العميل: {blockingCustomer.name}
              </h3>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-2xl text-xs text-red-300">
              <p className="font-bold mb-1">تحذير أمني إداري:</p>
              <p className="text-[11px] leading-relaxed">
                سيتم حظر حساب هذا العميل ورقم هاتفه <b>({blockingCustomer.phone})</b> على مستوى الخادم (Server-Side). ولن يتمكن من إنشاء أو إتمام أي طلبات جديدة حتى لو حاول التسجيل بحساب جديد بنفس الرقم.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">نوع الحظر:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBlockType('PERMANENT')}
                  className={`p-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    blockType === 'PERMANENT'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  حظر دائم نهائي
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('TEMPORARY')}
                  className={`p-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    blockType === 'TEMPORARY'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  حظر مؤقت بأيام
                </button>
              </div>
            </div>

            {blockType === 'TEMPORARY' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">مدة الحظر المؤقت:</label>
                <select
                  value={blockDurationDays}
                  onChange={(e) => setBlockDurationDays(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="7">7 أيام (أسبوع)</option>
                  <option value="14">14 يوم (أسبوعين)</option>
                  <option value="30">30 يوم (شهر)</option>
                  <option value="90">90 يوم (3 أشهر)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">سبب الحظر (للتوثيق الإداري): *</label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white mb-2"
              >
                <option value="تكرار عدم استلام الطلبات عند وصول المندوب">تكرار عدم استلام الطلبات عند وصول المندوب</option>
                <option value="تقديم عناوين وهمية أو غير دقيقة">تقديم عناوين وهمية أو غير دقيقة</option>
                <option value="سوء المعاملة أو الإساءة لمندوب التوصيل">سوء المعاملة أو الإساءة لمندوب التوصيل</option>
                <option value="طلبات وهمية متكررة">طلبات وهمية متكررة</option>
              </select>
              <input
                type="text"
                placeholder="أو اكتب سبباً مخصصاً..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBlockingCustomer(null)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                تأكيد فرض الحظر
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Customer Details & Notes Modal */}
      {selectedCustomerForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{selectedCustomerForNotes.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedCustomerForNotes.phone} · {selectedCustomerForNotes.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForNotes(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500">الطلبات المكتملة</span>
                <p className="font-bold text-pink-400 text-sm">{selectedCustomerForNotes.totalOrders || 0}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500">فشل الاستلام</span>
                <p className="font-bold text-red-400 text-sm">{selectedCustomerForNotes.failedDeliveriesCount || 0}</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500">حالة الحساب</span>
                <p className={`font-bold text-[11px] ${selectedCustomerForNotes.block?.isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
                  {selectedCustomerForNotes.block?.isBlocked ? 'محظور' : 'نشط'}
                </p>
              </div>
            </div>

            {/* If blocked, show block details */}
            {selectedCustomerForNotes.block?.isBlocked && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-2xl text-xs text-red-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span>معلومات الحظر الحالية:</span>
                </p>
                <p>السبب: {selectedCustomerForNotes.block.reason}</p>
                <p>نوع الحظر: {selectedCustomerForNotes.block.type === 'TEMPORARY' ? 'مؤقت' : 'دائم'}</p>
                {selectedCustomerForNotes.block.expiresAt && (
                  <p>تاريخ الانتهاء: {new Date(selectedCustomerForNotes.block.expiresAt).toLocaleDateString()}</p>
                )}
                <p>تم الحظر بواسطة: {selectedCustomerForNotes.block.blockedBy}</p>
              </div>
            )}

            {/* Add internal administrative note */}
            <form onSubmit={handleAddCustomerNote} className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-cyan-400">
                + إضافة ملاحظة إدارية داخلية جديدة
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="مثال: يفضل الاتصال بالواتساب قبل الوصول، دقيق في المواعيد..."
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  إضافة
                </button>
              </div>
            </form>

            {/* Existing notes list */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-300">سجل الملاحظات السابقة:</span>
              {!selectedCustomerForNotes.notes || selectedCustomerForNotes.notes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">لا توجد ملاحظات إدارية مدونة على هذا العميل حتى الآن.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCustomerForNotes.notes.map((n) => (
                    <div key={n.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <p className="text-slate-200 font-medium">{n.text}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>كتبها: {n.createdBy}</span>
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Admin Add / Edit Modal (Owner Only) */}
      {showAdminModal && isOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleSaveAdmin}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {editingAdmin ? `تعديل صلاحيات المشرف (${editingAdmin.name})` : 'إنشاء وتعيين مشرف جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">اسم المشرف *</label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="مثال: مروان خالد (مدير تشغيل)"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            {!editingAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">البريد الإلكتروني للدخول *</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@wavedonuts.eg"
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-sans"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">رقم الهاتف *</label>
              <input
                type="tel"
                required
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                {editingAdmin ? 'تغيير كلمة المرور (اتركها فارغة إذا لم ترغب بالتغيير)' : 'كلمة المرور *'}
              </label>
              <input
                type="password"
                required={!editingAdmin}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            {/* Granular Permissions Checkboxes */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="block text-xs font-black text-amber-400 uppercase">
                الصلاحيات المخصصة لهذا المشرف:
              </span>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermissions.canManageProducts}
                  onChange={(e) => setAdminPermissions({ ...adminPermissions, canManageProducts: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <span className="text-xs text-slate-300 font-bold">إدارة منتجات الدونتس والصور والتصنيفات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermissions.canManageOffers}
                  onChange={(e) => setAdminPermissions({ ...adminPermissions, canManageOffers: e.target.checked })}
                  className="rounded text-amber-500"
                />
                <span className="text-xs text-slate-300 font-bold">إدارة العروض الخاصة والبوكسات التوفيرية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermissions.canManageAdvertisements}
                  onChange={(e) => setAdminPermissions({ ...adminPermissions, canManageAdvertisements: e.target.checked })}
                  className="rounded text-pink-500"
                />
                <span className="text-xs text-slate-300 font-bold">إدارة الإعلانات، البانرات والنوافذ المنبثقة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermissions.canManageOrders}
                  onChange={(e) => setAdminPermissions({ ...adminPermissions, canManageOrders: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <span className="text-xs text-slate-300 font-bold">إدارة الطلبات المباشرة وقبولها وتحديث حالتها</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermissions.canManageDelivery}
                  onChange={(e) => setAdminPermissions({ ...adminPermissions, canManageDelivery: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <span className="text-xs text-slate-300 font-bold">إدارة مناطق ورسوم التوصيل والحدود الدنيا</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermissions.canManageCustomers}
                  onChange={(e) => setAdminPermissions({ ...adminPermissions, canManageCustomers: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <span className="text-xs text-slate-300 font-bold">إدارة وسجل العملاء والحظر وتدوين الملاحظات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminPermissions.canManageSettings}
                  onChange={(e) => setAdminPermissions({ ...adminPermissions, canManageSettings: e.target.checked })}
                  className="rounded text-pink-600"
                />
                <span className="text-xs text-slate-300 font-bold">إعدادات المتجر وبيانات التواصل والإعلانات</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-gradient-to-l from-pink-600 to-cyan-600 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                حفظ بيانات المشرف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. Individual Customer Profile Modal (Complete Addresses, Orders History, Notes & Actions) */}
      {selectedCustomerProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 font-[Cairo]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-cyan-500 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                  {selectedCustomerProfile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{selectedCustomerProfile.name}</h3>
                    {selectedCustomerProfile.block?.isBlocked ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-bold text-[10px]">
                        محظور
                      </span>
                    ) : selectedCustomerProfile.isActive === false ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-[10px]">
                        حساب معطل
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-[10px]">
                        حساب نشط
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <a
                      href={`https://wa.me/${selectedCustomerProfile.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedCustomerProfile.phone}</span>
                    </a>
                    <span>·</span>
                    <span className="text-slate-400 font-sans">{selectedCustomerProfile.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Back to Customers button */}
                <button
                  type="button"
                  onClick={() => setSelectedCustomerProfile(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="العودة لقائمة العملاء"
                >
                  <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                  <span>العودة لقائمة العملاء</span>
                </button>

                {/* Deactivate / Reactivate button */}
                <button
                  type="button"
                  onClick={() => handleToggleCustomerActive(selectedCustomerProfile)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    selectedCustomerProfile.isActive === false
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {selectedCustomerProfile.isActive === false ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>تفعيل الحساب</span>
                    </>
                  ) : (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>تعطيل الحساب</span>
                    </>
                  )}
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCustomerClick(selectedCustomerProfile)}
                  className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="حذف حساب العميل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف العميل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCustomerProfile(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  title="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي الطلبات</span>
                  <p className="font-black text-pink-400 text-xl tabular-nums">
                    {selectedCustomerProfile.totalOrders || 0}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي المشتريات (ج.م.)</span>
                  <p className="font-black text-cyan-400 text-xl tabular-nums">
                    {selectedCustomerProfile.totalPurchaseValue || 0}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">آخر طلب مسجل</span>
                  <p className="font-bold text-slate-200 text-xs mt-1">
                    {selectedCustomerProfile.lastOrderDate
                      ? new Date(selectedCustomerProfile.lastOrderDate).toLocaleDateString('ar-EG')
                      : 'لا يوجد بعد'}
                  </p>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">تاريخ التسجيل</span>
                  <p className="font-bold text-slate-200 text-xs mt-1">
                    {selectedCustomerProfile.createdAt
                      ? new Date(selectedCustomerProfile.createdAt).toLocaleDateString('ar-EG')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Section 1: Saved Delivery Addresses (Egyptian format) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>عناوين التوصيل المحفوظة ({selectedCustomerProfile.addresses?.length || 0})</span>
                </h4>

                {!selectedCustomerProfile.addresses || selectedCustomerProfile.addresses.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                    لا توجد عناوين توصيل محفوظة لهذا العميل حتى الآن.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCustomerProfile.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{addr.title}</span>
                          <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded-md font-semibold">
                            {addr.governorate} - {addr.city} ({addr.area})
                          </span>
                        </div>
                        <p className="text-slate-300">
                          شارع {addr.street} · عمارة {addr.buildingNumber}
                          {addr.floor ? ` · طابق ${addr.floor}` : ''}
                          {addr.apartment ? ` · شقة ${addr.apartment}` : ''}
                        </p>
                        {addr.landmark && (
                          <p className="text-[11px] text-slate-500">علامة مميزة: {addr.landmark}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Complete Order History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-pink-400" />
                  <span>سجل الطلبات الكامل ({selectedCustomerProfile.orders?.length || 0})</span>
                </h4>

                {!selectedCustomerProfile.orders || selectedCustomerProfile.orders.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                    لم يقم هذا العميل بإنشاء أي طلبات حتى الآن.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">رقم الطلب</th>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">الأصناف</th>
                          <th className="p-3 text-center">الحالة</th>
                          <th className="p-3 text-left">الإجمالي (ج.م.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {selectedCustomerProfile.orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-900/60">
                            <td className="p-3 font-mono font-bold text-pink-400">
                              #{ord.orderNumber}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {new Date(ord.createdAt).toLocaleDateString('ar-EG', {
                                dateStyle: 'short',
                              })}
                            </td>
                            <td className="p-3 text-slate-200">
                              <span className="font-semibold">{ord.items.length} أصناف</span>
                              <div className="text-[10px] text-slate-500 truncate max-w-xs">
                                {ord.items.map((it) => `${it.quantity}x ${it.productNameAr}`).join('، ')}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ord.status === 'DELIVERED'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : ord.status === 'CANCELLED'
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                }`}
                              >
                                {ord.status === 'DELIVERED'
                                  ? 'تم التوصيل'
                                  : ord.status === 'CANCELLED'
                                  ? 'ملغي'
                                  : ord.status === 'NOT_RECEIVED'
                                  ? 'لم يستلم'
                                  : 'جاري'}
                              </span>
                            </td>
                            <td className="p-3 text-left font-black text-white tabular-nums">
                              {ord.total} ج.م.
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 3: Private Administrative Notes (never visible to customer) */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>ملاحظات إدارية سرية خاصة (لا تظهر للعميل مطلقاً)</span>
                </h4>

                <form onSubmit={handleAddCustomerNoteFromProfile} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="اكتب ملاحظة داخلية (مثال: يفضل الاتصال قبل التوصيل، عميل مميز...)"
                    className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newNoteText.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    حفظ الملاحظة
                  </button>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {!selectedCustomerProfile.notes || selectedCustomerProfile.notes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-2">لا توجد ملاحظات إدارية مدونة بعد.</p>
                  ) : (
                    selectedCustomerProfile.notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="text-slate-200 font-medium">{n.text}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                            <span>كتبها: {n.createdBy}</span>
                            <span>·</span>
                            <span>{new Date(n.createdAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomerNoteFromProfile(n.id)}
                          className="text-slate-500 hover:text-red-400 p-1.5 transition cursor-pointer"
                          title="حذف الملاحظة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer with visible Back to Customers button */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedCustomerProfile(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-slate-700 shadow-xs"
              >
                <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                <span>العودة لقائمة العملاء (Back to Customers)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomerProfile(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium cursor-pointer transition border border-slate-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Delete Customer Confirmation Dialog (Safe Deletion with Order Preservation) */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-900/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl font-[Cairo]">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-950 border border-red-900/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">تأكيد حذف حساب العميل</h3>
                <p className="text-xs text-slate-400 font-mono">{customerToDelete.name}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-900/60 space-y-2 text-xs">
              <p className="font-bold text-red-300">تنبيه أمني ومحاسبي هام:</p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                سيتم حذف حساب العميل وبيانات تسجيل دخوله وعناوينه نهائياً.
              </p>
              <p className="text-emerald-400 font-semibold leading-relaxed text-[11px]">
                ✓ لضمان سلامة المحاسبة والمبيعات: سيتم الاحتفاظ بكافة سجلات الطلبات والمبيعات التاريخية لهذا العميل في قاعدة البيانات بالكامل دون أي مساس بها أو تأثير على إحصائيات الأرباح.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmDeleteCustomer}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{loading ? 'جاري الحذف...' : 'تأكيد حذف الحساب نهائياً'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. General In-App Action / Delete Confirmation Dialog (safe in all browser environments and iframes) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl font-[Cairo]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-950/60 border border-pink-800/60 flex items-center justify-center shrink-0 text-pink-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{confirmModal.title}</h3>
                {confirmModal.itemName && (
                  <p className="text-xs text-slate-400 font-mono">{confirmModal.itemName}</p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {confirmModal.message || confirmModal.warningText || 'هل أنت متأكد من تنفيذ هذا الإجراء؟'}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  const onConf = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await onConf();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                {confirmModal.confirmButtonText || (lang === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounting Modal: Close Month & Archive */}
      {showCloseMonthModal && accountingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleCloseMonth}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Archive className="w-5 h-5" />
                <h3 className="font-black text-white text-base">
                  {lang === 'ar' ? 'إغلاق وأرشفة الشهر المحاسبي' : 'Close & Archive Accounting Month'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseMonthModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 space-y-2">
              <p className="font-bold">
                أنت على وشك إغلاق الفترة المحاسبية لشهر: {selectedMonthKey} ({accountingReport.summary.monthNameAr})
              </p>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                سيتم أرشفة الإحصائيات والمبالغ المالية رسمياً. تبقى كافة سجلات الطلبات التاريخية والعملاء محفوظة بأمان تام في قاعدة البيانات دون أي حذف.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">إجمالي المبيعات المحصلة</span>
                <span className="font-black text-emerald-400 text-sm">
                  {accountingReport.summary.collectedAmount.toFixed(2)} ج.م.
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">الطلبات المسلمة كاش</span>
                <span className="font-black text-white text-sm">
                  {accountingReport.summary.deliveredOrders} طلب
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">مبيعات جارية مع المناديب</span>
                <span className="font-black text-amber-400 text-sm">
                  {accountingReport.summary.unpaidAmount.toFixed(2)} ج.م.
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">طلبات ملغاة أو مرفوضة</span>
                <span className="font-black text-red-400 text-sm">
                  {accountingReport.summary.cancelledAmount.toFixed(2)} ج.م.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {lang === 'ar' ? 'ملاحظات وتدقيق الإغلاق المحاسبي (اختياري):' : 'Closing Notes (Optional):'}
              </label>
              <textarea
                rows={3}
                value={closeMonthNotes}
                onChange={(e) => setCloseMonthNotes(e.target.value)}
                placeholder="مثال: تمت مطابقة نقدية المناديب المستلمة ومراجعة جميع فواتير الدفع عند الاستلام."
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCloseMonthModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={closingOrStartingPeriod}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                <span>{closingOrStartingPeriod ? 'جاري الأرشفة...' : 'تأكيد إغلاق الشهر وأرشفته'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounting Modal: Start New Period */}
      {showNewPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <form
            onSubmit={handleStartNewPeriod}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <FolderPlus className="w-5 h-5" />
                <h3 className="font-black text-white text-base">
                  {lang === 'ar' ? 'بدء فترة محاسبية جديدة' : 'Start New Accounting Period'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200 space-y-1">
              <p className="font-bold">فترة تشغيلية جديدة لمتجر ويف دونتس مصر</p>
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                بدء فترة جديدة يحدد الشهر النشط لتسجيل ومتابعة العمليات الجديدة دون المساس بأي من طلبات أو أرصدة الشهور السابقة.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {lang === 'ar' ? 'رمز الشهر الجديد (صيغة YYYY-MM):' : 'New Month Key (YYYY-MM):'}
              </label>
              <input
                type="text"
                required
                value={newPeriodMonthInput}
                onChange={(e) => setNewPeriodMonthInput(e.target.value)}
                placeholder="2026-12"
                pattern="^\d{4}-\d{2}$"
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {lang === 'ar' ? 'ملاحظات افتتاح الفترة (اختياري):' : 'Opening Notes (Optional):'}
              </label>
              <textarea
                rows={2}
                value={newPeriodNotes}
                onChange={(e) => setNewPeriodNotes(e.target.value)}
                placeholder="مثال: بدء العمليات التشغيلية والمبيعات للشهر الجديد."
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewPeriodModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={closingOrStartingPeriod || !newPeriodMonthInput}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                <span>{closingOrStartingPeriod ? 'جاري البدء...' : 'بدء الفترة وتفعيلها'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Notifications (Success / Error) */}
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-950/95 border border-red-500/50 text-red-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-xs font-bold">{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
