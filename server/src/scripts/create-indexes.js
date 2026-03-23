/**
 * scripts/create-indexes.js
 * Run once: node src/scripts/create-indexes.js
 * Safe to re-run — skips existing indexes automatically.
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Create indexes for one collection, skipping any that already exist
const safeCreateIndexes = async (db, collectionName, indexes) => {
  for (const index of indexes) {
    try {
      await db.collection(collectionName).createIndex(index.key, {
        name:       index.name,
        unique:     index.unique     || false,
        background: index.background || true,
      });
      console.log(`  ✅ ${index.name}`);
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        // 85 = IndexOptionsConflict (same keys, different name — already exists)
        // 86 = IndexKeySpecsConflict
        console.log(`  ⏭️  ${index.name} — already exists, skipped`);
      } else {
        console.error(`  ❌ ${index.name} — ${err.message}`);
      }
    }
  }
};

async function createIndexes() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const db = mongoose.connection.db;

  console.log("delivery_records:");
  await safeCreateIndexes(db, "deliveryrecords", [
    { key: { tenantId: 1, laneId: 1, date: 1, isActive: 1 },  name: "tenant_lane_date_active" },
    { key: { tenantId: 1, date: 1, isActive: 1 },              name: "tenant_date_active" },
    { key: { tenantId: 1, customerId: 1, productId: 1, date: 1 }, name: "tenant_customer_product_date", unique: true },
    { key: { tenantId: 1, customerId: 1, date: 1 },            name: "tenant_customer_date" },
  ]);

  console.log("bills:");
  await safeCreateIndexes(db, "bills", [
    { key: { tenantId: 1, status: 1 },                         name: "tenant_status" },
    { key: { tenantId: 1, customerId: 1, fromDate: -1 },       name: "tenant_customer_fromdate" },
    { key: { tenantId: 1, customerId: 1, fromDate: 1, toDate: 1 }, name: "tenant_customer_period" },
    { key: { tenantId: 1, fromDate: 1 },                       name: "tenant_fromdate" },
    { key: { tenantId: 1, customerId: 1 },                     name: "tenant_customer" },
  ]);

  console.log("payments:");
  await safeCreateIndexes(db, "payments", [
    { key: { tenantId: 1, customerId: 1, isActive: 1 },        name: "tenant_customer_active" },
    { key: { tenantId: 1, isActive: 1, date: 1 },              name: "tenant_active_date" },
  ]);

  console.log("customers:");
  await safeCreateIndexes(db, "customers", [
    { key: { tenantId: 1, laneId: 1, isActive: 1 },            name: "tenant_lane_active" },
    { key: { tenantId: 1, isActive: 1, name: 1 },              name: "tenant_active_name" },
  ]);

  console.log("lanes:");
  await safeCreateIndexes(db, "lanes", [
    { key: { tenantId: 1, isActive: 1 },                       name: "tenant_active" },
  ]);

  console.log("tenants:");
  await safeCreateIndexes(db, "tenants", [
    { key: { email: 1 }, name: "email_unique", unique: true },
    { key: { phone: 1 }, name: "phone_unique", unique: true },
  ]);

  console.log("\n🚀 Done! All indexes created or already existed.");
  await mongoose.disconnect();
}

createIndexes().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});