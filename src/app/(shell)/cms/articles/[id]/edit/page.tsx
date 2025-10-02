"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useArticleEdit } from "@/hooks/use-article-edit";
import { ArticleActions } from "@/components/cms/article-actions";
import { ArticleFormFields } from "@/components/cms/article-form-fields";
import { PublishSettings } from "@/components/cms/publish-settings";
import { ThumbnailUpload } from "@/components/cms/thumbnail-upload";
import { RoleGuard } from "@/components/auth/role-guard";

interface ArticleEditPageProps {
  params: Promise<{ id: string }>;
}

function ArticleEditPageContent({ params }: ArticleEditPageProps) {
  const {
    loading,
    saving,
    deleting,
    formData,
    handleSubmit,
    handleDelete,
    updateFormData,
  } = useArticleEdit({ params });

  const handleFormFieldChange = (field: string, value: string) => {
    updateFormData({ [field]: value });
  };

  const handleImageChange = (url: string) => {
    updateFormData({ featuredImageUrl: url });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ArticleActions
        formData={formData}
        saving={saving}
        deleting={deleting}
        onDelete={handleDelete}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Artikel</CardTitle>
              <CardDescription>
                Edit detail artikel edukasi kesehatan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form id="edit-article-form" onSubmit={handleSubmit}>
                <ArticleFormFields
                  formData={formData}
                  onChange={handleFormFieldChange}
                />
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Publikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PublishSettings
                formData={formData}
                onChange={handleFormFieldChange}
              />
            </CardContent>
          </Card>

          {/* Gambar Thumbnail */}
          <Card>
            <CardHeader>
              <CardTitle>Gambar Thumbnail</CardTitle>
            </CardHeader>
            <CardContent>
              <ThumbnailUpload
                featuredImageUrl={formData.featuredImageUrl}
                onImageChange={handleImageChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ArticleEditPage({ params }: ArticleEditPageProps) {
  return (
    <RoleGuard allowedRoles={["ADMIN", "DEVELOPER"]}>
      <ArticleEditPageContent params={params} />
    </RoleGuard>
  );
}
