import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { db, patientVariables, patients } from '@/db'
import { eq, and } from 'drizzle-orm'

// GET /api/patients/[id]/variables - Get all variables for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params

    // Verify patient exists
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    if (patient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Get all active variables for this patient
    const variables = await db
      .select({
        id: patientVariables.id,
        variableName: patientVariables.variableName,
        variableValue: patientVariables.variableValue,
        createdAt: patientVariables.createdAt,
        updatedAt: patientVariables.updatedAt,
      })
      .from(patientVariables)
      .where(and(
        eq(patientVariables.patientId, patientId),
        eq(patientVariables.isActive, true)
      ))
      .orderBy(patientVariables.variableName)

    // Convert to object format for easy access
    const variablesObject = variables.reduce((acc, variable) => {
      acc[variable.variableName] = variable.variableValue
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      success: true,
      patientId,
      variables: variablesObject,
      variablesList: variables,
      count: variables.length
    })

  } catch (error) {
    console.error('Error fetching patient variables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/patients/[id]/variables - Create or update patient variables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params
    const body = await request.json()
    const { variables } = body

    if (!variables || typeof variables !== 'object') {
      return NextResponse.json({ 
        error: 'Variables object is required' 
      }, { status: 400 })
    }

    // Verify patient exists
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1)

    if (patient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Get existing variables
    const existingVariables = await db
      .select()
      .from(patientVariables)
      .where(and(
        eq(patientVariables.patientId, patientId),
        eq(patientVariables.isActive, true)
      ))

    const existingVariableNames = new Set(
      existingVariables.map(v => v.variableName)
    )

    const operations = []

    // Process each variable in the request
    for (const [variableName, variableValue] of Object.entries(variables)) {
      if (typeof variableValue !== 'string' || variableValue.trim() === '') {
        continue // Skip empty or non-string values
      }

      if (existingVariableNames.has(variableName)) {
        // Update existing variable
        operations.push(
          db
            .update(patientVariables)
            .set({
              variableValue: variableValue.trim(),
              updatedAt: new Date()
            })
            .where(and(
              eq(patientVariables.patientId, patientId),
              eq(patientVariables.variableName, variableName),
              eq(patientVariables.isActive, true)
            ))
        )
      } else {
        // Create new variable
        operations.push(
          db
            .insert(patientVariables)
            .values({
              patientId,
              variableName,
              variableValue: variableValue.trim(),
              createdById: currentUser.id,
              isActive: true
            })
        )
      }
    }

    // Execute all operations
    if (operations.length > 0) {
      await Promise.all(operations)
    }

    // Return updated variables
    const updatedVariables = await db
      .select({
        id: patientVariables.id,
        variableName: patientVariables.variableName,
        variableValue: patientVariables.variableValue,
        createdAt: patientVariables.createdAt,
        updatedAt: patientVariables.updatedAt,
      })
      .from(patientVariables)
      .where(and(
        eq(patientVariables.patientId, patientId),
        eq(patientVariables.isActive, true)
      ))
      .orderBy(patientVariables.variableName)

    const variablesObject = updatedVariables.reduce((acc, variable) => {
      acc[variable.variableName] = variable.variableValue
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      success: true,
      message: 'Variables updated successfully',
      patientId,
      variables: variablesObject,
      variablesList: updatedVariables,
      count: updatedVariables.length
    })

  } catch (error) {
    console.error('Error updating patient variables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/[id]/variables - Delete a specific variable
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: patientId } = await params
    const { searchParams } = new URL(request.url)
    const variableName = searchParams.get('variableName')

    if (!variableName) {
      return NextResponse.json({
        error: 'variableName parameter is required'
      }, { status: 400 })
    }

    // Soft delete the variable (set isActive = false)
    const result = await db
      .update(patientVariables)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(patientVariables.patientId, patientId),
        eq(patientVariables.variableName, variableName),
        eq(patientVariables.isActive, true)
      ))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({
        error: 'Variable not found or already deleted'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Variable "${variableName}" deleted successfully`,
      deletedVariable: result[0]
    })

  } catch (error) {
    console.error('Error deleting patient variable:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}