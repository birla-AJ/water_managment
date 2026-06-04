import { PrismaClient, AdminRole, CustomerType, Weekday } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const WEEKDAYS: Weekday[] = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
];

async function main() {
  console.log('🌱 Seeding database...');

  // ---- Admins ----
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  await prisma.admin.upsert({
    where: { email: 'superadmin@waterflow.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@waterflow.com',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      phone: '9000000001',
    },
  });

  await prisma.admin.upsert({
    where: { email: 'admin@waterflow.com' },
    update: {},
    create: {
      name: 'Operations Admin',
      email: 'admin@waterflow.com',
      passwordHash,
      role: AdminRole.ADMIN,
      phone: '9000000002',
    },
  });

  // ---- Inventory snapshot ----
  await prisma.inventory.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      totalCampers: 500,
      filledCampers: 300,
      emptyCampers: 150,
      damagedCampers: 5,
      lostCampers: 3,
      returnedCampers: 42,
      allocatedCampers: 0,
    },
  });

  // ---- Settings ----
  const settings: Array<{ key: string; value: unknown }> = [
    { key: 'business', value: { name: 'WaterFlow Distributors', gstin: '27ABCDE1234F1Z5', phone: '18001234567', address: 'Pune, MH', email: 'support@waterflow.com' } },
    { key: 'billing', value: { defaultRate: 30, taxPercent: 0, dueDays: 7, currency: 'INR' } },
    { key: 'inventory', value: { lowThreshold: 20 } },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value as object },
      create: { key: s.key, value: s.value as object },
    });
  }

  // ---- Sample customers ----
  const sampleCustomers = [
    { name: 'Ravi Kumar', mobile: '9812345670', area: 'Kothrud', type: CustomerType.DAILY, rate: 30, deposit: 600, allocated: 2 },
    { name: 'Sneha Patil', mobile: '9812345671', area: 'Baner', type: CustomerType.WEEKLY, rate: 28, deposit: 300, allocated: 1 },
    { name: 'Imran Shaikh', mobile: '9812345672', area: 'Hadapsar', type: CustomerType.MONTHLY, rate: 35, deposit: 900, allocated: 3 },
  ];

  for (const c of sampleCustomers) {
    const customer = await prisma.customer.upsert({
      where: { mobile: c.mobile },
      update: {},
      create: {
        name: c.name,
        mobile: c.mobile,
        area: c.area,
        address: `${c.area}, Pune`,
        customerType: c.type,
        ratePerCamper: c.rate,
        securityDeposit: c.deposit,
        allocatedCampers: c.allocated,
      },
    });

    // Default schedule: weekdays enabled, weekend disabled
    for (const day of WEEKDAYS) {
      const enabled = day !== Weekday.SUNDAY;
      await prisma.customerSchedule.upsert({
        where: { customerId_weekday: { customerId: customer.id, weekday: day } },
        update: {},
        create: { customerId: customer.id, weekday: day, enabled, quantity: c.allocated || 1 },
      });
    }
  }

  // ---- Sample vehicle + driver ----
  const vehicle = await prisma.vehicle.upsert({
    where: { number: 'MH12 AB 1234' },
    update: {},
    create: { number: 'MH12 AB 1234', type: 'Tempo', capacity: 100 },
  });

  const driver = await prisma.driver.upsert({
    where: { mobile: '9800000001' },
    update: {},
    create: {
      name: 'Suresh Driver',
      mobile: '9800000001',
      licenseNumber: 'MH-1420200012345',
      zone: 'Kothrud',
      vehicleId: vehicle.id,
    },
  });

  // Assign the Kothrud sample customer to this driver.
  await prisma.customer.updateMany({ where: { area: 'Kothrud' }, data: { driverId: driver.id } });

  console.log('✅ Seed complete.');
  console.log('   Super Admin: superadmin@waterflow.com / Admin@123');
  console.log('   Admin:       admin@waterflow.com / Admin@123');
  console.log('   Customers:   9812345670, 9812345671, 9812345672 (OTP: 123456)');
  console.log('   Driver:      9800000001 (OTP: 123456) — zone Kothrud, vehicle MH12 AB 1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
