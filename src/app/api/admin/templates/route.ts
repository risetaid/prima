import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, whatsappTemplates, users } from '@/db'
import { eq, and, asc, inArray, isNull } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'DEVELOPER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL' | null
    const isActive = searchParams.get('active')

    // Build base query with filters - always exclude soft-deleted templates
    const conditions = [isNull(whatsappTemplates.deletedAt)]
    
    if (category) {
      conditions.push(eq(whatsappTemplates.category, category))
    }
    
    if (isActive !== null) {
      conditions.push(eq(whatsappTemplates.isActive, isActive === 'true'))
    }

    // Execute query with optional filters and ordering
    const templatesData = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt
      })
      .from(whatsappTemplates)
      .where(and(...conditions))
      .orderBy(
        asc(whatsappTemplates.category),
        asc(whatsappTemplates.templateName)
      )

    // Get creator details for all templates
    const creatorIds = [...new Set(templatesData.map(t => t.createdBy).filter(Boolean))]
    const creatorDetails = creatorIds.length > 0 ? await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(inArray(users.id, creatorIds)) : []

    // Create creator lookup map
    const creatorMap = new Map()
    creatorDetails.forEach(creator => {
      creatorMap.set(creator.id, creator)
    })

    // Format response to match Prisma structure
    const templates = templatesData.map(template => ({
      id: template.id,
      templateName: template.templateName,
      templateText: template.templateText,
      variables: template.variables,
      category: template.category,
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdByUser: creatorMap.get(template.createdBy) || null
    }))

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

    if (!user || (user.role !== 'DEVELOPER' && user.role !== 'ADMIN')) {
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
    const existingTemplate = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName
      })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.templateName, templateName))
      .limit(1)

    if (existingTemplate.length > 0) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 400 }
      )
    }

    // Create template
    const newTemplate = await db
      .insert(whatsappTemplates)
      .values({
        templateName,
        templateText,
        variables: variables || [],
        category,
        createdBy: user.id,
        isActive: true
      })
      .returning({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt
      })

    const createdTemplate = newTemplate[0]

    // Get creator details
    const creatorDetails = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    // Format response to match Prisma structure
    const template = {
      ...createdTemplate,
      createdByUser: creatorDetails.length > 0 ? creatorDetails[0] : null
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
