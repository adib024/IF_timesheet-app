import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default categories
  const categories = [
    { name: 'R&D', color: '#8b5cf6' },           // Purple
    { name: 'Meetings', color: '#f59e0b' },      // Amber
    { name: 'Training', color: '#10b981' },      // Emerald
    { name: 'Downtime', color: '#6b7280' },      // Gray
    { name: 'Admin', color: '#3b82f6' },         // Blue
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        color: category.color,
        isSystem: true,
      },
    })
  }
  console.log('✅ Categories created')

  // Create default settings
  // Create default settings
  const settings = [
    { key: 'default_holiday_entitlement', value: '25' },
    { key: 'statutory_holidays', value: '7' },
    { key: 'workday_hours', value: '7.5' },
  ]

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
      },
    })
  }
  console.log('✅ Settings created')

  // Create default admin user (will be linked when they first sign in)
  const adminEmail = 'anshul@loveimagefoundry.com'
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      name: 'Anshul',
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log(`✅ Admin user created: ${adminEmail}`)

  // Create default artist user
  const artistEmail = 'artist@loveimagefoundry.com'
  await prisma.user.upsert({
    where: { email: artistEmail },
    update: { role: 'USER' },
    create: {
      email: artistEmail,
      name: 'Artist User',
      role: 'USER',
      isActive: true,
    },
  })
  console.log(`✅ Artist user created: ${artistEmail}`)

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
