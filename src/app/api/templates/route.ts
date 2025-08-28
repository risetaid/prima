import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as 'REMINDER' | 'APPOINTMENT' | 'EDUCATIONAL' | null

    const whereClause: any = {
      isActive: true
    }
    
    if (category) {
      whereClause.category = category
    }

    const templates = await prisma.whatsAppTemplate.findMany({
      where: whereClause,
      select: {
        id: true,
        templateName: true,
        templateText: true,
        variables: true,
        category: true,
        createdAt: true
      },
      orderBy: [
        { category: 'asc' },
        { templateName: 'asc' }
      ]
    })

    // Group templates by category
    const groupedTemplates = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    }, {} as Record<string, typeof templates>)

    return NextResponse.json({ 
      templates,
      grouped: groupedTemplates
    })
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}