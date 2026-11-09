import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  ProductOption,
  MonthlyAccountingSummary,
  MonthlyAccountingReport,
  MonthlyArchiveRecord,
  SpecialOffer,
  SpecialOfferItem,
  Advertisement,
  AdPlacement,
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
  monthlyArchives: MonthlyArchiveRecord[];
  activeAccountingMonth?: string;
  offers: SpecialOffer[];
  advertisements: Advertisement[];
  lastOrderNumber: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reliable workspace data directory resolution regardless of process cwd
function resolveDataDir(): string {
  const candidateDirs = [
    path.resolve(process.cwd(), 'data'),
    path.resolve(__dirname, '../../data'),
    path.resolve(__dirname, '../data'),
  ];
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'wave_donuts_db.json'))) {
      return dir;
    }
  }
  const defaultDir = candidateDirs[0];
  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
    } catch {}
  }
  return defaultDir;
}

const DB_DIR = resolveDataDir();
const DB_FILE = path.join(DB_DIR, 'wave_donuts_db.json');
const DB_BACKUP_FILE = path.join(DB_DIR, 'wave_donuts_db.json.bak');
const BACKUPS_DIR = path.join(DB_DIR, 'backups');

const DEFAULT_OWNER_PERMISSIONS: AdminPermissions = {
  canManageProducts: true,
  canManageOrders: true,
  canManageDelivery: true,
  canManageSettings: true,
  canManageCustomers: true,
};

// Evaluate database completeness to prevent corrupt or empty overwrites
function evaluateDatabaseIntegrity(data: any): number {
  if (!data || typeof data !== 'object') return -1;
  let score = 10;
  if (Array.isArray(data.users)) {
    score += data.users.length * 10;
    const hasOwner = data.users.some((u: any) => u.role === 'OWNER');
    if (hasOwner) score += 200; // Critical requirement: Must preserve Owner!
    const hasAdmin = data.users.some((u: any) => u.role === 'ADMIN');
    if (hasAdmin) score += 20;
  }
  if (Array.isArray(data.products)) {
    score += data.products.length * 15;
  }
  if (Array.isArray(data.categories)) {
    score += data.categories.length * 10;
  }
  if (Array.isArray(data.deliveryLocations)) {
    score += data.deliveryLocations.length * 10;
  }
  if (Array.isArray(data.orders)) {
    score += data.orders.length * 15;
  }
  if (Array.isArray(data.customizationGroups)) {
    score += data.customizationGroups.length * 10;
  }
  if (Array.isArray(data.offers)) {
    score += data.offers.length * 5;
  }
  if (Array.isArray(data.advertisements)) {
    score += data.advertisements.length * 5;
  }
  if (data.settings && typeof data.settings === 'object' && data.settings.businessNameAr) {
    score += 10;
  }
  return score;
}

function loadAndValidateFile(
  filePath: string,
  defaultSettings: StoreSettings
): { data: DatabaseSchema | null; score: number } {
  try {
    if (!fs.existsSync(filePath)) return { data: null, score: -1 };
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content || !content.trim()) return { data: null, score: -1 };
    const parsed = JSON.parse(content);
    const score = evaluateDatabaseIntegrity(parsed);
    if (score < 0) return { data: null, score: -1 };

    const schema: DatabaseSchema = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      addresses: Array.isArray(parsed.addresses) ? parsed.addresses : [],
      deliveryLocations: Array.isArray(parsed.deliveryLocations) ? parsed.deliveryLocations : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      customizationGroups: Array.isArray(parsed.customizationGroups) ? parsed.customizationGroups : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      settings:
        parsed.settings && typeof parsed.settings === 'object'
          ? { ...defaultSettings, ...parsed.settings }
          : defaultSettings,
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      blockedPhones: Array.isArray(parsed.blockedPhones) ? parsed.blockedPhones : [],
      monthlyArchives: Array.isArray(parsed.monthlyArchives) ? parsed.monthlyArchives : [],
      activeAccountingMonth:
        typeof parsed.activeAccountingMonth === 'string'
          ? parsed.activeAccountingMonth
          : undefined,
      offers: Array.isArray(parsed.offers) ? parsed.offers : [],
      advertisements: Array.isArray(parsed.advertisements) ? parsed.advertisements : [],
      lastOrderNumber: typeof parsed.lastOrderNumber === 'number' ? parsed.lastOrderNumber : 100,
    };
    return { data: schema, score };
  } catch (err) {
    console.warn(`[Wave Donuts DB] Could not read or parse ${filePath}:`, err);
    return { data: null, score: -1 };
  }
}

// Multi-tier resilient database initialization
function initDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
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

  // 1. Check primary file
  const primary = loadAndValidateFile(DB_FILE, defaultSettings);
  const primaryHasOwner = primary.data?.users.some((u) => u.role === 'OWNER') ?? false;

  // If primary file is healthy and contains owner and records, use it and maintain backup
  if (primary.data && primaryHasOwner && primary.score >= 200) {
    try {
      fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
    } catch {}
    return primary.data;
  }

  // 2. If primary is missing, unparseable, or missing owner, search for best available backup
  console.warn('[Wave Donuts DB] Primary database file missing or incomplete. Scanning for best recovery snapshot...');
  
  // If primary file exists but is corrupted, preserve it before anything else
  if (fs.existsSync(DB_FILE) && (!primary.data || primary.score < 0)) {
    const corruptBackup = path.join(BACKUPS_DIR, `wave_donuts_db_corrupted_${Date.now()}.json`);
    try {
      fs.copyFileSync(DB_FILE, corruptBackup);
      console.warn(`[Wave Donuts DB] Preserved corrupted database file to ${corruptBackup}`);
    } catch {}
  }

  // Candidate files:
  const candidateFiles: string[] = [];
  if (fs.existsSync(DB_BACKUP_FILE)) candidateFiles.push(DB_BACKUP_FILE);

  // Scan DB_DIR for all wave_donuts_db*.json* backups
  try {
    const dbDirFiles = fs.readdirSync(DB_DIR);
    for (const file of dbDirFiles) {
      if (file !== 'wave_donuts_db.json' && file.startsWith('wave_donuts_db') && !file.includes('.tmp.')) {
        candidateFiles.push(path.join(DB_DIR, file));
      }
    }
  } catch {}

  // Scan BACKUPS_DIR
  try {
    const backupDirFiles = fs.readdirSync(BACKUPS_DIR);
    for (const file of backupDirFiles) {
      if (file.endsWith('.json') && !file.includes('corrupted')) {
        candidateFiles.push(path.join(BACKUPS_DIR, file));
      }
    }
  } catch {}

  let bestData: DatabaseSchema | null = primary.data;
  let highestScore = primary.score;
  let bestFilePath: string = DB_FILE;

  for (const filePath of candidateFiles) {
    const res = loadAndValidateFile(filePath, defaultSettings);
    if (res.data && res.score > highestScore) {
      highestScore = res.score;
      bestData = res.data;
      bestFilePath = filePath;
    }
  }

  if (bestData && highestScore > 0) {
    console.info(`[Wave Donuts DB] Restored database from best available snapshot: ${bestFilePath} (Score: ${highestScore})`);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(bestData, null, 2), 'utf-8');
      fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
    } catch (writeErr) {
      console.error('[Wave Donuts DB] Error writing restored database to primary file:', writeErr);
    }
    return bestData;
  }

  // 3. Absolute last resort fallback ONLY if no files or backups exist anywhere
  console.warn('[Wave Donuts DB] No existing database or backups found. Initializing empty schema.');
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
    monthlyArchives: [],
    offers: [],
    advertisements: [],
    lastOrderNumber: 100,
  };

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cleanInitialData, null, 2), 'utf-8');
  } catch {}
  return cleanInitialData;
}

class Database {
  private data: DatabaseSchema;
  private lastAutoBackupTime = 0;

  constructor() {
    this.data = initDatabase();
  }

  // Safe Atomic file save with anti-wipe validation and multi-generational rotating backups
  private save() {
    try {
      // 1. Pre-save Anti-Data-Loss Safety Guard
      if (!this.data || typeof this.data !== 'object') {
        throw new Error('[Wave Donuts DB] Fatal: Attempted to save invalid or null database object. Write aborted!');
      }

      // Invariant: If database already exists on disk, never overwrite with 0 users!
      if (fs.existsSync(DB_FILE)) {
        try {
          const diskContent = fs.readFileSync(DB_FILE, 'utf-8');
          const diskParsed = JSON.parse(diskContent);
          const diskUsersCount = Array.isArray(diskParsed.users) ? diskParsed.users.length : 0;
          const currentUsersCount = Array.isArray(this.data.users) ? this.data.users.length : 0;
          if (diskUsersCount > 0 && currentUsersCount === 0) {
            console.error('[Wave Donuts DB] CRITICAL ANOMALY: Refusing to save database because users list is empty while disk has existing users!');
            throw new Error('Refusing to overwrite database: users list was unexpectedly cleared.');
          }
          const diskProductsCount = Array.isArray(diskParsed.products) ? diskParsed.products.length : 0;
          const currentProductsCount = Array.isArray(this.data.products) ? this.data.products.length : 0;
          if (diskProductsCount > 1 && currentProductsCount === 0) {
            console.error('[Wave Donuts DB] CRITICAL ANOMALY: Refusing to save database because all products were unexpectedly cleared!');
            throw new Error('Refusing to overwrite database: all products were unexpectedly cleared.');
          }
        } catch (e: any) {
          if (e.message?.includes('Refusing')) throw e;
          // If disk file couldn't be parsed, continue with saving healthy in-memory state
        }
      }

      // Ensure all arrays exist
      if (!Array.isArray(this.data.users)) this.data.users = [];
      if (!Array.isArray(this.data.addresses)) this.data.addresses = [];
      if (!Array.isArray(this.data.deliveryLocations)) this.data.deliveryLocations = [];
      if (!Array.isArray(this.data.categories)) this.data.categories = [];
      if (!Array.isArray(this.data.products)) this.data.products = [];
      if (!Array.isArray(this.data.customizationGroups)) this.data.customizationGroups = [];
      if (!Array.isArray(this.data.orders)) this.data.orders = [];
      if (!Array.isArray(this.data.auditLogs)) this.data.auditLogs = [];
      if (!Array.isArray(this.data.blockedPhones)) this.data.blockedPhones = [];
      if (!Array.isArray(this.data.monthlyArchives)) this.data.monthlyArchives = [];
      if (!Array.isArray(this.data.offers)) this.data.offers = [];
      if (!Array.isArray(this.data.advertisements)) this.data.advertisements = [];

      // 2. Atomic disk write
      const tempFile = path.join(
        DB_DIR,
        `.tmp_db_${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json`
      );
      const payload = JSON.stringify(this.data, null, 2);

      const fd = fs.openSync(tempFile, 'w');
      fs.writeFileSync(fd, payload, 'utf-8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      fs.renameSync(tempFile, DB_FILE);

      // 3. Keep immediate primary backup
      try {
        fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);
      } catch {}

      // 4. Maintain rotating multi-generational rolling backups (throttled to at most once per 30s)
      const now = Date.now();
      if (now - this.lastAutoBackupTime > 30000) {
        this.lastAutoBackupTime = now;
        try {
          if (!fs.existsSync(BACKUPS_DIR)) {
            fs.mkdirSync(BACKUPS_DIR, { recursive: true });
          }
          const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
          const autoBackupPath = path.join(BACKUPS_DIR, `wave_donuts_db_auto_${timestampStr}.json`);
          fs.copyFileSync(DB_FILE, autoBackupPath);

          // Keep latest 20 backups, prune older ones
          const files = fs
            .readdirSync(BACKUPS_DIR)
            .filter((f) => f.startsWith('wave_donuts_db_auto_') && f.endsWith('.json'))
            .sort();
          if (files.length > 20) {
            const toDelete = files.slice(0, files.length - 20);
            for (const f of toDelete) {
              try {
                fs.unlinkSync(path.join(BACKUPS_DIR, f));
              } catch {}
            }
          }
        } catch (backupErr) {
          console.warn('[Wave Donuts DB] Rolling backup warning:', backupErr);
        }
      }
    } catch (err: any) {
      console.error('[Wave Donuts DB] Critical database save error:', err);
      throw err;
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
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email && u.email.trim().toLowerCase() === clean);
  }

  getUserByIdentifier(identifier: string): UserInDB | undefined {
    if (!identifier) return undefined;
    const cleanRaw = identifier.trim();
    const cleanLower = cleanRaw.toLowerCase();
    const cleanPhone = normalizePhoneAndNumerals(cleanRaw).replace(/^(\+20|0020|20)/, '0');

    return this.data.users.find((u) => {
      // 1. Direct Email Match (case-insensitive & trimmed)
      if (u.email && u.email.trim().toLowerCase() === cleanLower) {
        return true;
      }
      // 2. Phone Match (handles Egyptian prefixes, spaces, and leading zeroes)
      if (u.phone) {
        const uPhoneNormalized = normalizePhoneAndNumerals(u.phone).replace(/^(\+20|0020|20)/, '0');
        if (cleanPhone.length >= 8 && uPhoneNormalized.length >= 8) {
          if (uPhoneNormalized === cleanPhone) return true;
          // Compare last 9 digits for Egyptian mobile numbers (e.g. 100000001)
          if (cleanPhone.slice(-9) === uPhoneNormalized.slice(-9)) return true;
        }
      }
      return false;
    });
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
    const cleanUpdates: Partial<StoreSettings> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        (cleanUpdates as any)[key] = val;
      }
    }
    this.data.settings = {
      ...this.data.settings,
      ...cleanUpdates,
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
    const cleanUpdates: Partial<Category> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && key !== 'id') {
        (cleanUpdates as any)[key] = val;
      }
    }
    this.data.categories[idx] = {
      ...this.data.categories[idx],
      ...cleanUpdates,
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
    const cleanUpdates: Partial<CustomizationGroup> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && key !== 'id' && key !== 'createdAt') {
        (cleanUpdates as any)[key] = val;
      }
    }

    const updatedOptions = Array.isArray(updates.options)
      ? updates.options.map((opt) => ({
          ...opt,
          id: opt.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          priceDelta: parseFloat(Number(opt.priceDelta || 0).toFixed(2)),
          isAvailable: opt.isAvailable !== false,
        }))
      : current.options || [];

    this.data.customizationGroups[idx] = {
      ...current,
      ...cleanUpdates,
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
    const current = this.data.products[idx];

    const cleanUpdates: Partial<DonutProduct> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && key !== 'id' && key !== 'createdAt') {
        (cleanUpdates as any)[key] = val;
      }
    }

    // Preserve arrays if not explicitly provided as arrays in updates
    if (updates.options !== undefined && Array.isArray(updates.options)) {
      cleanUpdates.options = updates.options;
    } else if (cleanUpdates.options === undefined) {
      cleanUpdates.options = current.options || [];
    }

    if (updates.images !== undefined && Array.isArray(updates.images)) {
      cleanUpdates.images = updates.images;
    } else if (cleanUpdates.images === undefined) {
      cleanUpdates.images = current.images || [];
    }

    if (updates.customizationGroupIds !== undefined && Array.isArray(updates.customizationGroupIds)) {
      cleanUpdates.customizationGroupIds = updates.customizationGroupIds;
    } else if (cleanUpdates.customizationGroupIds === undefined) {
      cleanUpdates.customizationGroupIds = current.customizationGroupIds || [];
    }

    this.data.products[idx] = {
      ...current,
      ...cleanUpdates,
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
    const cleanUpdates: Partial<DeliveryLocation> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined && key !== 'id') {
        (cleanUpdates as any)[key] = val;
      }
    }
    this.data.deliveryLocations[idx] = {
      ...this.data.deliveryLocations[idx],
      ...cleanUpdates,
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
      if (item.isOffer || item.productId.startsWith('off_')) {
        const offer = this.getOfferById(item.productId);
        if (!offer || !offer.isActive) {
          return {
            order: null as any,
            error: `العرض المختار غير متوفر حالياً.`,
          };
        }
        const now = new Date();
        if (offer.startDate && new Date(offer.startDate) > now) {
          return {
            order: null as any,
            error: `العرض المختار لم يبدأ بعد.`,
          };
        }
        if (offer.endDate && new Date(offer.endDate) < now) {
          return {
            order: null as any,
            error: `عذراً، انتهت صلاحية العرض المختار (${offer.nameAr}).`,
          };
        }

        const offerPrice = Number(offer.price) || 0;
        const offerSummary = item.offerItemsSummary || (offer.items && offer.items.map((it) => `${it.quantity}× ${it.productNameAr}`).join(' + ')) || 'عرض خاص';

        subtotal += offerPrice * item.quantity;
        validatedItems.push({
          id: `item_off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId: offer.id,
          productNameAr: `[عرض خاص] ${offer.nameAr}`,
          productNameEn: offer.nameEn ? `[Special Offer] ${offer.nameEn}` : `[Special Offer] ${offer.nameAr}`,
          imageUrl: offer.imageUrl,
          quantity: item.quantity,
          basePrice: offerPrice,
          unitPrice: offerPrice,
          selectedOption: offerSummary,
          isOffer: true,
          offerId: offer.id,
          offerItemsSummary: offerSummary,
          customNotes: item.customNotes,
        });
        continue;
      }

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

  // -------------------------------------------------------------
  // Monthly Accounting & Archiving System (Owner-Only)
  // -------------------------------------------------------------

  getAvailableAccountingMonths(): {
    months: Array<{
      key: string;
      nameAr: string;
      nameEn: string;
      isClosed: boolean;
      closedAt?: string;
      orderCount: number;
      totalSales: number;
    }>;
    availableMonths: string[];
    activeMonth: string;
    archives: MonthlyArchiveRecord[];
  } {
    const monthKeysSet = new Set<string>();

    // Current calendar month (e.g. "2026-11")
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    monthKeysSet.add(currentMonthKey);

    // Active operational month if defined
    if (this.data.activeAccountingMonth) {
      monthKeysSet.add(this.data.activeAccountingMonth);
    }

    // Months from historical orders
    for (const order of this.data.orders) {
      if (order.createdAt && order.createdAt.length >= 7) {
        monthKeysSet.add(order.createdAt.slice(0, 7));
      }
    }

    // Months from archives
    if (this.data.monthlyArchives) {
      for (const arch of this.data.monthlyArchives) {
        if (arch.monthKey) {
          monthKeysSet.add(arch.monthKey);
        }
      }
    }

    const monthNamesAr: Record<string, string> = {
      '01': 'يناير',
      '02': 'فبراير',
      '03': 'مارس',
      '04': 'أبريل',
      '05': 'مايو',
      '06': 'يونيو',
      '07': 'يوليو',
      '08': 'أغسطس',
      '09': 'سبتمبر',
      '10': 'أكتوبر',
      '11': 'نوفمبر',
      '12': 'ديسمبر',
    };

    const monthNamesEn: Record<string, string> = {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    };

    const sortedKeys = Array.from(monthKeysSet).sort().reverse();
    const archives = this.data.monthlyArchives || [];

    const months = sortedKeys.map((key) => {
      const [year, monthNum] = key.split('-');
      const nameAr = `${monthNamesAr[monthNum] || monthNum} ${year}`;
      const nameEn = `${monthNamesEn[monthNum] || monthNum} ${year}`;

      const archive = archives.find((a) => a.monthKey === key);
      const isClosed = Boolean(archive);

      const monthOrders = this.data.orders.filter(
        (o) => o.createdAt && o.createdAt.startsWith(key)
      );
      const delivered = monthOrders.filter((o) => o.status === 'DELIVERED');
      const totalSales = archive
        ? archive.summary.totalSales
        : delivered.reduce((sum, o) => sum + o.total, 0);

      return {
        key,
        nameAr,
        nameEn,
        isClosed,
        closedAt: archive?.closedAt,
        orderCount: monthOrders.length,
        totalSales: parseFloat(totalSales.toFixed(2)),
      };
    });

    const activeMonth = this.data.activeAccountingMonth || currentMonthKey;

    return {
      months,
      availableMonths: months.map((m) => m.key),
      activeMonth,
      archives,
    };
  }

  getMonthlyAccountingReport(monthKey: string): MonthlyAccountingReport {
    const [year, monthNum] = monthKey.split('-');
    const monthNamesAr: Record<string, string> = {
      '01': 'يناير',
      '02': 'فبراير',
      '03': 'مارس',
      '04': 'أبريل',
      '05': 'مايو',
      '06': 'يونيو',
      '07': 'يوليو',
      '08': 'أغسطس',
      '09': 'سبتمبر',
      '10': 'أكتوبر',
      '11': 'نوفمبر',
      '12': 'ديسمبر',
    };
    const monthNamesEn: Record<string, string> = {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    };
    const monthNameAr = `${monthNamesAr[monthNum] || monthNum} ${year}`;
    const monthNameEn = `${monthNamesEn[monthNum] || monthNum} ${year}`;

    // Filter orders belonging to this month
    const monthOrders = this.data.orders
      .filter((o) => o.createdAt && o.createdAt.startsWith(monthKey))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const deliveredOrders = monthOrders.filter((o) => o.status === 'DELIVERED');
    const cancelledOrders = monthOrders.filter(
      (o) => o.status === 'CANCELLED' || o.status === 'NOT_RECEIVED'
    );
    const unpaidOrders = monthOrders.filter(
      (o) =>
        o.status === 'PENDING' ||
        o.status === 'CONFIRMED' ||
        o.status === 'PREPARING' ||
        o.status === 'OUT_FOR_DELIVERY'
    );

    const collectedAmount = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.total, 0);
    const cancelledAmount = cancelledOrders.reduce((sum, o) => sum + o.total, 0);
    const deliveryFeesCollected = deliveredOrders.reduce((sum, o) => sum + o.deliveryFee, 0);
    const productsSalesTotal = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const totalSales = collectedAmount;

    const averageOrderValue =
      deliveredOrders.length > 0 ? collectedAmount / deliveredOrders.length : 0;

    // Check archive
    const archive = (this.data.monthlyArchives || []).find((a) => a.monthKey === monthKey);

    const summary: MonthlyAccountingSummary = {
      monthKey,
      monthNameAr,
      monthNameEn,
      totalOrders: monthOrders.length,
      deliveredOrders: deliveredOrders.length,
      cancelledOrders: cancelledOrders.length,
      unpaidOrders: unpaidOrders.length,
      totalSales: parseFloat(totalSales.toFixed(2)),
      grossSales: parseFloat(monthOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)),
      collectedAmount: parseFloat(collectedAmount.toFixed(2)),
      unpaidAmount: parseFloat(unpaidAmount.toFixed(2)),
      cancelledAmount: parseFloat(cancelledAmount.toFixed(2)),
      deliveryFeesCollected: parseFloat(deliveryFeesCollected.toFixed(2)),
      productsSalesTotal: parseFloat(productsSalesTotal.toFixed(2)),
      averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      isClosed: Boolean(archive),
      closedAt: archive?.closedAt,
      closedById: archive?.closedById,
      closedByName: archive?.closedByName,
      closingNotes: archive?.closingNotes,
    };

    // Status breakdown
    const statusBreakdown: Record<string, { count: number; totalAmount: number }> = {};
    for (const ord of monthOrders) {
      if (!statusBreakdown[ord.status]) {
        statusBreakdown[ord.status] = { count: 0, totalAmount: 0 };
      }
      statusBreakdown[ord.status].count += 1;
      statusBreakdown[ord.status].totalAmount += ord.total;
    }
    for (const key of Object.keys(statusBreakdown)) {
      statusBreakdown[key].totalAmount = parseFloat(
        statusBreakdown[key].totalAmount.toFixed(2)
      );
    }

    // Top products
    const productStats: Record<
      string,
      { nameAr: string; nameEn: string; quantity: number; revenue: number }
    > = {};
    for (const ord of deliveredOrders) {
      for (const item of ord.items) {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            nameAr: item.productNameAr,
            nameEn: item.productNameEn,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].quantity += item.quantity;
        productStats[item.productId].revenue += item.quantity * item.unitPrice;
      }
    }
    const topProducts = Object.entries(productStats)
      .map(([id, stats]) => ({
        productId: id,
        nameAr: stats.nameAr,
        nameEn: stats.nameEn,
        quantity: stats.quantity,
        revenue: parseFloat(stats.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.quantity - a.quantity);

    return {
      summary,
      orders: monthOrders,
      statusBreakdown,
      topProducts,
      isClosed: Boolean(archive),
      archiveRecord: archive,
    };
  }

  closeAccountingMonth(
    monthKey: string,
    closingNotes: string | undefined,
    closedBy: UserInDB
  ): MonthlyArchiveRecord {
    if (closedBy.role !== 'OWNER') {
      throw new Error('فقط مالك المتجر (Owner) مصرح له بإغلاق الأشهر المحاسبية وأرشفة السجلات.');
    }

    if (!this.data.monthlyArchives) {
      this.data.monthlyArchives = [];
    }

    const report = this.getMonthlyAccountingReport(monthKey);
    const now = new Date().toISOString();

    const archiveRecord: MonthlyArchiveRecord = {
      id: `mclose_${monthKey.replace('-', '_')}_${Date.now()}`,
      monthKey,
      closedAt: now,
      closedById: closedBy.id,
      closedByName: closedBy.name,
      closingNotes: closingNotes || '',
      summary: {
        ...report.summary,
        isClosed: true,
        closedAt: now,
        closedById: closedBy.id,
        closedByName: closedBy.name,
        closingNotes: closingNotes || '',
      },
    };

    // Replace if previously existed or push
    const existingIdx = this.data.monthlyArchives.findIndex((a) => a.monthKey === monthKey);
    if (existingIdx !== -1) {
      this.data.monthlyArchives[existingIdx] = archiveRecord;
    } else {
      this.data.monthlyArchives.push(archiveRecord);
    }

    this.addAuditLog({
      performedById: closedBy.id,
      performedByName: closedBy.name,
      performedByRole: 'OWNER',
      action: `إغلاق الشهر المحاسبي: ${report.summary.monthNameAr}`,
      details: `المبيعات الإجمالية المحصلة: ${archiveRecord.summary.totalSales} ج.م. | عدد الطلبات: ${archiveRecord.summary.totalOrders} | تم الحفظ والأرشفة الدائمة`,
    });

    this.save();
    return archiveRecord;
  }

  startNewAccountingPeriod(newMonthKey: string, startedBy: UserInDB): { activeMonth: string } {
    if (startedBy.role !== 'OWNER') {
      throw new Error('فقط مالك المتجر (Owner) مصرح له ببدء فترات محاسبية جديدة.');
    }

    this.data.activeAccountingMonth = newMonthKey;

    this.addAuditLog({
      performedById: startedBy.id,
      performedByName: startedBy.name,
      performedByRole: 'OWNER',
      action: `بدء فترة تشغيلية محاسبية جديدة: ${newMonthKey}`,
      details: `تم تنشيط الفترة المحاسبية الجديدة مع الحفاظ التام على كافة السجلات والطلبات التاريخية السابقة`,
    });

    this.save();
    return { activeMonth: newMonthKey };
  }

  reopenAccountingMonth(monthKey: string, reopenedBy: UserInDB): { success: boolean; message: string } {
    if (reopenedBy.role !== 'OWNER') {
      throw new Error('فقط مالك المتجر (Owner) مصرح له بإعادة فتح الأشهر المحاسبية.');
    }

    if (!this.data.monthlyArchives) return { success: true, message: 'الشهر غير مغلق.' };

    this.data.monthlyArchives = this.data.monthlyArchives.filter((a) => a.monthKey !== monthKey);

    this.addAuditLog({
      performedById: reopenedBy.id,
      performedByName: reopenedBy.name,
      performedByRole: 'OWNER',
      action: `إعادة فتح الشهر المحاسبي: ${monthKey}`,
      details: `تم فك أرشفة الشهر للسماح بمراجعة العمليات والتعديل الإداري`,
    });

    this.save();
    return { success: true, message: 'تمت إعادة فتح الشهر المحاسبي بنجاح.' };
  }

  // -------------------------------------------------------------
  // Special Offers System (Special purchasable bundled products)
  // -------------------------------------------------------------

  getOffers(onlyActive = true): SpecialOffer[] {
    const list = this.data.offers || [];
    if (!onlyActive) return list;
    const now = Date.now();
    return list
      .filter((off) => {
        if (off.isActive === false) return false;
        if (off.startDate) {
          const start = new Date(off.startDate).getTime();
          if (!isNaN(start) && now < start) return false;
        }
        if (off.endDate) {
          let end = new Date(off.endDate).getTime();
          if (off.endDate.length === 10) {
            end = new Date(`${off.endDate}T23:59:59.999Z`).getTime();
          }
          if (!isNaN(end) && now > end) return false;
        }
        return true;
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  getAdminOffers(): SpecialOffer[] {
    return (this.data.offers || [])
      .slice()
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  getOfferById(id: string): SpecialOffer | undefined {
    return (this.data.offers || []).find((o) => o.id === id);
  }

  createOffer(
    offerData: Omit<SpecialOffer, 'id' | 'createdAt' | 'updatedAt'>,
    performedBy: UserInDB
  ): SpecialOffer {
    if (!Array.isArray(this.data.offers)) this.data.offers = [];

    const now = new Date().toISOString();
    const newOffer: SpecialOffer = {
      id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nameAr: offerData.nameAr?.trim() || 'عرض خاص',
      nameEn: offerData.nameEn?.trim() || '',
      descAr: offerData.descAr?.trim() || '',
      descEn: offerData.descEn?.trim() || '',
      imageUrl: offerData.imageUrl || '',
      price:
        typeof offerData.price === 'number'
          ? offerData.price
          : parseFloat(String(offerData.price || '0')) || 0,
      originalPrice:
        typeof offerData.originalPrice === 'number'
          ? offerData.originalPrice
          : undefined,
      items: Array.isArray(offerData.items) ? offerData.items : [],
      startDate: offerData.startDate || undefined,
      endDate: offerData.endDate || undefined,
      isActive: offerData.isActive !== false,
      displayOrder:
        typeof offerData.displayOrder === 'number'
          ? offerData.displayOrder
          : this.data.offers.length + 1,
      createdAt: now,
      updatedAt: now,
    };

    this.data.offers.push(newOffer);

    this.addAuditLog({
      performedById: performedBy.id,
      performedByName: performedBy.name,
      performedByRole: performedBy.role,
      action: `إنشاء عرض خاص جديد: ${newOffer.nameAr}`,
      details: `السعر: ${newOffer.price} ج.م. | عدد الأصناف المضمنة: ${newOffer.items.length}`,
    });

    this.save();
    return newOffer;
  }

  updateOffer(
    id: string,
    updates: Partial<SpecialOffer>,
    performedBy: UserInDB
  ): SpecialOffer {
    if (!Array.isArray(this.data.offers)) this.data.offers = [];
    const idx = this.data.offers.findIndex((o) => o.id === id);
    if (idx === -1) {
      throw new Error('العرض الخاص غير موجود.');
    }

    const existing = this.data.offers[idx];
    const updatedOffer: SpecialOffer = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (updates.price !== undefined) {
      updatedOffer.price =
        typeof updates.price === 'number'
          ? updates.price
          : parseFloat(String(updates.price || '0')) || 0;
    }

    this.data.offers[idx] = updatedOffer;

    this.addAuditLog({
      performedById: performedBy.id,
      performedByName: performedBy.name,
      performedByRole: performedBy.role,
      action: `تعديل العرض الخاص: ${updatedOffer.nameAr}`,
      details: `السعر المحدث: ${updatedOffer.price} ج.م. | الحالة: ${updatedOffer.isActive ? 'نشط' : 'معطل'}`,
    });

    this.save();
    return updatedOffer;
  }

  deleteOffer(id: string, performedBy: UserInDB): boolean {
    if (!Array.isArray(this.data.offers)) return false;
    const idx = this.data.offers.findIndex((o) => o.id === id);
    if (idx === -1) return false;

    const [deleted] = this.data.offers.splice(idx, 1);

    this.addAuditLog({
      performedById: performedBy.id,
      performedByName: performedBy.name,
      performedByRole: performedBy.role,
      action: `حذف العرض الخاص: ${deleted.nameAr}`,
      details: `تم حذف العرض نهائياً من قاعدة البيانات مع الحفاظ التام على سجلات الطلبات التاريخية السابقة`,
    });

    this.save();
    return true;
  }

  toggleOfferActive(id: string, performedBy: UserInDB): SpecialOffer {
    const offer = this.getOfferById(id);
    if (!offer) throw new Error('العرض الخاص غير موجود.');
    return this.updateOffer(id, { isActive: !offer.isActive }, performedBy);
  }

  // -------------------------------------------------------------
  // Dedicated Advertisements System
  // -------------------------------------------------------------

  getAdvertisements(onlyActive = true, placement?: AdPlacement): Advertisement[] {
    const list = this.data.advertisements || [];
    const now = Date.now();
    return list
      .filter((ad) => {
        if (onlyActive && ad.isActive === false) return false;
        if (placement && ad.placement !== placement) return false;
        if (onlyActive) {
          if (ad.startDate) {
            const start = new Date(ad.startDate).getTime();
            if (!isNaN(start) && now < start) return false;
          }
          if (ad.endDate) {
            let end = new Date(ad.endDate).getTime();
            if (ad.endDate.length === 10) {
              end = new Date(`${ad.endDate}T23:59:59.999Z`).getTime();
            }
            if (!isNaN(end) && now > end) return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  getAdminAdvertisements(): Advertisement[] {
    return (this.data.advertisements || [])
      .slice()
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  getAdvertisementById(id: string): Advertisement | undefined {
    return (this.data.advertisements || []).find((a) => a.id === id);
  }

  createAdvertisement(
    adData: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'>,
    performedBy: UserInDB
  ): Advertisement {
    if (!Array.isArray(this.data.advertisements)) this.data.advertisements = [];

    const now = new Date().toISOString();
    const images =
      Array.isArray(adData.images) && adData.images.length > 0
        ? adData.images
        : adData.mainImage
        ? [adData.mainImage]
        : [];
    const mainImage = adData.mainImage || (images[0] || '');

    const newAd: Advertisement = {
      id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titleAr: adData.titleAr?.trim() || 'إعلان ترويجي',
      titleEn: adData.titleEn?.trim() || '',
      descAr: adData.descAr?.trim() || '',
      descEn: adData.descEn?.trim() || '',
      images,
      mainImage,
      placement: adData.placement || 'TOP_HERO',
      linkUrl: adData.linkUrl?.trim() || '',
      buttonTextAr: adData.buttonTextAr?.trim() || '',
      buttonTextEn: adData.buttonTextEn?.trim() || '',
      startDate: adData.startDate || undefined,
      endDate: adData.endDate || undefined,
      isActive: adData.isActive !== false,
      displayOrder:
        typeof adData.displayOrder === 'number'
          ? adData.displayOrder
          : this.data.advertisements.length + 1,
      createdAt: now,
      updatedAt: now,
    };

    this.data.advertisements.push(newAd);

    this.addAuditLog({
      performedById: performedBy.id,
      performedByName: performedBy.name,
      performedByRole: performedBy.role,
      action: `إنشاء إعلان جديد: ${newAd.titleAr}`,
      details: `الموضع: ${newAd.placement} | الصور: ${newAd.images.length}`,
    });

    this.save();
    return newAd;
  }

  updateAdvertisement(
    id: string,
    updates: Partial<Advertisement>,
    performedBy: UserInDB
  ): Advertisement {
    if (!Array.isArray(this.data.advertisements)) this.data.advertisements = [];
    const idx = this.data.advertisements.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error('الإعلان غير موجود.');
    }

    const existing = this.data.advertisements[idx];
    const updatedImages =
      updates.images !== undefined
        ? Array.isArray(updates.images)
          ? updates.images
          : []
        : existing.images;
    const updatedMain =
      updates.mainImage || (updatedImages[0] || existing.mainImage || '');

    const updatedAd: Advertisement = {
      ...existing,
      ...updates,
      images: updatedImages,
      mainImage: updatedMain,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.data.advertisements[idx] = updatedAd;

    this.addAuditLog({
      performedById: performedBy.id,
      performedByName: performedBy.name,
      performedByRole: performedBy.role,
      action: `تعديل الإعلان: ${updatedAd.titleAr}`,
      details: `الموضع: ${updatedAd.placement} | الحالة: ${updatedAd.isActive ? 'نشط' : 'معطل'}`,
    });

    this.save();
    return updatedAd;
  }

  deleteAdvertisement(id: string, performedBy: UserInDB): boolean {
    if (!Array.isArray(this.data.advertisements)) return false;
    const idx = this.data.advertisements.findIndex((a) => a.id === id);
    if (idx === -1) return false;

    const [deleted] = this.data.advertisements.splice(idx, 1);

    this.addAuditLog({
      performedById: performedBy.id,
      performedByName: performedBy.name,
      performedByRole: performedBy.role,
      action: `حذف الإعلان: ${deleted.titleAr}`,
      details: `تم حذف الإعلان نهائياً من قاعدة البيانات`,
    });

    this.save();
    return true;
  }

  toggleAdvertisementActive(id: string, performedBy: UserInDB): Advertisement {
    const ad = this.getAdvertisementById(id);
    if (!ad) throw new Error('الإعلان غير موجود.');
    return this.updateAdvertisement(id, { isActive: !ad.isActive }, performedBy);
  }

  reorderAdvertisements(orderedIds: string[], performedBy: UserInDB): Advertisement[] {
    if (!Array.isArray(this.data.advertisements) || !Array.isArray(orderedIds)) {
      return this.getAdminAdvertisements();
    }

    orderedIds.forEach((id, index) => {
      const ad = this.data.advertisements.find((a) => a.id === id);
      if (ad) {
        ad.displayOrder = index + 1;
        ad.updatedAt = new Date().toISOString();
      }
    });

    this.data.advertisements.sort((a, b) => a.displayOrder - b.displayOrder);

    this.addAuditLog({
      performedById: performedBy.id,
      performedByName: performedBy.name,
      performedByRole: performedBy.role,
      action: 'إعادة ترتيب مواضع الإعلانات',
      details: `تم تحديث ترتيب ${orderedIds.length} إعلان`,
    });

    this.save();
    return this.getAdminAdvertisements();
  }
}

export const db = new Database();
