export interface AdminPermissions {
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageDelivery: boolean;
  canManageSettings: boolean;
  canManageCustomers: boolean;
  canManageOffers?: boolean;
  canManageAdvertisements?: boolean;
}

export interface CustomerBlock {
  isBlocked: boolean;
  type?: 'TEMPORARY' | 'PERMANENT';
  reason?: string;
  blockedAt?: string;
  blockedBy?: string;
  expiresAt?: string;
}

export interface CustomerNote {
  id: string;
  text: string;
  createdBy: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
  permissions?: AdminPermissions;
  isActive?: boolean;
  block?: CustomerBlock;
  notes?: CustomerNote[];
  failedDeliveriesCount?: number;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string | null;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  performedById: string;
  performedByName: string;
  performedByRole: 'OWNER' | 'ADMIN';
  action: string;
  details?: string;
  timestamp: string;
}

export interface Address {
  id: string;
  userId: string;
  title: string; // e.g. "المنزل", "العمل"
  governorate: string; // المحافظة
  city: string; // المدينة / المركز
  area: string; // المنطقة / الحي
  street: string; // اسم الشارع
  buildingNumber: string; // رقم العقار / العمارة
  floor?: string; // الطابق
  apartment?: string; // رقم الشقة
  landmark?: string; // علامة مميزة
  deliveryLocationId: string; // link to DeliveryLocation
  isDefault: boolean;
  createdAt: string;
}

export interface DeliveryLocation {
  id: string;
  governorate: string; // المحافظة
  city: string; // المدينة
  area: string; // المنطقة / الحي
  deliveryFee: number; // بالجنيه المصري (EGP)
  minOrder: number; // بالجنيه المصري (EGP)
  estimatedMin: number; // الوقت المتوقع بالدقائق
  isActive: boolean;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  categoryType?: 'DONUT' | 'DRINK' | 'GENERAL';
}

export type CustomizationFieldType =
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'DROPDOWN'
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER';

export interface CustomizationOption {
  id: string;
  nameAr: string;
  nameEn: string;
  priceDelta: number; // بالجنيه المصري (EGP)
  isAvailable?: boolean;
}

export interface CustomizationGroup {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  type: CustomizationFieldType;
  isRequired: boolean;
  minSelections?: number;
  maxSelections?: number;
  options: CustomizationOption[];
  displayOrder: number;
  isActive: boolean;
  assignedToAll: boolean;
  assignedProductIds: string[];
  assignedCategoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SelectedCustomizationItem {
  groupId: string;
  groupNameAr: string;
  groupNameEn: string;
  groupName?: string;
  type: CustomizationFieldType;
  optionId?: string;
  optionNameAr?: string;
  optionNameEn?: string;
  optionName?: string;
  priceDelta: number;
  textValue?: string;
  numberValue?: number;
}

export interface ProductOption {
  id: string;
  nameAr: string;
  nameEn: string;
  priceDelta: number; // بالجنيه المصري
}

export interface DonutProduct {
  id: string;
  categoryId: string;
  productType?: 'DONUT' | 'DRINK';
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  ingredients: string; // قائمة المكونات
  images: string[]; // صور مرفوعة من الجهاز
  mainImage: string; // الصورة الرئيسية
  basePrice: number; // السعر بالجنيه المصري (EGP)
  isPublished: boolean; // منشور في المتجر أم مسودة
  isAvailable: boolean; // متوفر للطلب أم نفدت الكمية
  inventoryCount?: number;
  options?: ProductOption[];
  customizationGroupIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'NOT_RECEIVED';

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  imageUrl: string;
  quantity: number;
  basePrice?: number;
  unitPrice: number; // بالجنيه المصري
  selectedOption?: string;
  selectedProductOptions?: ProductOption[];
  selectedCustomizations?: SelectedCustomizationItem[];
  customNotes?: string;
  product?: DonutProduct;
  isOffer?: boolean;
  offerId?: string;
  offerItemsSummary?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressId: string;
  addressDetails: {
    title: string;
    governorate: string;
    city: string;
    area: string;
    street: string;
    buildingNumber: string;
    floor?: string;
    apartment?: string;
    landmark?: string;
  };
  deliveryLocationId: string;
  locationSummary: string; // e.g. "القاهرة - التجمع الخامس"
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  subtotal: number; // بالجنيه المصري
  deliveryFee: number; // بالجنيه المصري
  total: number; // بالجنيه المصري
  notes?: string;
  cancellationReason?: string;
  paymentMethod: 'COD'; // الدفع عند الاستلام كاش
  customerDeleted?: boolean; // هل تم حذف حساب العميل مع بقاء سجل الطلب محفوظاً
  needsAdminReview?: boolean; // للطلبات المعلقة أو الغامضة
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CustomerDetailProfile extends UserProfile {
  addresses: Address[];
  orders: Order[];
  totalPurchaseValue: number;
}

export interface CartItem {
  productId: string;
  product: DonutProduct;
  quantity: number;
  selectedOption?: string;
  selectedProductOptions?: ProductOption[];
  selectedCustomizations?: SelectedCustomizationItem[];
  customNotes?: string;
  unitPrice: number; // بالجنيه المصري
  isOffer?: boolean;
  offerId?: string;
  offerDetails?: SpecialOffer;
  offerItemsSummary?: string;
}

export interface StoreSettings {
  businessNameAr: string;
  businessNameEn: string;
  sloganAr: string;
  sloganEn: string;
  phone: string;
  whatsapp: string;
  aboutAr: string;
  aboutEn: string;
  announcementAr: string;
  announcementEn: string;
  showAnnouncement: boolean;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  workingHoursAr: string;
  workingHoursEn: string;
  isOpenForOrders: boolean;
}

export interface MonthlyAccountingSummary {
  monthKey: string; // e.g. "2026-11"
  monthNameAr: string; // "نوفمبر 2026"
  monthNameEn: string; // "November 2026"
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  unpaidOrders: number;
  totalSales: number; // Gross sales from delivered orders (EGP)
  grossSales: number; // Total value of all orders in period (EGP)
  collectedAmount: number; // Cash actually collected upon delivery (EGP)
  unpaidAmount: number; // Pending / in-transit orders COD value (EGP)
  cancelledAmount: number; // Total value of cancelled / not-received orders (EGP)
  deliveryFeesCollected: number; // Delivery fees collected (EGP)
  productsSalesTotal: number; // Products net sales excluding delivery fees (EGP)
  averageOrderValue: number;
  isClosed: boolean;
  closedAt?: string;
  closedById?: string;
  closedByName?: string;
  closingNotes?: string;
}

export interface MonthlyAccountingReport {
  summary: MonthlyAccountingSummary;
  orders: Order[];
  isClosed?: boolean;
  archiveRecord?: MonthlyArchiveRecord;
  statusBreakdown: Record<string, { count: number; totalAmount: number }>;
  topProducts: Array<{
    productId: string;
    nameAr: string;
    nameEn: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface MonthlyArchiveRecord {
  id: string; // "mclose_YYYY_MM"
  monthKey: string; // "2026-11"
  closedAt: string;
  closedById: string;
  closedByName: string;
  closingNotes?: string;
  summary: MonthlyAccountingSummary;
}

export interface SpecialOfferItem {
  productId: string;
  productNameAr: string;
  productNameEn?: string;
  quantity: number;
  productType?: 'DONUT' | 'DRINK';
  basePrice?: number;
}

export interface SpecialOffer {
  id: string; // "off_..."
  nameAr: string;
  nameEn?: string;
  descAr: string;
  descEn?: string;
  imageUrl: string;
  price: number; // السعر بالجنيه المصري (EGP)
  originalPrice?: number; // إجمالي القيمة الأصلية للقطع المضمنة
  items: SpecialOfferItem[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export type AdPlacement = 'TOP_HERO' | 'BETWEEN_SECTIONS' | 'POPUP_MODAL' | 'FOOTER_BANNER';

export interface Advertisement {
  id: string; // "ad_..."
  titleAr: string;
  titleEn?: string;
  descAr?: string;
  descEn?: string;
  images: string[];
  mainImage: string;
  placement: AdPlacement;
  linkUrl?: string;
  buttonTextAr?: string;
  buttonTextEn?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
