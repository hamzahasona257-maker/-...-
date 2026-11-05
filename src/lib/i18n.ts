export type Language = 'ar' | 'en';

export interface Translations {
  brand: string;
  slogan: string;
  currency: string;
  orderNow: string;
  trackOrder: string;
  tracking: string;
  ourMenu: string;
  allDonuts: string;
  emptyStoreTitle: string;
  emptyStoreMessage: string;
  emptyCategoryMessage: string;
  customizationTitle: string;
  ingredientsTitle: string;
  optionsTitle: string;
  cart: string;
  emptyCart: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  checkout: string;
  placeOrder: string;
  cod: string;
  codNotice: string;
  selectAddress: string;
  addNewAddress: string;
  addressTitle: string;
  governorate: string;
  city: string;
  area: string;
  street: string;
  buildingNumber: string;
  floor: string;
  apartment: string;
  landmark: string;
  saveAddress: string;
  orderSuccess: string;
  orderNumber: string;
  orderStatus: string;
  status: {
    PENDING: string;
    CONFIRMED: string;
    PREPARING: string;
    OUT_FOR_DELIVERY: string;
    DELIVERED: string;
    CANCELLED: string;
    NOT_RECEIVED: string;
  };
  login: string;
  register: string;
  logout: string;
  myAccount: string;
  myOrders: string;
  savedAddresses: string;
  adminDashboard: string;
  customerStore: string;
  adminPortal: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  inStock: string;
  outOfStock: string;
  published: string;
  draft: string;
  uploadImage: string;
  uploading: string;
  mainImage: string;
  setAsMain: string;
  removeImage: string;
  price: string;
  mins: string;
  minOrder: string;
  cancel: string;
  saveChanges: string;
  delete: string;
  contactUs: string;
  whatsappOrder: string;
  workingHours: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    brand: 'ويف دونتس',
    slogan: 'اركب موجة الحلاوة.',
    currency: 'ج.م.',
    orderNow: 'اطلب الآن',
    trackOrder: 'متابعة الطلب',
    tracking: 'متابعة الطلب المباشرة',
    ourMenu: 'قائمة الدونتس',
    allDonuts: 'كل الدونتس',
    emptyStoreTitle: 'نجهز لكم أشهى تشكيلة دونتس قريباً!',
    emptyStoreMessage: 'أهلاً بكم في متجر ويف دونتس! نقوم حالياً بإعداد قائمة الدونتس الطازجة بأعلى معايير الجودة. تفضلوا بزيارتنا قريباً لتجربة أروع نكهات الدونتس المخبوزة يومياً.',
    emptyCategoryMessage: 'لا توجد منتجات منشورة في هذا القسم حالياً.',
    customizationTitle: 'تفاصيل ومكونات الدونت',
    ingredientsTitle: 'المكونات الطبيعية',
    optionsTitle: 'الخيارات المتاحة',
    cart: 'سلة المشتريات',
    emptyCart: 'علبتك فارغة حالياً! اختر ما يناسبك من تشكيلة دونتس ويف الطازجة.',
    subtotal: 'المجموع الفرعي',
    deliveryFee: 'رسوم التوصيل',
    total: 'الإجمالي المطلوب',
    checkout: 'إتمام الطلب',
    placeOrder: 'تأكيد الطلب (الدفع عند الاستلام كاش)',
    cod: 'الدفع نقداً عند الاستلام (كاش)',
    codNotice: 'ادفع نقداً بكل راحة عند استلام علبة الدونتس الطازجة على بابك.',
    selectAddress: 'عنوان التوصيل',
    addNewAddress: '+ إضافة عنوان جديد',
    addressTitle: 'اسم العنوان (المنزل، العمل، إلخ)',
    governorate: 'المحافظة',
    city: 'المدينة / المركز',
    area: 'المنطقة / الحي',
    street: 'اسم الشارع',
    buildingNumber: 'رقم العقار / العمارة',
    floor: 'الطابق',
    apartment: 'رقم الشقة',
    landmark: 'علامة مميزة (اختياري)',
    saveAddress: 'حفظ العنوان',
    orderSuccess: 'تم تأكيد طلبك بنجاح!',
    orderNumber: 'رقم الطلب #',
    orderStatus: 'حالة الطلب',
    status: {
      PENDING: 'قيد المراجعة',
      CONFIRMED: 'تم تأكيد الطلب',
      PREPARING: 'جاري التحضير والتجهيز',
      OUT_FOR_DELIVERY: 'في الطريق مع المندوب',
      DELIVERED: 'تم التوصيل بنجاح وبالعافية',
      CANCELLED: 'ملغي / معتذر عنه',
      NOT_RECEIVED: 'لم يتم الاستلام (فشل التوصيل)',
    },
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    myAccount: 'حسابي',
    myOrders: 'طلباتي السابقة',
    savedAddresses: 'عناويني المحفوظة',
    adminDashboard: 'لوحة تحكم ويف دونتس',
    customerStore: 'العودة للمتجر',
    adminPortal: 'لوحة الإدارة',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'رقم الموبايل المصري',
    password: 'كلمة المرور',
    inStock: 'متوفر للطلب',
    outOfStock: 'نفد من المتجر',
    published: 'منشور في المتجر',
    draft: 'مسودة (مخفي)',
    uploadImage: 'رفع صورة من جهازك',
    uploading: 'جاري رفع الصورة...',
    mainImage: 'الصورة الرئيسية',
    setAsMain: 'تعيين كرئيسية',
    removeImage: 'حذف الصورة',
    price: 'السعر (ج.م.)',
    mins: 'دقيقة',
    minOrder: 'الحد الأدنى للطلب',
    cancel: 'إلغاء',
    saveChanges: 'حفظ التغييرات',
    delete: 'حذف',
    contactUs: 'اتصل بنا',
    whatsappOrder: 'تواصل عبر الواتساب',
    workingHours: 'ساعات العمل',
  },
  en: {
    brand: 'Wave Donuts',
    slogan: 'Ride the Sweet Wave.',
    currency: 'EGP',
    orderNow: 'Order Now',
    trackOrder: 'Track Order',
    tracking: 'Live Order Tracking',
    ourMenu: 'Donut Menu',
    allDonuts: 'All Donuts',
    emptyStoreTitle: 'Fresh Waves Coming Soon!',
    emptyStoreMessage: 'Welcome to Wave Donuts Egypt! Our kitchen is preparing the finest handcrafted brioche donuts. Please check back soon or reach out via WhatsApp.',
    emptyCategoryMessage: 'No published donuts in this category yet.',
    customizationTitle: 'Donut Details & Ingredients',
    ingredientsTitle: 'Fresh Ingredients',
    optionsTitle: 'Available Options',
    cart: 'Your Donut Box',
    emptyCart: 'Your box is empty! Add fresh artisanal donuts to your order.',
    subtotal: 'Subtotal',
    deliveryFee: 'Delivery Fee',
    total: 'Total Amount',
    checkout: 'Proceed to Checkout',
    placeOrder: 'Confirm Order (Cash on Delivery)',
    cod: 'Cash on Delivery (COD)',
    codNotice: 'Pay easily with cash when your fresh donut box arrives at your door.',
    selectAddress: 'Delivery Address',
    addNewAddress: '+ Add New Address',
    addressTitle: 'Address Label (Home, Office)',
    governorate: 'Governorate',
    city: 'City / District',
    area: 'Area / Neighborhood',
    street: 'Street Name',
    buildingNumber: 'Building / Villa No.',
    floor: 'Floor',
    apartment: 'Apartment',
    landmark: 'Landmark (Optional)',
    saveAddress: 'Save Address',
    orderSuccess: 'Order Placed Successfully!',
    orderNumber: 'Order #',
    orderStatus: 'Order Status',
    status: {
      PENDING: 'Pending Review',
      CONFIRMED: 'Order Confirmed',
      PREPARING: 'Preparing & Baking',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered Fresh',
      CANCELLED: 'Cancelled',
      NOT_RECEIVED: 'Delivery Failed / Not Received',
    },
    login: 'Sign In',
    register: 'Create Account',
    logout: 'Log Out',
    myAccount: 'My Account',
    myOrders: 'My Past Orders',
    savedAddresses: 'Saved Addresses',
    adminDashboard: 'Wave Command Center',
    customerStore: 'Back to Store',
    adminPortal: 'Admin Portal',
    name: 'Full Name',
    email: 'Email Address',
    phone: 'Egyptian Mobile Number',
    password: 'Password',
    inStock: 'Available in Stock',
    outOfStock: 'Sold Out',
    published: 'Published',
    draft: 'Draft (Hidden)',
    uploadImage: 'Upload Photo from Device',
    uploading: 'Uploading photo...',
    mainImage: 'Main Photo',
    setAsMain: 'Set as Main',
    removeImage: 'Remove Photo',
    price: 'Price (EGP)',
    mins: 'mins',
    minOrder: 'Min Order',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    delete: 'Delete',
    contactUs: 'Contact Us',
    whatsappOrder: 'Chat on WhatsApp',
    workingHours: 'Working Hours',
  },
};
