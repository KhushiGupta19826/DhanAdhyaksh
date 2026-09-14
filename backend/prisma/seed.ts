import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'College',
  'Hostel',
  'Entertainment',
  'Personal',
  'Gifts',
  'Miscellaneous',
];

async function main(): Promise<void> {
  console.log('Seeding default categories for Dhanadhyaksh...');

  for (const name of DEFAULT_CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✓ Category: ${category.name}`);
  }

  console.log('✅ Default categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error while seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
