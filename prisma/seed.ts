import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeSchedule } from "../src/lib/calculator";
import { ADMIN_LOGIN_EMAIL, SUPER_ADMIN_LOGIN_EMAIL } from "../src/lib/auth-shortcuts";

const prisma = new PrismaClient();

// The /admin and /superadmin shortcut pages are password-only against these two
// accounts, so the seed enforces this password on every run (create and update)
// rather than just on first create.
const SHORTCUT_PASSWORD = "Silver@123";

async function main() {
  const superAdminPasswordHash = await bcrypt.hash(SHORTCUT_PASSWORD, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_LOGIN_EMAIL },
    update: { passwordHash: superAdminPasswordHash },
    create: {
      name: "Sirah Digital Super Admin",
      email: SUPER_ADMIN_LOGIN_EMAIL,
      passwordHash: superAdminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`Seeded super admin: ${superAdmin.email} — sign in at /superadmin with the configured shortcut password.`);

  const adminPasswordHash = await bcrypt.hash(SHORTCUT_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_LOGIN_EMAIL },
    update: { passwordHash: adminPasswordHash },
    create: {
      name: "Sirah Digital Admin",
      email: ADMIN_LOGIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });
  console.log(`Seeded admin: ${admin.email} — sign in at /admin with the configured shortcut password.`);

  const existingSettings = await prisma.interestSettings.findFirst();
  if (!existingSettings) {
    await prisma.interestSettings.create({
      data: {
        rateBasis: "MONTHLY",
        payoutType: "INTEREST_ONLY",
        minimumInvestment: 300000,
        updatedById: superAdmin.id,
      },
    });
    console.log("Seeded InterestSettings (monthly rate basis, interest-only payout, min ₹3,00,000).");
  }

  const existingFlags = await prisma.featureFlags.findFirst();
  if (!existingFlags) {
    await prisma.featureFlags.create({
      data: {
        aiSuiteEnabled: true,
        payoutTrackingEnabled: true,
        updatedById: superAdmin.id,
      },
    });
    console.log("Seeded FeatureFlags (AI suite + payout tracking both ON).");
  }

  const existingPlans = await prisma.ratePlan.count();
  if (existingPlans === 0) {
    await prisma.ratePlan.createMany({
      data: [
        { tenureYears: 3, label: "3 Years", ratePercent: 1.5, sortOrder: 1 },
        { tenureYears: 5, label: "5 Years", ratePercent: 2.0, sortOrder: 2 },
        { tenureYears: 7, label: "7 Years", ratePercent: 3.0, sortOrder: 3 },
        { tenureYears: 10, label: "10 Years", ratePercent: 3.5, sortOrder: 4 },
        { tenureYears: null, label: "Above 10 Years (flat)", ratePercent: 3.5, sortOrder: 5 },
      ],
    });
    console.log("Seeded rate plans: 3y/1.5%, 5y/2.0%, 7y/3.0%, 10y/3.5%, >10y flat 3.5%.");
  }

  const existingClient = await prisma.client.findFirst({ where: { name: "Demo Client" } });
  if (!existingClient) {
    const demoClient = await prisma.client.create({
      data: {
        name: "Demo Client",
        phone: "9999999999",
        email: "demo.client@example.com",
        createdById: superAdmin.id,
      },
    });

    const principal = 500000;
    const tenureYears = 3;
    const tenureMonths = 36;
    const ratePercent = 1.5;
    const startDate = new Date();

    const result = computeSchedule({
      principal,
      tenureMonths,
      ratePercent,
      rateBasis: "MONTHLY",
      payoutType: "INTEREST_ONLY",
      startDate,
    });

    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);

    const investment = await prisma.investment.create({
      data: {
        clientId: demoClient.id,
        principalAmount: principal,
        tenureYears,
        tenureMonths,
        startDate,
        maturityDate,
        ratePercentApplied: ratePercent,
        rateBasisApplied: "MONTHLY",
        payoutTypeApplied: "INTEREST_ONLY",
        createdById: superAdmin.id,
        schedule: {
          create: result.entries.map((e) => ({
            installmentNo: e.installmentNo,
            dueDate: e.dueDate,
            openingBalance: e.openingBalance,
            interestAmount: e.interestAmount,
            principalAmount: e.principalAmount,
            totalPayout: e.totalPayout,
            closingBalance: e.closingBalance,
          })),
        },
      },
    });
    console.log(`Seeded demo client + investment ${investment.id} (₹5,00,000 / 3 years / 1.5% monthly).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
