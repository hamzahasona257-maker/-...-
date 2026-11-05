import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  Address,
  DeliveryLocation,
  Category,
  DonutProduct,
  Order,
  OrderItem,
  OrderStatus,
  StoreSettings,
  AdminPermissions,
  CustomerBlock,
  CustomerNote,
  AuditLog,
  CustomizationGroup,
  CustomizationOption,
  SelectedCustomizationItem,
} from '../types.ts';

export interface UserInDB {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
  permissions?: AdminPermissions;
  isActive?: boolean;
  block?: CustomerBlock;
  notes?: CustomerNote[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockedPhoneEntry {
  phone: string;
  reason: string;
  blockedAt: string;
  blockedBy: string;
}

export function normalizePhoneAndNumerals(input: string): string {
  if (!input) return '';
  const arabicIndic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const easternPersian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let result = String(input);
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(arabicIndic[i], String(i));
    result = result.replaceAll(easternPersian[i], String(i));
  }
  return result.replace(/[\s\-\(\)\.]/g, '');
}

interface DatabaseSchema {
  users: UserInDB[];
  addresses: Address[];
  deliveryLocations: DeliveryLocation[];
  categories: Category[];
  products: DonutProduct[];
  customizationGroups: CustomizationGroup[];
  orders: Order[];
  settings: StoreSettings;
  auditLogs: AuditLog[];
  blockedPhones: BlockedPhoneEntry[];
  lastOrderNumber: number;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'wave_donuts_db.json');
const DB_BACKUP_FILE = path.join(DB_DIR, 'wave_donuts_db.json.bak');

const DEFAULT_OWNER_PERMISSIONS: AdminPermissions = {
  canManageProducts: true,
  canManageOrders: true,
  canManageDelivery: true,
  canManageSettings: true,
  canManageCustomers: true,
};

// Initialize Clean Persistent Database preserving all existing business records
function initDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const defaultSettings: StoreSettings = {
    businessNameAr: 'ويف دونتس',
    businessNameEn: 'Wave Donuts',
    sloganAr: 'اركب موجة الحلاوة.',
    sloganEn: 'Ride the Sweet Wave.',
    phone: '',
    whatsapp: '',
    aboutAr: 'متجر ويف دونتس المتخصص في أشهى أنواع الدونتس الطازجة المخبوزة بأعلى معايير الجودة والمشروبات المميزة.',
    aboutEn: 'Wave Donuts specializes in freshly fried and glazed artisanal donuts and specialty beverages.',
    announcementAr: 'أهلاً بكم في متجر ويف دونتس! ترقبوا إطلاق قائمة منتجاتنا الطازجة قريباً.',
    announcementEn: 'Welcome to Wave Donuts! Our fresh menu will be available soon.',
    showAnnouncement: true,
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
    workingHoursAr: 'يومياً من ١٠ صباحاً حتى ١١ مساءً',
    workingHoursEn: 'Daily 10:00 AM - 11:00 PM',
    isOpenForOrders: true,
  };

  const loadFromPath = (filePath: string): DatabaseSchema | null => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          users: parsed.users || [],
          addresses: parsed.addresses || [],
          deliveryLocations: parsed.deliveryLocations || [],
          categories: parsed.categories || [],
          products: parsed.products || [],
          customizationGroups: parsed.customizationGroups || [],
          orders: parsed.orders || [],
          settings: parsed.settings || defaultSettings,
          auditLogs: parsed.auditLogs || [],
          blockedPhones: parsed.blockedPhones || [],
          lastOrderNumber: parsed.lastOrderNumber || 100,
        };
      }
    } catch (err) {
      console.error(`Error reading database from ${filePath}:`, err);
    }
    return null;
  };

  // Try primary database file first
  const primaryData = loadFromPath(DB_FILE);
  if (primaryData) {
    // Keep safety backup
    try {
      fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
    } catch {}
    return primaryData;
  }

  // Try backup if primary failed
  const backupData = loadFromPath(DB_BACKUP_FILE);
  if (backupData) {
    console.warn('Restored database from safety backup file.');
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(backupData, null, 2), 'utf-8');
    } catch {}
    return backupData;
  }

  // Fallback initial schema if clean start
  const cleanInitialData: DatabaseSchema = {
    users: [],
    addresses: [],
    deliveryLocations: [],
    categories: [],
    products: [],
    customizationGroups: [],
    orders: [],
    settings: defaultSettings,
    auditLogs: [],
    blockedPhones: [],
    lastOrderNumber: 100,
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(cleanInitialData, null, 2), 'utf-8');
  return cleanInitialData;
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = initDatabase();
  }

  // Atomic file save with safety backup
  private save() {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      try {
        fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
      } catch {}
    } catch (err) {
      console.error('Failed to save database file atomically, falling back:', err);
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (e) {
        console.error('Critical database write error:', e);
      }
    }
  }

  verifyIntegrity(): boolean {
    return fs.existsSync(DB_FILE) && fs.existsSync(DB_BACKUP_FILE);
  }

  // -------------------------------------------------------------
  // Audit Logs
  // -------------------------------------------------------------

  addAuditLog(entry: {
    performedById: string;
    performedByName: string;
    performedByRole: 'OWNER' | 'ADMIN';
    action: string;
    details?: string;
  }): AuditLog {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      performedById: entry.performedById,
      performedByName: entry.performedByName,
      performedByRole: entry.performedByRole,
      action: entry.action,
      details: entry.details,
      timestamp: new Date().toISOString(),
    };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(log);
    // Keep max 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.save();
    return log;
  }

  getAuditLogs(limit = 100): AuditLog[] {
    return (this.data.auditLogs || []).slice(0, limit);
  }

  // -------------------------------------------------------------
  // Owner & Admin User Management (3-Tier RBAC)
  // -------------------------------------------------------------

  hasOwner(): boolean {
    return this.data.users.some((u) => u.role === 'OWNER');
  }

  hasAdmin(): boolean {
    return this.data.users.some((u) => u.role === 'OWNER' || u.role === 'ADMIN');
  }

  getOwner(): UserInDB | undefined {
    return this.data.users.find((u) => u.role === 'OWNER');
  }

  // Establish Owner Account - STRICT SINGLE OWNER SYSTEM (Only 1 Owner allowed)
  establishOwner(ownerData: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
  }): UserInDB {
    if (this.hasOwner()) {
      throw new Error('تم تأسيس حساب مالك المتجر مسبقاً، والنظام مقفل بحساب مالك وحيد لا يمكن تكراره.');
    }

    const now = new Date().toISOString();

    // Check if there was an old legacy ADMIN that should be demoted/replaced
    const oldAdminIndex = this.data.users.findIndex((u) => u.role === 'ADMIN' && u.email.toLowerCase() === ownerData.email.toLowerCase());
    if (oldAdminIndex !== -1) {
      this.data.users[oldAdminIndex].role = 'OWNER';
      this.data.users[oldAdminIndex].permissions = DEFAULT_OWNER_PERMISSIONS;
      this.data.users[oldAdminIndex].passwordHash = ownerData.passwordHash;
      this.data.users[oldAdminIndex].updatedAt = now;
      this.save();
      return this.data.users[oldAdminIndex];
    }

    // Create fresh Owner
    const newOwner: UserInDB = {
      id: `usr_owner_${Date.now()}`,
      name: ownerData.name,
      email: ownerData.email.toLowerCase(),
      phone: ownerData.phone,
      passwordHash: ownerData.passwordHash,
      role: 'OWNER',
      permissions: DEFAULT_OWNER_PERMISSIONS,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newOwner);
    this.addAuditLog({
      performedById: newOwner.id,
      performedByName: newOwner.name,
      performedByRole: 'OWNER',
      action: 'إنشاء حساب مالك المتجر الرئيسي (Owner)',
      details: `تم تأسيس حساب المالك الرئيسي: ${newOwner.email}`,
    });
    this.save();
    return newOwner;
  }

  // Update Owner Profile (Name, Email, Phone, Password)
  updateOwnerProfile(
    ownerId: string,
    updates: {
      name?: string;
      email?: string;
      phone?: string;
      passwordHash?: string;
    }
  ): UserProfile {
    const owner = this.data.users.find((u) => u.id === ownerId && u.role === 'OWNER');
    if (!owner) {
      throw new Error('حساب مالك المتجر غير موجود.');
    }

    if (updates.email && updates.email.toLowerCase() !== owner.email.toLowerCase()) {
      const existing = this.getUserByEmail(updates.email);
      if (existing && existing.id !== owner.id) {
        throw new Error('يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني.');
      }
      owner.email = updates.email.toLowerCase();
    }

    if (updates.name) owner.name = updates.name;
    if (updates.phone) owner.phone = updates.phone;
    if (updates.passwordHash) owner.passwordHash = updates.passwordHash;
    owner.updatedAt = new Date().toISOString();

    this.addAuditLog({
      performedById: owner.id,
      performedByName: owner.name,
      performedByRole: 'OWNER',
      action: 'تحديث بيانات الحساب الشخصي لمالك المتجر',
      details: `البريد: ${owner.email} | الاسم: ${owner.name}`,
    });

    this.save();
    return {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      role: owner.role,
      permissions: owner.permissions || DEFAULT_OWNER_PERMISSIONS,
      isActive: true,
      createdAt: owner.createdAt,
    };
  }

  // Reset Owner Slot (Only callable by authenticated Owner to release slot for first-time registration)
  resetOwnerSlot(currentOwnerId: string): boolean {
    const ownerIndex = this.data.users.findIndex((u) => u.id === currentOwnerId && u.role === 'OWNER');
    if (ownerIndex === -1) return false;

    const removed = this.data.users.splice(ownerIndex, 1)[0];
    this.addAuditLog({
      performedById: removed.id,
      performedByName: removed.name,
      performedByRole: 'OWNER',
      action: 'إعادة ضبط خانة مالك المتجر',
      details: 'تم تفريغ حساب المالك للسماح بإعادة التسجيل لأول مرة.',
    });
    this.save();
    return true;
  }

  // Create an invited Admin (only Owner can invoke this)
  createAdmin(
    adminData: {
      name: string;
      email: string;
      phone: string;
      passwordHash: string;
      permissions?: Partial<AdminPermissions>;
    },
    createdBy: UserInDB
  ): UserInDB {
    if (createdBy.role !== 'OWNER') {
      throw new Error('فقط مالك المتجر (Owner) مصرح له بإنشاء حسابات المشرفين.');
    }

    const existing = this.getUserByEmail(adminData.email);
    if (existing) {
      throw new Error('يوجد حساب مسجل بالفعل بهذا البريد الإلكتروني.');
    }

    const now = new Date().toISOString();
    const permissions: AdminPermissions = {
      canManageProducts: adminData.permissions?.canManageProducts ?? true,
      canManageOrders: adminData.permissions?.canManageOrders ?? true,
      canManageDelivery: adminData.permissions?.canManageDelivery ?? false,
      canManageSettings: adminData.permissions?.canManageSettings ?? false,
      canManageCustomers: adminData.permissions?.canManageCustomers ?? false,
    };

    const newAdmin: UserInDB = {
      id: `usr_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: adminData.name,
      email: adminData.email.toLowerCase(),
      phone: adminData.phone,
      passwordHash: adminData.passwordHash,
      role: 'ADMIN',
      permissions,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users.push(newAdmin);
    this.addAuditLog({
      performedById: createdBy.id,
      performedByName: createdBy.name,
      performedByRole: createdBy.role as 'OWNER' | 'ADMIN',
      action: `إضافة مشرف جديد: ${newAdmin.name}`,
      details: `البريد: ${newAdmin.email} | الصلاحيات: ${JSON.stringify(permissions)}`,
    });
    this.save();
    return newAdmin;
  }

  // List all administrators & owner
  getAdministrators(): UserProfile[] {
    return this.data.users
      .filter((u) => u.role === 'OWNER' || u.role === 'ADMIN')
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        permissions: u.permissions || DEFAULT_OWNER_PERMISSIONS,
        isActive: u.isActive !== false,
        createdAt: u.createdAt,
      }));
  }

  // Update admin permissions or active status
  updateAdmin(
    adminId: string,
    updates: {
      name?: string;
      phone?: string;
      permissions?: Partial<AdminPermissions>;
      isActive?: boolean;
      passwordHash?: string;
    },
    updatedBy: UserInDB
  ): UserProfile {
    if (updatedBy.role !== 'OWNER') {
      throw new Error('فقط مالك المتجر (Owner) مصرح له بتعديل صلاحيات وحسابات المشرفين.');
    }

    const target = this.data.users.find((u) => u.id === adminId);
    if (!target) {
      throw new Error('المشرف غير موجود.');
    }

    if (target.role === 'OWNER' && updates.isActive === false) {
      throw new Error('لا يمكن تعطيل حساب مالك المتجر الرئيسي.');
    }

    if (updates.name) target.name = updates.name;
    if (updates.phone) target.phone = updates.phone;
    if (updates.passwordHash) target.passwordHash = updates.passwordHash;
    if (updates.isActive !== undefined && target.role !== 'OWNER') {
      target.isActive = updates.isActive;
    }
    if (updates.permissions && target.role !== 'OWNER') {
      target.permissions = {
        ...(target.permissions || DEFAULT_OWNER_PERMISSIONS),
        ...updates.permissions,
      };
    }
    target.updatedAt = new Date().toISOString();

    this.addAuditLog({
      performedById: updatedBy.id,
      performedByName: updatedBy.name,
      performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
      action: `تعديل بيانات المشرف: ${target.name}`,
      details: `الحالة: ${target.isActive ? 'نشط' : 'معطل'} | الصلاحيات: ${JSON.stringify(target.permissions)}`,
    });

    this.save();
    return {
      id: target.id,
      name: target.name,
      email: target.email,
      phone: target.phone,
      role: target.role,
      permissions: target.permissions,
      isActive: target.isActive,
      createdAt: target.createdAt,
    };
  }

  // Delete an admin (OWNER CANNOT BE DELETED)
  deleteAdmin(adminId: string, deletedBy: UserInDB): boolean {
    if (deletedBy.role !== 'OWNER') {
      throw new Error('فقط مالك المتجر (Owner) مصرح له بحذف حسابات المشرفين.');
    }

    const target = this.data.users.find((u) => u.id === adminId);
    if (!target) return false;
    if (target.role === 'OWNER') {
      throw new Error('لا يمكن حذف حساب مالك المتجر الرئيسي.');
    }

    this.data.users = this.data.users.filter((u) => u.id !== adminId);
    this.addAuditLog({
      performedById: deletedBy.id,
      performedByName: deletedBy.name,
      performedByRole: deletedBy.role as 'OWNER' | 'ADMIN',
      action: `حذف حساب المشرف: ${target.name}`,
      details: `البريد: ${target.email}`,
    });
    this.save();
    return true;
  }

  getUserByEmail(email: string): UserInDB | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): UserInDB | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(customer: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
  }): UserInDB {
    const now = new Date().toISOString();
    const newUser: UserInDB = {
      id: `usr_cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: customer.name,
      email: customer.email.toLowerCase(),
      phone: customer.phone,
      passwordHash: customer.passwordHash,
      role: 'CUSTOMER', // Strict security: customers can NEVER self-elevate
      isActive: true,
      block: { isBlocked: false },
      notes: [],
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // -------------------------------------------------------------
  // Customer Management & Blocking System
  // -------------------------------------------------------------

  getCustomers(): UserProfile[] {
    const allOrders = this.data.orders;
    return this.data.users
      .filter((u) => u.role === 'CUSTOMER')
      .map((u) => {
        const userOrders = allOrders.filter((o) => o.userId === u.id);
        const deliveredOrders = userOrders.filter((o) => o.status === 'DELIVERED');
        const failedOrders = userOrders.filter((o) => o.status === 'NOT_RECEIVED');
        const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.total, 0);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive !== false,
          block: u.block || { isBlocked: false },
          notes: u.notes || [],
          failedDeliveriesCount: failedOrders.length,
          totalOrders: userOrders.length,
          totalSpent: parseFloat(totalSpent.toFixed(2)),
          lastOrderDate: userOrders.length > 0 ? userOrders[0].createdAt : null,
          createdAt: u.createdAt,
        };
      });
  }

  // Get full detailed customer profile with orders & saved addresses
  getCustomerDetailedProfile(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return null;

    const userOrders = this.data.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const deliveredOrders = userOrders.filter((o) => o.status === 'DELIVERED');
    const totalPurchaseValue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const userAddresses = this.getAddressesByUserId(userId);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive !== false,
      block: user.block || { isBlocked: false },
      notes: user.notes || [],
      createdAt: user.createdAt,
      totalOrders: userOrders.length,
      totalPurchaseValue: parseFloat(totalPurchaseValue.toFixed(2)),
      lastOrderDate: userOrders.length > 0 ? userOrders[0].createdAt : null,
      addresses: userAddresses,
      orders: userOrders,
    };
  }

  // Toggle customer active/deactivated status
  toggleCustomerActive(userId: string, isActive: boolean, updatedBy: UserInDB): UserProfile {
    const user = this.getUserById(userId);
    if (!user) throw new Error('العميل غير موجود.');

    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      throw new Error('لا يمكن تعديل حالة حسابات الإدارة أو المالك من قسم العملاء.');
    }

    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();

    this.addAuditLog({
      performedById: updatedBy.id,
      performedByName: updatedBy.name,
      performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
      action: `${isActive ? 'تفعيل' : 'تعطيل'} حساب العميل: ${user.name}`,
      details: `البريد: ${user.email} | الهاتف: ${user.phone}`,
    });

    this.save();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      block: user.block,
      notes: user.notes,
      createdAt: user.createdAt,
    };
  }

  // Delete customer safely while strictly preserving historical orders and sales records
  deleteCustomerSafely(userId: string, deletedBy: UserInDB): boolean {
    const userIndex = this.data.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return false;

    const targetUser = this.data.users[userIndex];
    if (targetUser.role === 'OWNER' || targetUser.role === 'ADMIN') {
      throw new Error('محمي أمنياً: لا يمكن حذف حسابات مالك المتجر أو المشرفين من إدارة العملاء.');
    }

    // Preserve historical orders!
    // Flag associated orders with customerDeleted: true, retaining customerName, customerPhone, items, total, and timestamps
    let preservedOrdersCount = 0;
    this.data.orders.forEach((order) => {
      if (order.userId === userId) {
        order.customerDeleted = true;
        preservedOrdersCount++;
      }
    });

    // Delete addresses associated with the customer
    this.data.addresses = this.data.addresses.filter((a) => a.userId !== userId);

    // Remove user account from users list
    this.data.users.splice(userIndex, 1);

    this.addAuditLog({
      performedById: deletedBy.id,
      performedByName: deletedBy.name,
      performedByRole: deletedBy.role as 'OWNER' | 'ADMIN',
      action: `حذف حساب العميل: ${targetUser.name}`,
      details: `تم حذف الحساب (${targetUser.email}) مع الحفاظ على ${preservedOrdersCount} طلب سابق في سجل المبيعات والمحاسبة بالكامل.`,
    });

    this.save();
    return true;
  }

  // Check if a customer is blocked or deactivated (by user ID or by phone number)
  checkCustomerBlockStatus(userId: string, phone: string): { isBlocked: boolean; reason?: string } {
    const user = this.getUserById(userId);
    const now = new Date();

    // 0. Check if account is deactivated
    if (user && user.isActive === false) {
      return {
        isBlocked: true,
        reason: 'هذا الحساب معطل حالياً من قِبل إدارة المتجر.',
      };
    }

    // 1. Check user account block
    if (user && user.block && user.block.isBlocked) {
      if (user.block.type === 'TEMPORARY' && user.block.expiresAt) {
        const expiry = new Date(user.block.expiresAt);
        if (now > expiry) {
          // Block expired, automatically unblock
          user.block.isBlocked = false;
          this.save();
        } else {
          return {
            isBlocked: true,
            reason: user.block.reason || 'تم تعليق حسابك مؤقتاً لمخالفة سياسة الطلبات.',
          };
        }
      } else {
        return {
          isBlocked: true,
          reason: user.block.reason || 'تم حظر حسابك لمخالفة سياسة الاستلام والطلبات.',
        };
      }
    }

    // 2. Check phone number in blocked phones list
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const blockedPhone = (this.data.blockedPhones || []).find((bp) => {
      const cleanBp = bp.phone.replace(/[^0-9]/g, '');
      return cleanPhone.endsWith(cleanBp) || cleanBp.endsWith(cleanPhone);
    });

    if (blockedPhone) {
      return {
        isBlocked: true,
        reason: blockedPhone.reason || 'رقم الهاتف هذا محظور من إنشاء طلبات جديدة.',
      };
    }

    return { isBlocked: false };
  }

  blockCustomer(
    userId: string,
    reason: string,
    type: 'TEMPORARY' | 'PERMANENT',
    blockedBy: UserInDB,
    durationDays?: number
  ): UserProfile {
    const user = this.getUserById(userId);
    if (!user) throw new Error('العميل غير موجود.');

    const now = new Date();
    let expiresAt: string | undefined;
    if (type === 'TEMPORARY' && durationDays && durationDays > 0) {
      const expDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    user.block = {
      isBlocked: true,
      type,
      reason,
      blockedAt: now.toISOString(),
      blockedBy: blockedBy.name,
      expiresAt,
    };

    // Also add to blockedPhones table so customer cannot bypass by creating a new account with the same phone
    if (!this.data.blockedPhones) this.data.blockedPhones = [];
    const exists = this.data.blockedPhones.some((bp) => bp.phone === user.phone);
    if (!exists) {
      this.data.blockedPhones.push({
        phone: user.phone,
        reason,
        blockedAt: now.toISOString(),
        blockedBy: blockedBy.name,
      });
    }

    this.addAuditLog({
      performedById: blockedBy.id,
      performedByName: blockedBy.name,
      performedByRole: blockedBy.role as 'OWNER' | 'ADMIN',
      action: `حظر العميل: ${user.name}`,
      details: `النوع: ${type === 'PERMANENT' ? 'دائم' : `مؤقت (${durationDays} يوم)`} | السبب: ${reason} | الهاتف: ${user.phone}`,
    });

    this.save();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      block: user.block,
      notes: user.notes,
      createdAt: user.createdAt,
    };
  }

  unblockCustomer(userId: string, unblockedBy: UserInDB): UserProfile {
    const user = this.getUserById(userId);
    if (!user) throw new Error('العميل غير موجود.');

    user.block = { isBlocked: false };

    // Remove from blockedPhones
    if (this.data.blockedPhones) {
      this.data.blockedPhones = this.data.blockedPhones.filter((bp) => bp.phone !== user.phone);
    }

    this.addAuditLog({
      performedById: unblockedBy.id,
      performedByName: unblockedBy.name,
      performedByRole: unblockedBy.role as 'OWNER' | 'ADMIN',
      action: `إلغاء حظر العميل: ${user.name}`,
      details: `تم فك الحظر عن الحساب ورقم الهاتف ${user.phone}`,
    });

    this.save();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      block: user.block,
      notes: user.notes,
      createdAt: user.createdAt,
    };
  }

  addCustomerNote(userId: string, text: string, createdBy: UserInDB): CustomerNote {
    const user = this.getUserById(userId);
    if (!user) throw new Error('العميل غير موجود.');

    if (!user.notes) user.notes = [];
    const note: CustomerNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      createdBy: createdBy.name,
      createdAt: new Date().toISOString(),
    };
    user.notes.unshift(note);

    this.addAuditLog({
      performedById: createdBy.id,
      performedByName: createdBy.name,
      performedByRole: createdBy.role as 'OWNER' | 'ADMIN',
      action: `إضافة ملاحظة إدارية على العميل: ${user.name}`,
      details: text,
    });

    this.save();
    return note;
  }

  deleteCustomerNote(userId: string, noteId: string): boolean {
    const user = this.getUserById(userId);
    if (!user || !user.notes) return false;
    const initialLen = user.notes.length;
    user.notes = user.notes.filter((n) => n.id !== noteId);
    if (user.notes.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // Store Settings (Business Info, Phones, Announcement)
  // -------------------------------------------------------------

  getSettings(): StoreSettings {
    return this.data.settings;
  }

  updateSettings(updates: Partial<StoreSettings>, updatedBy?: UserInDB): StoreSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
    };
    if (updatedBy) {
      this.addAuditLog({
        performedById: updatedBy.id,
        performedByName: updatedBy.name,
        performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
        action: 'تحديث إعدادات المتجر ومعلومات التواصل',
        details: 'تم تعديل أوقات العمل أو الإعلانات أو أرقام الهواتف',
      });
    }
    this.save();
    return this.data.settings;
  }

  // -------------------------------------------------------------
  // Categories Management
  // -------------------------------------------------------------

  getCategories(): Category[] {
    return this.data.categories;
  }

  createCategory(cat: { nameAr: string; nameEn?: string; slug?: string }, createdBy?: UserInDB): Category {
    const slug = cat.slug || cat.nameEn?.toLowerCase().replace(/\s+/g, '-') || `cat_${Date.now()}`;
    const newCategory: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nameAr: cat.nameAr,
      nameEn: cat.nameEn || cat.nameAr,
      slug,
    };
    this.data.categories.push(newCategory);
    if (createdBy) {
      this.addAuditLog({
        performedById: createdBy.id,
        performedByName: createdBy.name,
        performedByRole: createdBy.role as 'OWNER' | 'ADMIN',
        action: `إضافة تصنيف جديد: ${newCategory.nameAr}`,
      });
    }
    this.save();
    return newCategory;
  }

  updateCategory(id: string, updates: Partial<Category>, updatedBy?: UserInDB): Category | null {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = {
      ...this.data.categories[idx],
      ...updates,
    };
    if (updatedBy) {
      this.addAuditLog({
        performedById: updatedBy.id,
        performedByName: updatedBy.name,
        performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
        action: `تعديل تصنيف: ${this.data.categories[idx].nameAr}`,
      });
    }
    this.save();
    return this.data.categories[idx];
  }

  deleteCategory(id: string, deletedBy?: UserInDB): boolean {
    const cat = this.data.categories.find((c) => c.id === id);
    if (!cat) return false;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);

    // Safely unlink category from products without deleting products
    if (this.data.products) {
      this.data.products.forEach((p) => {
        if (p.categoryId === id) {
          p.categoryId = '';
        }
      });
    }

    // Safely remove category from customization groups
    if (this.data.customizationGroups) {
      this.data.customizationGroups.forEach((g) => {
        if (g.assignedCategoryIds) {
          g.assignedCategoryIds = g.assignedCategoryIds.filter((cid) => cid !== id);
        }
      });
    }

    if (deletedBy) {
      this.addAuditLog({
        performedById: deletedBy.id,
        performedByName: deletedBy.name,
        performedByRole: deletedBy.role as 'OWNER' | 'ADMIN',
        action: `حذف تصنيف: ${cat.nameAr}`,
      });
    }
    this.save();
    return true;
  }

  // -------------------------------------------------------------
  // Customization Groups Management (Dynamic Customization Builder)
  // -------------------------------------------------------------

  getCustomizationGroups(): CustomizationGroup[] {
    return (this.data.customizationGroups || []).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  getCustomizationGroupById(id: string): CustomizationGroup | undefined {
    return (this.data.customizationGroups || []).find((g) => g.id === id);
  }

  createCustomizationGroup(
    groupData: Omit<CustomizationGroup, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy?: UserInDB
  ): CustomizationGroup {
    const now = new Date().toISOString();
    const newGroup: CustomizationGroup = {
      ...groupData,
      id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      options: (groupData.options || []).map((opt) => ({
        ...opt,
        id: opt.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        priceDelta: parseFloat(Number(opt.priceDelta || 0).toFixed(2)),
        isAvailable: opt.isAvailable !== false,
      })),
      createdAt: now,
      updatedAt: now,
    };

    if (!this.data.customizationGroups) {
      this.data.customizationGroups = [];
    }

    this.data.customizationGroups.push(newGroup);

    if (createdBy) {
      this.addAuditLog({
        performedById: createdBy.id,
        performedByName: createdBy.name,
        performedByRole: createdBy.role as 'OWNER' | 'ADMIN',
        action: `إنشاء مجموعة تخصيص جديدة: ${newGroup.nameAr}`,
        details: `النوع: ${newGroup.type} | عدد الخيارات: ${newGroup.options.length}`,
      });
    }

    this.save();
    return newGroup;
  }

  updateCustomizationGroup(
    id: string,
    updates: Partial<CustomizationGroup>,
    updatedBy?: UserInDB
  ): CustomizationGroup | null {
    if (!this.data.customizationGroups) return null;
    const idx = this.data.customizationGroups.findIndex((g) => g.id === id);
    if (idx === -1) return null;

    const current = this.data.customizationGroups[idx];
    const updatedOptions = updates.options !== undefined
      ? updates.options.map((opt) => ({
          ...opt,
          id: opt.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          priceDelta: parseFloat(Number(opt.priceDelta || 0).toFixed(2)),
          isAvailable: opt.isAvailable !== false,
        }))
      : current.options;

    this.data.customizationGroups[idx] = {
      ...current,
      ...updates,
      options: updatedOptions,
      updatedAt: new Date().toISOString(),
    };

    if (updatedBy) {
      this.addAuditLog({
        performedById: updatedBy.id,
        performedByName: updatedBy.name,
        performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
        action: `تعديل مجموعة تخصيص: ${this.data.customizationGroups[idx].nameAr}`,
        details: `الحالة: ${this.data.customizationGroups[idx].isActive ? 'نشط' : 'معطل'} | الخيارات: ${this.data.customizationGroups[idx].options.length}`,
      });
    }

    this.save();
    return this.data.customizationGroups[idx];
  }

  deleteCustomizationGroup(id: string, deletedBy?: UserInDB): boolean {
    if (!this.data.customizationGroups) return false;
    const target = this.data.customizationGroups.find((g) => g.id === id);
    if (!target) return false;

    this.data.customizationGroups = this.data.customizationGroups.filter((g) => g.id !== id);

    // Safely unlink from products without altering products
    if (this.data.products) {
      this.data.products.forEach((p) => {
        if (p.customizationGroupIds) {
          p.customizationGroupIds = p.customizationGroupIds.filter((gid) => gid !== id);
        }
      });
    }

    if (deletedBy) {
      this.addAuditLog({
        performedById: deletedBy.id,
        performedByName: deletedBy.name,
        performedByRole: deletedBy.role as 'OWNER' | 'ADMIN',
        action: `حذف مجموعة تخصيص: ${target.nameAr}`,
        details: `تم حذف المجموعة مع الحفاظ على سجلات الطلبات التاريخية دون أي تأثر`,
      });
    }

    this.save();
    return true;
  }

  getCustomizationGroupsForProduct(productId: string, categoryId?: string): CustomizationGroup[] {
    if (!this.data.customizationGroups) return [];
    return this.data.customizationGroups
      .filter((g) => {
        if (!g.isActive) return false;
        if (g.assignedToAll) return true;
        if (g.assignedProductIds && g.assignedProductIds.includes(productId)) return true;
        if (categoryId && g.assignedCategoryIds && g.assignedCategoryIds.includes(categoryId)) return true;
        return false;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  // -------------------------------------------------------------
  // Products Management
  // -------------------------------------------------------------

  getProducts(onlyPublished = false): DonutProduct[] {
    if (onlyPublished) {
      return this.data.products.filter((p) => p.isPublished);
    }
    return this.data.products;
  }

  getProductById(id: string): DonutProduct | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  createProduct(item: Omit<DonutProduct, 'id' | 'createdAt' | 'updatedAt'>, createdBy?: UserInDB): DonutProduct {
    const now = new Date().toISOString();
    const newProduct: DonutProduct = {
      ...item,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.products.push(newProduct);
    if (createdBy) {
      this.addAuditLog({
        performedById: createdBy.id,
        performedByName: createdBy.name,
        performedByRole: createdBy.role as 'OWNER' | 'ADMIN',
        action: `إضافة منتج دونتس جديد: ${newProduct.nameAr}`,
        details: `السعر: ${newProduct.basePrice} ج.م. | الحالة: ${newProduct.isPublished ? 'منشور' : 'مسودة'}`,
      });
    }
    this.save();
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<DonutProduct>, updatedBy?: UserInDB): DonutProduct | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = {
      ...this.data.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updatedBy) {
      this.addAuditLog({
        performedById: updatedBy.id,
        performedByName: updatedBy.name,
        performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
        action: `تعديل منتج: ${this.data.products[idx].nameAr}`,
        details: `السعر الحالي: ${this.data.products[idx].basePrice} ج.م. | متوفر: ${this.data.products[idx].isAvailable ? 'نعم' : 'لا'}`,
      });
    }
    this.save();
    return this.data.products[idx];
  }

  deleteProduct(id: string, deletedBy?: UserInDB): boolean {
    const prod = this.data.products.find((p) => p.id === id);
    if (!prod) return false;
    this.data.products = this.data.products.filter((p) => p.id !== id);

    // Safely remove from customization groups assignments
    if (this.data.customizationGroups) {
      this.data.customizationGroups.forEach((g) => {
        if (g.assignedProductIds) {
          g.assignedProductIds = g.assignedProductIds.filter((pid) => pid !== id);
        }
      });
    }

    if (deletedBy) {
      this.addAuditLog({
        performedById: deletedBy.id,
        performedByName: deletedBy.name,
        performedByRole: deletedBy.role as 'OWNER' | 'ADMIN',
        action: `حذف منتج: ${prod.nameAr}`,
      });
    }
    this.save();
    return true;
  }

  // -------------------------------------------------------------
  // Delivery Locations & Fees Management
  // -------------------------------------------------------------

  getDeliveryLocations(onlyActive = false): DeliveryLocation[] {
    if (onlyActive) {
      return this.data.deliveryLocations.filter((l) => l.isActive);
    }
    return this.data.deliveryLocations;
  }

  getDeliveryLocationById(id: string): DeliveryLocation | undefined {
    return this.data.deliveryLocations.find((l) => l.id === id);
  }

  createDeliveryLocation(location: Omit<DeliveryLocation, 'id'>, createdBy?: UserInDB): DeliveryLocation {
    const newLocation: DeliveryLocation = {
      ...location,
      id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    this.data.deliveryLocations.push(newLocation);
    if (createdBy) {
      this.addAuditLog({
        performedById: createdBy.id,
        performedByName: createdBy.name,
        performedByRole: createdBy.role as 'OWNER' | 'ADMIN',
        action: `إضافة منطقة توصيل: ${newLocation.governorate} - ${newLocation.area}`,
        details: `رسوم التوصيل: ${newLocation.deliveryFee} ج.م. | الحد الأدنى: ${newLocation.minOrder} ج.م.`,
      });
    }
    this.save();
    return newLocation;
  }

  updateDeliveryLocation(id: string, updates: Partial<DeliveryLocation>, updatedBy?: UserInDB): DeliveryLocation | null {
    const idx = this.data.deliveryLocations.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    this.data.deliveryLocations[idx] = {
      ...this.data.deliveryLocations[idx],
      ...updates,
    };
    if (updatedBy) {
      this.addAuditLog({
        performedById: updatedBy.id,
        performedByName: updatedBy.name,
        performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
        action: `تعديل منطقة التوصيل: ${this.data.deliveryLocations[idx].area}`,
        details: `رسوم التوصيل الجديدة: ${this.data.deliveryLocations[idx].deliveryFee} ج.م.`,
      });
    }
    this.save();
    return this.data.deliveryLocations[idx];
  }

  deleteDeliveryLocation(id: string, deletedBy?: UserInDB): boolean {
    const loc = this.data.deliveryLocations.find((l) => l.id === id);
    if (!loc) return false;
    this.data.deliveryLocations = this.data.deliveryLocations.filter((l) => l.id !== id);

    // Safely unlink from saved addresses without deleting addresses
    if (this.data.addresses) {
      this.data.addresses.forEach((a) => {
        if (a.deliveryLocationId === id) {
          a.deliveryLocationId = '';
        }
      });
    }

    if (deletedBy) {
      this.addAuditLog({
        performedById: deletedBy.id,
        performedByName: deletedBy.name,
        performedByRole: deletedBy.role as 'OWNER' | 'ADMIN',
        action: `حذف منطقة التوصيل: ${loc.area}`,
      });
    }
    this.save();
    return true;
  }

  // -------------------------------------------------------------
  // Customer Addresses
  // -------------------------------------------------------------

  getAddressesByUserId(userId: string): Address[] {
    return this.data.addresses.filter((a) => a.userId === userId);
  }

  getAddressById(id: string): Address | undefined {
    return this.data.addresses.find((a) => a.id === id);
  }

  createAddress(address: Omit<Address, 'id' | 'createdAt'>): Address {
    const now = new Date().toISOString();
    if (address.isDefault) {
      this.data.addresses.forEach((a) => {
        if (a.userId === address.userId) a.isDefault = false;
      });
    }
    const newAddress: Address = {
      ...address,
      id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
    };
    this.data.addresses.push(newAddress);
    this.save();
    return newAddress;
  }

  deleteAddress(id: string, userId: string): boolean {
    const initialLen = this.data.addresses.length;
    this.data.addresses = this.data.addresses.filter((a) => !(a.id === id && a.userId === userId));
    if (this.data.addresses.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // Order Management (Server-Side Price, EGP Calculation & Block Checks)
  // -------------------------------------------------------------

  getOrders(): Order[] {
    return [...this.data.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getOrdersByUserId(userId: string): Order[] {
    return this.data.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderByIdOrNumber(identifier: string): Order | undefined {
    const num = parseInt(identifier, 10);
    return this.data.orders.find(
      (o) => o.id === identifier || (!isNaN(num) && o.orderNumber === num)
    );
  }

  createOrder(orderData: {
    userId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    addressId: string;
    addressDetails: Address;
    deliveryLocation: DeliveryLocation;
    items: Array<{
      productId: string;
      quantity: number;
      selectedOption?: string;
      selectedCustomizations?: SelectedCustomizationItem[];
      customNotes?: string;
    }>;
    notes?: string;
  }): { order: Order; error?: string } {
    // 0. Strict Server-Side Check: Verify if customer account or phone is blocked!
    const blockStatus = this.checkCustomerBlockStatus(orderData.userId, orderData.customerPhone);
    if (blockStatus.isBlocked) {
      return {
        order: null as any,
        error: `عذراً، لا يمكن إتمام الطلب: ${blockStatus.reason || 'الحساب أو رقم الهاتف محظور من الطلب.'}`,
      };
    }

    // 1. Strict Server-side Validation: Verify Donut/Drink Availability and Current Price in EGP
    let subtotal = 0;
    const validatedItems: OrderItem[] = [];

    for (const item of orderData.items) {
      const product = this.getProductById(item.productId);
      if (!product || !product.isPublished) {
        return {
          order: null as any,
          error: `المنتج المختار غير متوفر حالياً في المتجر.`,
        };
      }
      if (!product.isAvailable) {
        return {
          order: null as any,
          error: `عذراً، منتج (${product.nameAr}) غير متوفر حالياً.`,
        };
      }

      const basePrice = Number(product.basePrice);
      let optionsPriceDelta = 0;
      const validatedCustomizations: SelectedCustomizationItem[] = [];

      // Fetch applicable customization groups for this product/category
      const applicableGroups = this.getCustomizationGroupsForProduct(product.id, product.categoryId);

      if (item.selectedCustomizations && Array.isArray(item.selectedCustomizations)) {
        for (const sel of item.selectedCustomizations) {
          const group = applicableGroups.find((g) => g.id === sel.groupId);
          if (!group) continue; // Skip unknown or unassigned groups

          if (group.type === 'SINGLE_SELECT' || group.type === 'DROPDOWN' || group.type === 'MULTI_SELECT') {
            const optId = sel.optionId || (sel as any).selectedOptionId;
            const opt = group.options.find((o) => o.id === optId);
            if (opt && opt.isAvailable !== false) {
              const delta = Number(opt.priceDelta) || 0;
              optionsPriceDelta += delta;
              validatedCustomizations.push({
                groupId: group.id,
                groupNameAr: group.nameAr,
                groupNameEn: group.nameEn,
                type: group.type,
                optionId: opt.id,
                optionNameAr: opt.nameAr,
                optionNameEn: opt.nameEn,
                priceDelta: delta,
              });
            }
          } else if (group.type === 'TEXT' || group.type === 'TEXTAREA') {
            const textVal = String(sel.textValue || '').trim();
            if (textVal) {
              validatedCustomizations.push({
                groupId: group.id,
                groupNameAr: group.nameAr,
                groupNameEn: group.nameEn,
                type: group.type,
                textValue: textVal.slice(0, 500),
                priceDelta: 0,
              });
            }
          } else if (group.type === 'NUMBER') {
            const numVal = Number(sel.numberValue) || 0;
            validatedCustomizations.push({
              groupId: group.id,
              groupNameAr: group.nameAr,
              groupNameEn: group.nameEn,
              type: group.type,
              numberValue: numVal,
              priceDelta: 0,
            });
          }
        }
      }

      // Process direct product choices / options (ProductOption[])
      const validatedProductOptions: ProductOption[] = [];
      const prodOptions = product.options || [];
      if ((item as any).selectedProductOptions && Array.isArray((item as any).selectedProductOptions)) {
        for (const selOpt of (item as any).selectedProductOptions) {
          const optId = selOpt.id;
          const officialOpt = prodOptions.find((o) => o.id === optId);
          if (officialOpt) {
            const delta = Number(officialOpt.priceDelta) || 0;
            optionsPriceDelta += delta;
            validatedProductOptions.push({
              id: officialOpt.id,
              nameAr: officialOpt.nameAr,
              nameEn: officialOpt.nameEn || officialOpt.nameAr,
              priceDelta: delta,
            });
          }
        }
      }

      // Check required groups
      for (const reqGroup of applicableGroups.filter((g) => g.isRequired)) {
        const hasSelection = validatedCustomizations.some((vc) => vc.groupId === reqGroup.id);
        if (!hasSelection) {
          return {
            order: null as any,
            error: `يرجى تحديد خيار في قسم (${reqGroup.nameAr}) المطلوب لمنتج (${product.nameAr}).`,
          };
        }
      }

      const unitPrice = parseFloat((basePrice + optionsPriceDelta).toFixed(2));
      subtotal += unitPrice * item.quantity;

      let optionSummary = item.selectedOption || '';
      if (!optionSummary && validatedProductOptions.length > 0) {
        optionSummary = validatedProductOptions
          .map((o) => `${o.nameAr}${o.priceDelta > 0 ? ` (+${o.priceDelta} ج.م.)` : ''}`)
          .join('، ');
      }

      validatedItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productNameAr: product.nameAr,
        productNameEn: product.nameEn,
        imageUrl: product.mainImage || (product.images && product.images[0]) || '',
        quantity: item.quantity,
        basePrice,
        unitPrice,
        selectedOption: optionSummary,
        selectedProductOptions: validatedProductOptions,
        selectedCustomizations: validatedCustomizations,
        customNotes: item.customNotes,
      });
    }

    if (validatedItems.length === 0) {
      return { order: null as any, error: 'سلة المشتريات فارغة.' };
    }

    // 2. Strict Delivery Location Validation
    const location = orderData.deliveryLocation;
    if (!location || !location.isActive) {
      return { order: null as any, error: 'منطقة التوصيل المختارة غير متاحة حالياً.' };
    }

    if (subtotal < location.minOrder) {
      return {
        order: null as any,
        error: `الحد الأدنى للطلب في منطقة (${location.area}) هو ${location.minOrder} ج.م.`,
      };
    }

    const deliveryFee = Number(location.deliveryFee);
    const total = subtotal + deliveryFee;

    this.data.lastOrderNumber += 1;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber: this.data.lastOrderNumber,
      userId: orderData.userId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail,
      addressId: orderData.addressId,
      addressDetails: {
        title: orderData.addressDetails.title,
        governorate: orderData.addressDetails.governorate,
        city: orderData.addressDetails.city,
        area: orderData.addressDetails.area,
        street: orderData.addressDetails.street,
        buildingNumber: orderData.addressDetails.buildingNumber,
        floor: orderData.addressDetails.floor,
        apartment: orderData.addressDetails.apartment,
        landmark: orderData.addressDetails.landmark,
      },
      deliveryLocationId: location.id,
      locationSummary: `${location.governorate} - ${location.city} - ${location.area}`,
      status: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          timestamp: now,
          note: 'تم استلام الطلب من العميل والدفع عند الاستلام',
        },
      ],
      subtotal: parseFloat(subtotal.toFixed(2)),
      deliveryFee: parseFloat(deliveryFee.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      notes: orderData.notes,
      paymentMethod: 'COD',
      createdAt: now,
      updatedAt: now,
      items: validatedItems,
    };

    this.data.orders.push(newOrder);
    this.save();
    return { order: newOrder };
  }

  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    reason?: string,
    note?: string,
    updatedBy?: UserInDB
  ): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const currentOrder = this.data.orders[idx];

    let noteText = note;
    if (status === 'CANCELLED') {
      noteText = reason ? `تم إلغاء الطلب: ${reason}` : 'تم إلغاء الطلب';
    } else if (status === 'NOT_RECEIVED') {
      noteText = reason ? `لم يتم الاستلام: ${reason}` : 'فشل تسليم الطلب للعميل';
    }

    const historyEntry = {
      status,
      timestamp: now,
      note: noteText,
    };

    this.data.orders[idx] = {
      ...currentOrder,
      status,
      cancellationReason: reason || currentOrder.cancellationReason,
      statusHistory: [...(currentOrder.statusHistory || []), historyEntry],
      updatedAt: now,
    };

    if (updatedBy) {
      this.addAuditLog({
        performedById: updatedBy.id,
        performedByName: updatedBy.name,
        performedByRole: updatedBy.role as 'OWNER' | 'ADMIN',
        action: `تحديث حالة الطلب #${currentOrder.orderNumber} إلى [${status}]`,
        details: reason ? `السبب/الملاحظة: ${reason}` : undefined,
      });
    }

    this.save();
    return this.data.orders[idx];
  }

  // -------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------

  getAnalytics() {
    const orders = this.data.orders;
    const completedOrders = orders.filter((o) => o.status === 'DELIVERED');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const activeOrders = orders.filter(
      (o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'OUT_FOR_DELIVERY'
    ).length;

    const statusCounts: Record<string, number> = {};
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    const donutSales: Record<string, { nameAr: string; nameEn: string; count: number; revenue: number }> = {};
    for (const o of orders) {
      if (o.status !== 'CANCELLED' && o.status !== 'NOT_RECEIVED') {
        for (const it of o.items) {
          if (!donutSales[it.productId]) {
            donutSales[it.productId] = {
              nameAr: it.productNameAr,
              nameEn: it.productNameEn,
              count: 0,
              revenue: 0,
            };
          }
          donutSales[it.productId].count += it.quantity;
          donutSales[it.productId].revenue += it.quantity * it.unitPrice;
        }
      }
    }

    const popularDonuts = Object.entries(donutSales)
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      activeOrders,
      completedOrdersCount: completedOrders.length,
      averageOrderValue: completedOrders.length > 0 ? parseFloat((totalRevenue / completedOrders.length).toFixed(2)) : 0,
      statusCounts,
      popularDonuts,
      customerCount: this.data.users.filter((u) => u.role === 'CUSTOMER').length,
      productCount: this.data.products.length,
      publishedProductCount: this.data.products.filter((p) => p.isPublished).length,
      blockedCustomerCount: this.data.users.filter((u) => u.role === 'CUSTOMER' && u.block?.isBlocked).length,
    };
  }

  // Reset database to completely empty state (for owner testing if desired)
  resetToCleanState() {
    this.data.categories = [];
    this.data.products = [];
    this.data.deliveryLocations = [];
    this.data.orders = [];
    this.data.auditLogs = [];
    this.save();
  }
}

export const db = new Database();
