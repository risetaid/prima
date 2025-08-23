import { prisma } from '../src/lib/prisma'

async function createFirstAdmin() {
  try {
    console.log('🔍 Checking for existing admin users...')
    
    // Check if any admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email)
      return
    }

    console.log('📝 No admin user found. Creating first admin...')
    
    // Get the first user from Clerk (assuming they should be admin)
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    if (!firstUser) {
      console.log('❌ No users found in database. Please register a user first.')
      return
    }

    // Update the first user to be admin and approved
    const adminUser = await prisma.user.update({
      where: { id: firstUser.id },
      data: {
        role: 'ADMIN',
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: firstUser.id // Self-approved
      }
    })

    console.log('🎉 First admin user created successfully!')
    console.log('📧 Email:', adminUser.email)
    console.log('👤 Name:', adminUser.firstName, adminUser.lastName)
    console.log('🔑 Role:', adminUser.role)
    console.log('✅ Approved:', adminUser.isApproved)

  } catch (error) {
    console.error('❌ Error creating first admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createFirstAdmin()

export default createFirstAdmin