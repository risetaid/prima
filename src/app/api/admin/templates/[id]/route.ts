import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id } = await params

    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id },
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

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { templateName, templateText, variables, category, isActive } = body

    // Check if template exists
    const existingTemplate = await prisma.whatsAppTemplate.findUnique({
      where: { id }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Check for duplicate template name (excluding current template)
    if (templateName && templateName !== existingTemplate.templateName) {
      const duplicateTemplate = await prisma.whatsAppTemplate.findUnique({
        where: { templateName }
      })

      if (duplicateTemplate) {
        return NextResponse.json(
          { error: 'Template with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Validation
    if (category && !['REMINDER', 'APPOINTMENT', 'EDUCATIONAL'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid template category' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    
    if (templateName !== undefined) updateData.templateName = templateName
    if (templateText !== undefined) updateData.templateText = templateText
    if (variables !== undefined) updateData.variables = variables
    if (category !== undefined) updateData.category = category
    if (isActive !== undefined) updateData.isActive = isActive

    const template = await prisma.whatsAppTemplate.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template update error:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if template exists
    const existingTemplate = await prisma.whatsAppTemplate.findUnique({
      where: { id }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive = false
    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ 
      message: 'Template deactivated successfully',
      template 
    })
  } catch (error) {
    console.error('Template deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}