import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'data/wave_donuts_db.json');
const DB_BACKUP_FILE = path.resolve(process.cwd(), 'data/wave_donuts_db.json.bak');

if (!fs.existsSync(DB_FILE)) {
  console.error('Database file does not exist');
  process.exit(1);
}

const raw = fs.readFileSync(DB_FILE, 'utf-8');
const data = JSON.parse(raw);

console.log('Original counts:');
console.log(`- Users: ${data.users?.length}`);
console.log(`- Products: ${data.products?.length}`);
console.log(`- Categories: ${data.categories?.length}`);
console.log(`- Customization Groups: ${data.customizationGroups?.length}`);
console.log(`- Addresses: ${data.addresses?.length}`);

// Filter out test users
const legitimateUsers = (data.users || []).filter((u: any) => {
  if (u.role === 'OWNER') return true;
  if (u.email === 'owner@wavedonuts.eg') return true;
  if (u.email === 'newadmin_1793632811437@wavedonuts.eg') return true;
  if (u.email === 'cust2_1793632811076@test.eg') return true;
  if (u.email.startsWith('testcust_') || u.email.startsWith('tempadmin_') || u.name === 'سارة مصطفى') {
    return false;
  }
  return true;
});

// Filter out test addresses
const legitimateUserIds = new Set(legitimateUsers.map((u: any) => u.id));
const legitimateAddresses = (data.addresses || []).filter((a: any) => legitimateUserIds.has(a.userId));

// Filter out duplicate test categories (keep original 'cat_1793632811067_du0g' / 'دونتس محشية')
const legitimateCategories = (data.categories || []).filter((c: any) => {
  if (c.id === 'cat_1793632811067_du0g') return true;
  if (c.slug === 'wave-drinks' || c.nameAr === 'مشروبات ويف الساخنة والباردة') return false;
  return true;
});

// Filter out duplicate test products (keep original 'prod_1793632811070_fgjmq' / 'دونت شوكولاتة نوتيلا')
const legitimateProducts = (data.products || []).filter((p: any) => {
  if (p.id === 'prod_1793632811070_fgjmq') return true;
  if (p.nameAr === 'سبانش لاتيه بارد') return false;
  return true;
});

// Clean customization groups created during tests
const legitimateCustomizationGroups: any[] = [];

data.users = legitimateUsers;
data.addresses = legitimateAddresses;
data.categories = legitimateCategories;
data.products = legitimateProducts;
data.customizationGroups = legitimateCustomizationGroups;

// Write cleaned database atomically
const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
fs.renameSync(tmpFile, DB_FILE);
fs.copyFileSync(DB_FILE, DB_BACKUP_FILE);

console.log('\nCleaned counts:');
console.log(`- Users: ${data.users?.length}`);
console.log(`- Products: ${data.products?.length}`);
console.log(`- Categories: ${data.categories?.length}`);
console.log(`- Customization Groups: ${data.customizationGroups?.length}`);
console.log(`- Addresses: ${data.addresses?.length}`);
console.log('✅ Unwanted test records cleaned successfully.');
