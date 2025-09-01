import { db, users } from '../src/db/index'
import { eq, asc } from 'drizzle-orm'

async function createFirstAdmin() {
  try {
    console.log('🔍 Checking for existing admin users...')
    
    // Check if any admin user exists
    const existingAdminResult = await db
      .select()
      .from(users)
      .where(eq(users.role, 'ADMIN'))
      .limit(1)
    
    const existingAdmin = existingAdminResult.length > 0 ? existingAdminResult[0] : null

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email)
      return
    }

    console.log('📝 No admin user found. Creating first admin...')
    
    // Get the first user from database (assuming they should be admin)
    const firstUserResult = await db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt))
      .limit(1)
    
    const firstUser = firstUserResult.length > 0 ? firstUserResult[0] : null

    if (!firstUser) {
      console.log('❌ No users found in database. Please register a user first.')
      return
    }

    // Update the first user to be admin and approved
    const adminUserResult = await db
      .update(users)
      .set({
        role: 'ADMIN',
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: firstUser.id // Self-approved
      })
      .where(eq(users.id, firstUser.id))
      .returning()
    
    const adminUser = adminUserResult[0]

    console.log('🎉 First admin user created successfully!')
    console.log('📧 Email:', adminUser.email)
    console.log('👤 Name:', adminUser.firstName, adminUser.lastName)
    console.log('🔑 Role:', adminUser.role)
    console.log('✅ Approved:', adminUser.isApproved)

  } catch (error) {
    console.error('❌ Error creating first admin:', error)
  } finally {
    // No disconnect needed for Drizzle
  }
}

// Run the script
createFirstAdmin()

export default createFirstAdmin