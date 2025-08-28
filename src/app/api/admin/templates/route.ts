import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL' | null
    const isActive = searchParams.get('active')

    const whereClause: any = {}
    
    if (category) {
      whereClause.category = category
    }
    
    if (isActive !== null) {
      whereClause.isActive = isActive === 'true'
    }

    const templates = await prisma.whatsAppTemplate.findMany({
      where: whereClause,
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { templateName: 'asc' }
      ]
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { templateName, templateText, variables, category } = body

    // Validation
    if (!templateName || !templateText) {
      return NextResponse.json(
        { error: 'Template name and text are required' },
        { status: 400 }
      )
    }

    if (!['REMINDER', 'APPOINTMENT', 'EDUCATIONAL'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid template category' },
        { status: 400 }
      )
    }

    // Check for duplicate template name
    const existingTemplate = await prisma.whatsAppTemplate.findUnique({
      where: { templateName }
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 400 }
      )
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        templateName,
        templateText,
        variables: variables || [],
        category,
        createdBy: user.id
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}