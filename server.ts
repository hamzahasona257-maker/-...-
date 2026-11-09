import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { db } from './src/server/db.ts';
import {
  generateToken,
  verifyAuthToken,
  authenticate,
  requireAdmin,
  requireOwner,
  requirePermission,
  AuthenticatedRequest,
} from './src/server/auth.ts';
import { OrderStatus } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing with 20MB limit for JSON
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Global Cache-Control middleware for all /api endpoints to prevent stale data
app.use('/api', (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  });
  next();
});

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded product photos statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for permanent image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `donut_${cleanBase}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per image
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الصورة غير مدعومة. يرجى رفع ملفات بصيغة JPG أو PNG أو WebP.'));
    }
  },
});

// --------------------------------------------------------------------------
// 1. Initial Owner Setup & Authentication (3-Tier RBAC)
// --------------------------------------------------------------------------

// Check if owner / admin account is setup
app.get(['/api/admin/setup-status', '/api/auth/setup-status'], (_req, res) => {
  const hasOwner = db.hasOwner();
  return res.json({
    needsSetup: !hasOwner,
    isSetup: hasOwner,
    hasOwner,
    hasAdmin: db.hasAdmin(),
  });
});

// Establish Owner Account - STRICTLY PERMANENTLY LOCKED ONCE ESTABLISHED
app.post(['/api/admin/setup', '/api/auth/register-owner'], async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Strict permanent lock: Once an owner exists, setup is permanently locked!
    if (db.hasOwner()) {
      return res.status(403).json({
        error: 'تم تأسيس حساب مالك المتجر مسبقاً، والتسجيل مقفل نهائياً.',
      });
    }

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: 'يرجى إدخال جميع البيانات المطلوبة: الاسم، البريد، الهاتف، وكلمة المرور.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 6 أحرف.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const owner = db.establishOwner({
      name,
      email,
      phone,
      passwordHash,
    });

    const token = generateToken(owner);

    return res.status(201).json({
      message: 'تم تأسيس حساب مالك المتجر الرئيسي (Owner) بنجاح!',
      token,
      user: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
        permissions: owner.permissions,
      },
    });
  } catch (err: any) {
    console.error('Owner setup error:', err);
    return res.status(500).json({ error: err.message || 'حدث خطأ أثناء إعداد حساب المالك.' });
  }
});

// Customer Registration (Strictly creates CUSTOMER role)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: 'يرجى إكمال جميع الحقول المطلوبة: الاسم، البريد، رقم الهاتف، وكلمة المرور.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = db.createUser({
      name,
      email,
      phone,
      passwordHash,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'تم إنشاء حسابك بنجاح في ويف دونتس!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'حدث خطأ في الخادم أثناء إنشاء الحساب.' });
  }
});

// Login (Customer, Admin, or Owner by email or phone)
app.post('/api/auth/login', async (req, res) => {
  try {
    const rawIdentifier = (req.body.email || req.body.identifier || req.body.phone || '').trim();
    const password = req.body.password;

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور.' });
    }

    const user = db.getUserByIdentifier(rawIdentifier);
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'هذا الحساب تم تعطيله من قِبل إدارة المتجر.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
    }

    const token = generateToken(user);

    return res.json({
      message: 'مرحباً بك في ويف دونتس!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'حدث خطأ في الخادم أثناء تسجيل الدخول.' });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions: user.permissions,
      block: user.block,
    },
  });
});

// --------------------------------------------------------------------------
// 2. Owner-Only Administration Management (Super-Admin)
// --------------------------------------------------------------------------

// Update Owner Personal Profile (Name, Email, Phone, Password)
app.put('/api/owner/profile', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    let passwordHash: string | undefined;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 6 أحرف.' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = db.updateOwnerProfile(req.user!.id, {
      name,
      email,
      phone,
      passwordHash,
    });

    const token = generateToken(db.getUserById(req.user!.id)!);

    return res.json({
      message: 'تم تحديث بيانات حساب مالك المتجر بنجاح.',
      token,
      user: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل تحديث بيانات المالك.' });
  }
});

// List all administrators
app.get(['/api/owner/admins', '/api/admin/admins'], requireOwner, (_req, res) => {
  const admins = db.getAdministrators();
  return res.json({ admins });
});

// Create a new Administrator with specific permissions
app.post(['/api/owner/admins', '/api/admin/admins'], requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, password, permissions } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'يرجى إكمال جميع بيانات المشرف الجديد.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 6 أحرف.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = db.createAdmin(
      {
        name,
        email,
        phone,
        passwordHash,
        permissions,
      },
      req.user!
    );

    return res.status(201).json({
      message: 'تم إنشاء حساب المشرف وتعيين الصلاحيات بنجاح.',
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        role: newAdmin.role,
        permissions: newAdmin.permissions,
        isActive: newAdmin.isActive,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل إنشاء المشرف.' });
  }
});

// Update an administrator's permissions, active status, or details
app.put(['/api/owner/admins/:id', '/api/admin/admins/:id'], requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, permissions, isActive, password } = req.body;
    let passwordHash: string | undefined;

    if (password && password.length >= 6) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = db.updateAdmin(
      req.params.id,
      {
        name,
        phone,
        permissions,
        isActive,
        passwordHash,
      },
      req.user!
    );

    return res.json({ message: 'تم تحديث بيانات وصلاحيات المشرف بنجاح.', admin: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل تحديث المشرف.' });
  }
});

// Delete an administrator (cannot delete Owner)
app.delete(['/api/owner/admins/:id', '/api/admin/admins/:id'], requireOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const target = db.getUserById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'المشرف غير موجود.' });
    }
    if (target.role === 'OWNER') {
      return res.status(403).json({ error: 'لا يمكن حذف حساب مالك المتجر الرئيسي نهائياً.' });
    }
    const success = db.deleteAdmin(req.params.id, req.user!);
    if (!success) {
      return res.status(404).json({ error: 'المشرف غير موجود.' });
    }
    return res.json({ success: true, message: 'تم حذف حساب المشرف بنجاح.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل حذف المشرف.' });
  }
});

// --------------------------------------------------------------------------
// 3. Customer Management & Blocking System (Admin/Owner)
// --------------------------------------------------------------------------

// Customer Directory with failure history & blocking status
app.get(
  '/api/admin/customers',
  requirePermission('canManageCustomers'),
  (_req, res) => {
    const customers = db.getCustomers();
    return res.json({ customers });
  }
);

// Get Individual Customer Detailed Profile (Addresses, Orders History, Notes, Stats)
app.get(
  '/api/admin/customers/:id',
  requirePermission('canManageCustomers'),
  (req: AuthenticatedRequest, res: Response) => {
    const customer = db.getCustomerDetailedProfile(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'العميل غير موجود.' });
    }
    return res.json({ customer });
  }
);

// Toggle Customer Active/Deactivated Status
const handleCustomerStatus = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'يرجى تحديد حالة التفعيل (true/false).' });
    }
    const updated = db.toggleCustomerActive(req.params.id, isActive, req.user!);
    return res.json({
      message: isActive ? 'تم تفعيل حساب العميل بنجاح.' : 'تم تعطيل حساب العميل بنجاح.',
      customer: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل تحديث حالة حساب العميل.' });
  }
};
app.patch('/api/admin/customers/:id/status', requirePermission('canManageCustomers'), handleCustomerStatus);
app.put('/api/admin/customers/:id/status', requirePermission('canManageCustomers'), handleCustomerStatus);

// Delete Customer Account Safely (Preserving all previous orders and sales records)
app.delete(
  '/api/admin/customers/:id',
  requirePermission('canManageCustomers'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = db.deleteCustomerSafely(req.params.id, req.user!);
      if (!success) {
        return res.status(404).json({ error: 'العميل غير موجود.' });
      }
      return res.json({
        success: true,
        message: 'تم حذف حساب العميل بنجاح مع الاحتفاظ بكافة سجلات الطلبات والمبيعات التاريخية بدقة.',
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'فشل حذف حساب العميل.' });
    }
  }
);

// Block customer
app.post(
  '/api/admin/customers/:id/block',
  requirePermission('canManageCustomers'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reason, type, durationDays } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'يرجى توضيح سبب الحظر للتوثيق الإداري.' });
      }

      const updatedCustomer = db.blockCustomer(
        req.params.id,
        reason,
        type === 'TEMPORARY' ? 'TEMPORARY' : 'PERMANENT',
        req.user!,
        durationDays ? parseInt(durationDays, 10) : undefined
      );

      return res.json({
        message: 'تم حظر العميل ورقم هاتفه من إنشاء طلبات جديدة.',
        customer: updatedCustomer,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'فشل حظر العميل.' });
    }
  }
);

// Unblock customer
app.post(
  '/api/admin/customers/:id/unblock',
  requirePermission('canManageCustomers'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const updatedCustomer = db.unblockCustomer(req.params.id, req.user!);
      return res.json({
        message: 'تم إلغاء الحظر وتفعيل إمكانية الطلب للعميل بنجاح.',
        customer: updatedCustomer,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'فشل إلغاء الحظر.' });
    }
  }
);

// Add internal administrative note on customer
app.post(
  '/api/admin/customers/:id/notes',
  requirePermission('canManageCustomers'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: 'يرجى كتابة نص الملاحظة الإدارية.' });
      }
      const note = db.addCustomerNote(req.params.id, text.trim(), req.user!);
      return res.status(201).json({ message: 'تمت إضافة الملاحظة بنجاح.', note });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'فشل إضافة الملاحظة.' });
    }
  }
);

// Delete customer note
app.delete(
  '/api/admin/customers/:id/notes/:noteId',
  requirePermission('canManageCustomers'),
  (req: AuthenticatedRequest, res: Response) => {
    const success = db.deleteCustomerNote(req.params.id, req.params.noteId);
    if (!success) {
      return res.status(404).json({ error: 'الملاحظة غير موجودة.' });
    }
    return res.json({ success: true, message: 'تم حذف الملاحظة.' });
  }
);

// --------------------------------------------------------------------------
// 4. Audit Logs (Admin Activity Tracking)
// --------------------------------------------------------------------------

app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const logs = db.getAuditLogs(limit);
  return res.json({ logs });
});

// --------------------------------------------------------------------------
// 5. Store Settings (Business Info, Phone, WhatsApp, Announcements)
// --------------------------------------------------------------------------

// Public Store Settings
app.get('/api/settings', (_req, res) => {
  const settings = db.getSettings();
  return res.json({ settings });
});

// Update Store Settings (Admin/Owner with canManageSettings)
app.put(
  '/api/admin/settings',
  requirePermission('canManageSettings'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateSettings(req.body, req.user);
      return res.json({ settings: updated, message: 'تم حفظ إعدادات المتجر بنجاح.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل حفظ الإعدادات.' });
    }
  }
);

// --------------------------------------------------------------------------
// 6. Public Donut Catalog & Delivery Locations
// --------------------------------------------------------------------------

// Get Published Donuts (for customer storefront)
app.get('/api/donuts', (_req, res) => {
  const products = db.getProducts(true); // only published
  const categories = db.getCategories();
  return res.json({ products, categories });
});

// Get Active Delivery Locations (for customer checkout)
app.get('/api/delivery-locations', (_req, res) => {
  const locations = db.getDeliveryLocations(true); // only active
  return res.json({ locations });
});

// --------------------------------------------------------------------------
// 7. Customer Addresses (Egyptian Address Fields)
// --------------------------------------------------------------------------

app.get(['/api/addresses', '/api/customer/addresses'], authenticate, (req: AuthenticatedRequest, res: Response) => {
  const addresses = db.getAddressesByUserId(req.user!.id);
  return res.json({ addresses });
});

app.post(['/api/addresses', '/api/customer/addresses'], authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      governorate,
      city,
      area,
      street,
      buildingNumber,
      floor,
      apartment,
      landmark,
      deliveryLocationId,
      isDefault,
    } = req.body;

    if (!title || !governorate || !city || !area || !street || !buildingNumber) {
      return res.status(400).json({
        error: 'يرجى إكمال الحقول الأساسية: العنوان، المحافظة، المدينة، المنطقة، الشارع، ورقم العقار.',
      });
    }

    const newAddress = db.createAddress({
      userId: req.user!.id,
      title,
      governorate,
      city,
      area,
      street,
      buildingNumber,
      floor: floor || '',
      apartment: apartment || '',
      landmark: landmark || '',
      deliveryLocationId: deliveryLocationId || '',
      isDefault: Boolean(isDefault),
    });

    return res.status(201).json({ address: newAddress });
  } catch (err: any) {
    return res.status(500).json({ error: 'فشل حفظ عنوان التوصيل.' });
  }
});

app.delete('/api/addresses/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const success = db.deleteAddress(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: 'العنوان غير موجود أو لا تملك صلاحية حذفه.' });
  }
  return res.json({ success: true });
});

// --------------------------------------------------------------------------
// 8. Customer Order Creation & Live Tracking (EGP, COD & Strict Block Check)
// --------------------------------------------------------------------------

app.post('/api/orders', authenticate, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { items, addressId, notes } = req.body;

    // Strict Immediate Block Check (By user account AND phone number)
    const blockCheck = db.checkCustomerBlockStatus(user.id, user.phone);
    if (blockCheck.isBlocked) {
      return res.status(403).json({
        error: `عذراً، لا يمكن إتمام الطلب: ${blockCheck.reason || 'حسابك أو رقم هاتفك محظور من إنشاء طلبات جديدة.'}`,
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'سلة المشتريات فارغة. يرجى إضافة قطع دونتس أولاً.' });
    }

    if (!addressId) {
      return res.status(400).json({ error: 'يرجى تحديد عنوان التوصيل.' });
    }

    const address = db.getAddressById(addressId);
    if (!address || address.userId !== user.id) {
      return res.status(400).json({ error: 'عنوان التوصيل غير موجود أو لا ينتمي لحسابك.' });
    }

    // Match delivery location by deliveryLocationId or by Area/City
    let location = db.getDeliveryLocationById(address.deliveryLocationId);
    if (!location) {
      const activeLocations = db.getDeliveryLocations(true);
      location = activeLocations.find(
        (l) => l.area === address.area || (l.city === address.city && l.governorate === address.governorate)
      );
    }

    if (!location || !location.isActive) {
      return res.status(400).json({
        error: `منطقة التوصيل (${address.area || address.city}) غير مدعومة حالياً أو خارج نطاق الخدمة.`,
      });
    }

    const result = db.createOrder({
      userId: user.id,
      customerName: user.name,
      customerPhone: user.phone,
      customerEmail: user.email,
      addressId: address.id,
      addressDetails: address,
      deliveryLocation: location,
      items,
      notes: notes || '',
    });

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      message: 'تم تأكيد طلبك بنجاح! الدفع عند الاستلام كاش.',
      order: result.order,
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب.' });
  }
});

// Customer's Personal Order History
app.get('/api/orders/my', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const orders = db.getOrdersByUserId(req.user!.id);
  return res.json({ orders });
});

// Live Order Tracking with Strict Ownership Verification & Account Isolation
app.get('/api/orders/track/:identifier', (req, res) => {
  const order = db.getOrderByIdOrNumber(req.params.identifier);
  if (!order) {
    return res.status(404).json({ error: 'لم يتم العثور على طلب بهذا الرقم.' });
  }

  // Check auth header if present
  let authUser: any;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyAuthToken(token);
    if (payload && payload.userId) {
      authUser = db.getUserById(payload.userId);
    }
  }

  // 1. Administrators or Store Owner have full visibility
  if (authUser && (authUser.role === 'OWNER' || authUser.role === 'ADMIN')) {
    return res.json({ order });
  }

  // 2. Authenticated Customer must strictly own this order
  if (authUser && authUser.role === 'CUSTOMER') {
    if (order.userId === authUser.id) {
      return res.json({ order });
    } else {
      return res.status(403).json({ error: 'ليس لديك صلاحية للوصول إلى هذا الطلب أو الاطلاع على بياناته.' });
    }
  }

  // 3. Unauthenticated guest tracking by Order Number -> require registered phone verification
  const phoneQuery = (req.query.phone as string) || '';
  const cleanQueryPhone = phoneQuery.replace(/[^0-9]/g, '');
  const cleanOrderPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');

  if (cleanQueryPhone && (cleanQueryPhone.endsWith(cleanOrderPhone) || cleanOrderPhone.endsWith(cleanQueryPhone))) {
    return res.json({ order });
  }

  return res.status(403).json({
    error: 'لحماية خصوصية بيانات العملاء، يرجى تسجيل الدخول بحسابك أو إدخال رقم الهاتف المسجل مع الطلب للتحقق من هويتك.',
    requiresPhoneVerification: true,
  });
});

// --------------------------------------------------------------------------
// 9. Admin Products & Image Uploads (Protected by canManageProducts)
// --------------------------------------------------------------------------

// Image Upload API (JPG, PNG, WebP)
app.post(
  '/api/admin/upload-image',
  requirePermission('canManageProducts'),
  upload.single('image'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم اختيار أي ملف صورة.' });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      return res.json({
        message: 'تم رفع الصورة بنجاح.',
        imageUrl,
        filename: req.file.filename,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'فشل رفع الصورة.' });
    }
  }
);

// Multiple Image Upload API (Up to 6 images per product)
app.post(
  '/api/admin/upload-multiple',
  requirePermission('canManageProducts'),
  upload.array('images', 6),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'لم يتم اختيار أي صور للرفع.' });
      }
      const imageUrls = files.map((f) => `/uploads/${f.filename}`);
      return res.json({
        message: `تم رفع ${imageUrls.length} صورة بنجاح.`,
        imageUrls,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'فشل رفع الصور.' });
    }
  }
);

// Delete uploaded image file
app.delete(
  '/api/admin/delete-image',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
        return res.status(400).json({ error: 'مسار الصورة غير صالح.' });
      }
      const filename = path.basename(imageUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.json({ success: true, message: 'تم حذف ملف الصورة.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل حذف الصورة.' });
    }
  }
);

// Products CRUD (Admin)
app.get('/api/admin/products', requireAdmin, (_req, res) => {
  const products = db.getProducts(false); // all products including drafts
  return res.json({ products });
});

app.post(
  '/api/admin/products',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        categoryId,
        nameAr,
        nameEn,
        descAr,
        descEn,
        ingredients,
        images,
        mainImage,
        basePrice,
        isPublished,
        isAvailable,
        inventoryCount,
        options,
        productType,
        customizationGroupIds,
      } = req.body;

      if (!nameAr || basePrice === undefined) {
        return res.status(400).json({ error: 'اسم المنتج بالعربية والسعر بالجنيه المصري مطلوبان.' });
      }

      const imageList = Array.isArray(images) ? images : [];
      const primaryImg = mainImage || imageList[0] || '';

      const newProduct = db.createProduct(
        {
          categoryId: categoryId || '',
          nameAr,
          nameEn: nameEn || nameAr,
          descAr: descAr || '',
          descEn: descEn || '',
          ingredients: ingredients || '',
          images: imageList,
          mainImage: primaryImg,
          basePrice: parseFloat(Number(basePrice).toFixed(2)),
          isPublished: Boolean(isPublished),
          isAvailable: isAvailable !== false,
          inventoryCount: inventoryCount ? parseInt(inventoryCount, 10) : undefined,
          options: options || [],
          productType: productType === 'DRINK' ? 'DRINK' : 'DONUT',
          customizationGroupIds: Array.isArray(customizationGroupIds) ? customizationGroupIds : [],
        },
        req.user
      );

      return res.status(201).json({ product: newProduct, message: 'تمت إضافة منتج الدونتس بنجاح.' });
    } catch (err: any) {
      console.error('Error creating product:', err);
      return res.status(500).json({ error: 'فشل إنشاء المنتج.' });
    }
  }
);

app.put(
  '/api/admin/products/:id',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      if (updates.basePrice !== undefined) {
        updates.basePrice = parseFloat(Number(updates.basePrice).toFixed(2));
      }
      const updated = db.updateProduct(req.params.id, updates, req.user);
      if (!updated) {
        return res.status(404).json({ error: 'المنتج غير موجود.' });
      }
      return res.json({ product: updated, message: 'تم تحديث المنتج بنجاح.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل تحديث المنتج.' });
    }
  }
);

app.delete(
  '/api/admin/products/:id',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    const success = db.deleteProduct(req.params.id, req.user);
    if (!success) {
      return res.status(404).json({ error: 'المنتج غير موجود.' });
    }
    return res.json({ success: true, message: 'تم حذف المنتج بنجاح.' });
  }
);

// Categories CRUD (Admin)
app.get('/api/admin/categories', requireAdmin, (_req, res) => {
  const categories = db.getCategories();
  return res.json({ categories });
});

app.post(
  '/api/admin/categories',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { nameAr, nameEn, slug } = req.body;
      if (!nameAr) {
        return res.status(400).json({ error: 'اسم التصنيف مطلوب.' });
      }
      const cat = db.createCategory({ nameAr, nameEn, slug }, req.user);
      return res.status(201).json({ category: cat, message: 'تم إنشاء التصنيف بنجاح.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل إنشاء التصنيف.' });
    }
  }
);

app.put(
  '/api/admin/categories/:id',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateCategory(req.params.id, req.body, req.user);
      if (!updated) return res.status(404).json({ error: 'التصنيف غير موجود.' });
      return res.json({ category: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل تعديل التصنيف.' });
    }
  }
);

app.delete(
  '/api/admin/categories/:id',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    const success = db.deleteCategory(req.params.id, req.user);
    if (!success) return res.status(404).json({ error: 'التصنيف غير موجود.' });
    return res.json({ success: true });
  }
);

// --------------------------------------------------------------------------
// 9.5 Customization Groups (Dynamic Customization Builder)
// --------------------------------------------------------------------------

// Public Customization Groups (For customer product modal)
app.get('/api/customization-groups', (_req, res) => {
  const groups = db.getCustomizationGroups().filter((g) => g.isActive);
  return res.json({ groups });
});

// Admin Customization Groups
app.get('/api/admin/customization-groups', requireAdmin, (_req, res) => {
  const groups = db.getCustomizationGroups();
  return res.json({ groups });
});

app.post(
  '/api/admin/customization-groups',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        nameAr,
        nameEn,
        descriptionAr,
        descriptionEn,
        type,
        isRequired,
        minSelections,
        maxSelections,
        options,
        displayOrder,
        isActive,
        assignedToAll,
        assignedProductIds,
        assignedCategoryIds,
      } = req.body;

      if (!nameAr || !type) {
        return res.status(400).json({ error: 'اسم المجموعة ونوع الحقل مطلوبان.' });
      }

      const newGroup = db.createCustomizationGroup(
        {
          nameAr,
          nameEn: nameEn || nameAr,
          descriptionAr: descriptionAr || '',
          descriptionEn: descriptionEn || '',
          type,
          isRequired: Boolean(isRequired),
          minSelections: minSelections ? parseInt(minSelections, 10) : undefined,
          maxSelections: maxSelections ? parseInt(maxSelections, 10) : undefined,
          options: Array.isArray(options) ? options : [],
          displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0,
          isActive: isActive !== false,
          assignedToAll: Boolean(assignedToAll),
          assignedProductIds: Array.isArray(assignedProductIds) ? assignedProductIds : [],
          assignedCategoryIds: Array.isArray(assignedCategoryIds) ? assignedCategoryIds : [],
        },
        req.user
      );

      return res.status(201).json({ group: newGroup, message: 'تم إنشاء مجموعة التخصيص بنجاح.' });
    } catch (err: any) {
      console.error('Error creating customization group:', err);
      return res.status(500).json({ error: 'فشل إنشاء مجموعة التخصيص.' });
    }
  }
);

app.put(
  '/api/admin/customization-groups/:id',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = db.updateCustomizationGroup(req.params.id, req.body, req.user);
      if (!updated) {
        return res.status(404).json({ error: 'مجموعة التخصيص غير موجودة.' });
      }
      return res.json({ group: updated, message: 'تم تحديث مجموعة التخصيص بنجاح.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل تحديث مجموعة التخصيص.' });
    }
  }
);

app.delete(
  '/api/admin/customization-groups/:id',
  requirePermission('canManageProducts'),
  (req: AuthenticatedRequest, res: Response) => {
    const success = db.deleteCustomizationGroup(req.params.id, req.user);
    if (!success) {
      return res.status(404).json({ error: 'مجموعة التخصيص غير موجودة.' });
    }
    return res.json({ success: true, message: 'تم حذف مجموعة التخصيص بنجاح.' });
  }
);

// --------------------------------------------------------------------------
// 10. Delivery Locations CRUD (Protected by canManageDelivery)
// --------------------------------------------------------------------------

app.get('/api/admin/delivery-locations', requireAdmin, (_req, res) => {
  const locations = db.getDeliveryLocations(false);
  return res.json({ locations });
});

app.post(
  '/api/admin/delivery-locations',
  requirePermission('canManageDelivery'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { governorate, city, area, deliveryFee, minOrder, estimatedMin, isActive } = req.body;

      if (!governorate || !city || !area || deliveryFee === undefined || deliveryFee === null || deliveryFee === '') {
        return res.status(400).json({ error: 'المحافظة، المدينة، المنطقة، ورسوم التوصيل مطلوبة.' });
      }

      const numFee = Number(deliveryFee);
      if (isNaN(numFee) || numFee < 0) {
        return res.status(400).json({ error: 'رسوم التوصيل يجب أن تكون قيمة رقمية صحيحة (صفر أو أكثر بالجنيه المصري).' });
      }

      const newLoc = db.createDeliveryLocation(
        {
          governorate: String(governorate).trim(),
          city: String(city).trim(),
          area: String(area).trim(),
          deliveryFee: parseFloat(numFee.toFixed(2)),
          minOrder: minOrder ? parseFloat(Number(minOrder).toFixed(2)) : 0,
          estimatedMin: estimatedMin ? parseInt(String(estimatedMin), 10) : 45,
          isActive: isActive !== false,
        },
        req.user
      );

      return res.status(201).json({ location: newLoc, message: 'تمت إضافة منطقة التوصيل بنجاح.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل إضافة منطقة التوصيل.' });
    }
  }
);

app.put(
  '/api/admin/delivery-locations/:id',
  requirePermission('canManageDelivery'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      if (updates.deliveryFee !== undefined) {
        const numFee = Number(updates.deliveryFee);
        if (isNaN(numFee) || numFee < 0) {
          return res.status(400).json({ error: 'رسوم التوصيل يجب أن تكون قيمة رقمية صحيحة (صفر أو أكثر بالجنيه المصري).' });
        }
        updates.deliveryFee = parseFloat(numFee.toFixed(2));
      }
      if (updates.minOrder !== undefined)
        updates.minOrder = parseFloat(Number(updates.minOrder).toFixed(2));
      if (updates.estimatedMin !== undefined)
        updates.estimatedMin = parseInt(String(updates.estimatedMin), 10);

      const updated = db.updateDeliveryLocation(req.params.id, updates, req.user);
      if (!updated) return res.status(404).json({ error: 'منطقة التوصيل غير موجودة.' });
      return res.json({ location: updated, message: 'تم تحديث منطقة التوصيل بنجاح.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل تحديث منطقة التوصيل.' });
    }
  }
);

app.delete(
  '/api/admin/delivery-locations/:id',
  requirePermission('canManageDelivery'),
  (req: AuthenticatedRequest, res: Response) => {
    const success = db.deleteDeliveryLocation(req.params.id, req.user);
    if (!success) return res.status(404).json({ error: 'منطقة التوصيل غير موجودة.' });
    return res.json({ success: true, message: 'تم حذف منطقة التوصيل.' });
  }
);

// --------------------------------------------------------------------------
// 11. Orders Management (Protected by canManageOrders)
// --------------------------------------------------------------------------

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const orders = db.getOrders();
  return res.json({ orders });
});

app.patch(
  '/api/admin/orders/:id/status',
  requirePermission('canManageOrders'),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, cancellationReason, note } = req.body;
      const validStatuses: OrderStatus[] = [
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'NOT_RECEIVED',
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'حالة الطلب غير صالحة.' });
      }

      const updated = db.updateOrderStatus(req.params.id, status, cancellationReason, note, req.user);
      if (!updated) {
        return res.status(404).json({ error: 'الطلب غير موجود.' });
      }

      return res.json({ message: 'تم تحديث حالة الطلب بنجاح.', order: updated });
    } catch (err: any) {
      return res.status(500).json({ error: 'فشل تحديث حالة الطلب.' });
    }
  }
);

// Live Analytics (Admin)
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const analytics = db.getAnalytics();
  return res.json(analytics);
});

// --------------------------------------------------------------------------
// 11.5 Monthly Accounting & Archiving System (Owner-Only)
// --------------------------------------------------------------------------

// Get list of available months and active accounting period
app.get('/api/owner/accounting/months', requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const data = db.getAvailableAccountingMonths();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل جلب الأشهر المحاسبية.' });
  }
});

// Get comprehensive monthly financial report
app.get('/api/owner/accounting/report/:monthKey', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey } = req.params;
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ error: 'صيغة الشهر المحاسبي غير صحيحة (YYYY-MM).' });
    }
    const report = db.getMonthlyAccountingReport(monthKey);
    return res.json({ report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل توليد التقرير المحاسبي الشهري.' });
  }
});

// Close a month and permanently archive its records (Owner-Only)
app.post('/api/owner/accounting/close/:monthKey', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey } = req.params;
    const { notes } = req.body;
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ error: 'صيغة الشهر المحاسبي غير صحيحة (YYYY-MM).' });
    }
    const archive = db.closeAccountingMonth(monthKey, notes, req.user!);
    return res.json({
      message: `تم إغلاق شهر (${archive.summary.monthNameAr}) وأرشفة كافة سجلاته المالية والتشغيلية بنجاح.`,
      archive,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل إغلاق الشهر المحاسبي.' });
  }
});

// Start a new operational accounting month (Owner-Only)
app.post('/api/owner/accounting/start-new-period', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey } = req.body;
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return res.status(400).json({ error: 'صيغة الشهر المحاسبي الجديد غير صحيحة (YYYY-MM).' });
    }
    const result = db.startNewAccountingPeriod(monthKey, req.user!);
    return res.json({
      message: `تم بدء الفترة التشغيلية المحاسبية الجديدة بنجاح (${monthKey}).`,
      activeMonth: result.activeMonth,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل بدء الفترة المحاسبية الجديدة.' });
  }
});

// Reopen a closed month (Owner-Only)
app.post('/api/owner/accounting/reopen/:monthKey', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { monthKey } = req.params;
    const result = db.reopenAccountingMonth(monthKey, req.user!);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل إعادة فتح الشهر المحاسبي.' });
  }
});

// --------------------------------------------------------------------------
// 11.8 Offers System (Public & Admin)
// --------------------------------------------------------------------------

// Public offers
app.get('/api/offers', (_req: Request, res: Response) => {
  try {
    const offers = db.getOffers(true);
    return res.json({ offers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل جلب العروض.' });
  }
});

app.get('/api/offers/:id', (req: Request, res: Response) => {
  try {
    const offer = db.getOfferById(req.params.id);
    if (!offer) {
      return res.status(404).json({ error: 'العرض غير موجود.' });
    }
    return res.json({ offer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل جلب تفاصيل العرض.' });
  }
});

// Admin offers
app.get('/api/admin/offers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const offers = db.getAdminOffers();
    return res.json({ offers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل جلب العروض للإدارة.' });
  }
});

app.post('/api/admin/offers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const offer = db.createOffer(req.body, req.user!);
    return res.json({ message: 'تم إنشاء العرض بنجاح.', offer });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل إنشاء العرض.' });
  }
});

app.put('/api/admin/offers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const offer = db.updateOffer(req.params.id, req.body, req.user!);
    return res.json({ message: 'تم تحديث العرض بنجاح.', offer });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل تحديث العرض.' });
  }
});

app.delete('/api/admin/offers/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const success = db.deleteOffer(req.params.id, req.user!);
    if (!success) return res.status(404).json({ error: 'العرض غير موجود.' });
    return res.json({ message: 'تم حذف العرض بنجاح.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل حذف العرض.' });
  }
});

app.patch('/api/admin/offers/:id/toggle-active', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const offer = db.toggleOfferActive(req.params.id, req.user!);
    return res.json({ message: 'تم تغيير حالة العرض بنجاح.', offer });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل تغيير حالة العرض.' });
  }
});

// --------------------------------------------------------------------------
// 11.9 Dedicated Advertisements System (Public & Admin)
// --------------------------------------------------------------------------

// Public advertisements
app.get('/api/advertisements', (req: Request, res: Response) => {
  try {
    const placement = typeof req.query.placement === 'string' ? (req.query.placement as any) : undefined;
    const advertisements = db.getAdvertisements(true, placement);
    return res.json({ advertisements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل جلب الإعلانات.' });
  }
});

// Admin advertisements
app.get('/api/admin/advertisements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const advertisements = db.getAdminAdvertisements();
    return res.json({ advertisements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'فشل جلب الإعلانات للإدارة.' });
  }
});

app.post('/api/admin/advertisements', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const advertisement = db.createAdvertisement(req.body, req.user!);
    return res.json({ message: 'تم إنشاء الإعلان بنجاح.', advertisement });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل إنشاء الإعلان.' });
  }
});

app.put('/api/admin/advertisements/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const advertisement = db.updateAdvertisement(req.params.id, req.body, req.user!);
    return res.json({ message: 'تم تحديث الإعلان بنجاح.', advertisement });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل تحديث الإعلان.' });
  }
});

app.delete('/api/admin/advertisements/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const success = db.deleteAdvertisement(req.params.id, req.user!);
    if (!success) return res.status(404).json({ error: 'الإعلان غير موجود.' });
    return res.json({ message: 'تم حذف الإعلان بنجاح.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل حذف الإعلان.' });
  }
});

app.patch('/api/admin/advertisements/:id/toggle-active', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const advertisement = db.toggleAdvertisementActive(req.params.id, req.user!);
    return res.json({ message: 'تم تغيير حالة الإعلان بنجاح.', advertisement });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل تغيير حالة الإعلان.' });
  }
});

app.post('/api/admin/advertisements/reorder', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'OWNER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'غير مصرح.' });
    }
    const advertisements = db.reorderAdvertisements(req.body.orderedIds, req.user!);
    return res.json({ message: 'تم تحديث ترتيب الإعلانات بنجاح.', advertisements });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل إعادة ترتيب الإعلانات.' });
  }
});

// --------------------------------------------------------------------------
// 12. Vite Integration (Dev Mode) / Static Production Serving
// --------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Wave Donuts Egyptian Full-Stack Platform active at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
