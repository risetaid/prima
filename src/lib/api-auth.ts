import { NextRequest } from 'next/server'
import { stackServerApp } from '../stack'
import { prisma } from './prisma'

export async function getAuthenticatedUser(request?: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    
    if (!user) {
      return null
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      include: {
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return {
      stackUser: user,
      dbUser
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

export async function requireAuthenticatedUser() {
  const result = await getAuthenticatedUser()
  
  if (!result || !result.dbUser) {
    throw new Error('Authentication required')
  }

  return result
}