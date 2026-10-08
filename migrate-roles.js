import mongoose from 'mongoose';

async function migrateRoles() {
  await mongoose.connect('mongodb://127.0.0.1:27017/korder'); // Update if env is different
  const db = mongoose.connection.db;

  console.log('Migrating users to CUSTOMER...');
  const result1 = await db.collection('users').updateMany(
    { $or: [{ role: 'USER' }, { role: 'customer' }, { role: { $exists: false } }, { role: null }] },
    { $set: { role: 'CUSTOMER' } }
  );
  console.log(`Updated ${result1.modifiedCount} users to CUSTOMER`);

  console.log('Migrating staff to STAFF...');
  const result2 = await db.collection('users').updateMany(
    { role: 'staff' },
    { $set: { role: 'STAFF' } }
  );
  console.log(`Updated ${result2.modifiedCount} users to STAFF`);

  await mongoose.disconnect();
}

migrateRoles().catch(console.error);
