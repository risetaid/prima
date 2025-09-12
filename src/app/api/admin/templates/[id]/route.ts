import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db, whatsappTemplates, users } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "DEVELOPER") {
      return NextResponse.json(
        { error: "Unauthorized. Superadmin access required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get template with creator details using separate queries
    const templateResult = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt,
      })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, id))
      .limit(1);

    if (templateResult.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const templateData = templateResult[0];

    // Get creator details if available
    let createdByUser = null;
    if (templateData.createdBy) {
      const creatorResult = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, templateData.createdBy))
        .limit(1);

      createdByUser = creatorResult.length > 0 ? creatorResult[0] : null;
    }

    const template = {
      ...templateData,
      createdByUser,
    };

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "DEVELOPER") {
      return NextResponse.json(
        { error: "Unauthorized. Superadmin access required." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { templateName, templateText, variables, category, isActive } = body;

    // Check if template exists
    const existingTemplateResult = await db
      .select({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        createdBy: whatsappTemplates.createdBy,
      })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, id))
      .limit(1);

    if (existingTemplateResult.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const existingTemplate = existingTemplateResult[0];

    // Check for duplicate template name (excluding current template)
    if (templateName && templateName !== existingTemplate.templateName) {
      const duplicateResult = await db
        .select({ id: whatsappTemplates.id })
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.templateName, templateName))
        .limit(1);

      if (duplicateResult.length > 0) {
        return NextResponse.json(
          { error: "Template with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Validation
    if (
      category &&
      !["REMINDER", "APPOINTMENT", "EDUCATIONAL"].includes(category)
    ) {
      return NextResponse.json(
        { error: "Invalid template category" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (templateName !== undefined) updateData.templateName = templateName;
    if (templateText !== undefined) updateData.templateText = templateText;
    if (variables !== undefined) updateData.variables = variables;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update template
    const updatedTemplateResult = await db
      .update(whatsappTemplates)
      .set(updateData)
      .where(eq(whatsappTemplates.id, id))
      .returning({
        id: whatsappTemplates.id,
        templateName: whatsappTemplates.templateName,
        templateText: whatsappTemplates.templateText,
        variables: whatsappTemplates.variables,
        category: whatsappTemplates.category,
        isActive: whatsappTemplates.isActive,
        createdBy: whatsappTemplates.createdBy,
        createdAt: whatsappTemplates.createdAt,
        updatedAt: whatsappTemplates.updatedAt,
      });

    const templateData = updatedTemplateResult[0];

    // Get creator details if available
    let createdByUser = null;
    if (templateData.createdBy) {
      const creatorResult = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, templateData.createdBy))
        .limit(1);

      createdByUser = creatorResult.length > 0 ? creatorResult[0] : null;
    }

    const template = {
      ...templateData,
      createdByUser,
    };

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template update error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "DEVELOPER") {
      return NextResponse.json(
        { error: "Unauthorized. Superadmin access required." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if template exists
    const existingTemplateResult = await db
      .select({ id: whatsappTemplates.id })
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.id, id))
      .limit(1);

    if (existingTemplateResult.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt timestamp
    const templateResult = await db
      .update(whatsappTemplates)
      .set({
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(whatsappTemplates.id, id))
      .returning();

    const template = templateResult[0];

    return NextResponse.json({
      message: "Template deactivated successfully",
      template,
    });
  } catch (error) {
    console.error("Template deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
