"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TinyMCEEditor } from "@/components/cms/TinyMCEEditor";
import { generateRandomString } from "@/lib/slug-utils";
import { Save, Eye, Plus, X, FileText } from "lucide-react";
import { BackButton } from '@/components/ui/back-button';
import { toast } from "sonner";
import { CMSBreadcrumb } from "@/components/ui/breadcrumb";

interface FormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImageUrl: string;
  category: string;
  tags: string[];
  status: "draft" | "published" | "archived";
}

export default function CreateArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: generateRandomString(8), // Generate random slug by default
    content: "",
    excerpt: "",
    featuredImageUrl: "",
    category: "",
    tags: [],
    status: "draft",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = [
    { value: "general", label: "Umum" },
    { value: "nutrisi", label: "Nutrisi" },
    { value: "olahraga", label: "Olahraga" },
    { value: "motivational", label: "Motivasi" },
    { value: "medical", label: "Medis" },
    { value: "faq", label: "FAQ" },
    { value: "testimoni", label: "Testimoni" },
  ];

  const generateNewSlug = () => {
    return generateRandomString(8);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Judul wajib diisi";
    if (!formData.slug.trim()) newErrors.slug = "Slug wajib diisi";
    if (!formData.content.trim()) newErrors.content = "Konten wajib diisi";
    if (!formData.category) newErrors.category = "Kategori wajib dipilih";

    if (formData.featuredImageUrl && !isValidUrl(formData.featuredImageUrl)) {
      newErrors.featuredImageUrl = "URL gambar tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async (status: "draft" | "published") => {
    const dataToSave = { ...formData, status };

    if (!validateForm()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/cms/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Artikel berhasil ${
            status === "published" ? "dipublikasikan" : "disimpan sebagai draft"
          }`
        );
        router.push("/dashboard/cms");
      } else {
        if (result.details) {
          // Handle validation errors from API
          const apiErrors: Record<string, string> = {};
          result.details.forEach((error: any) => {
            apiErrors[error.path[0]] = error.message;
          });
          setErrors(apiErrors);
        } else {
          toast.error(result.error || "Terjadi kesalahan");
        }
      }
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error("Terjadi kesalahan saat menyimpan artikel");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton text="Kembali ke CMS" />
          <div className="h-6 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Artikel Baru</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/cms")}
            disabled={saving}
          >
            Batal
          </Button>
          <Button
            onClick={() => handleSave("draft")}
            disabled={saving || !formData.title.trim()}
            variant="outline"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan Draft
          </Button>
          <Button
            onClick={() => handleSave("published")}
            disabled={saving || !formData.title.trim()}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Publikasikan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Artikel</CardTitle>
              <CardDescription>
                Masukkan detail artikel edukasi kesehatan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Judul Artikel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Masukkan judul artikel..."
                  className={errors.title ? "border-red-500 mt-2" : "mt-2"}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">Slug URL *</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange("slug", e.target.value)}
                    placeholder="Random slug"
                    className={errors.slug ? "border-red-500 mt-2" : "mt-2"}
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        slug: generateNewSlug(),
                      }))
                    }
                  >
                    Generate
                  </Button>
                </div>
                {errors.slug && (
                  <p className="text-sm text-red-600 mt-1">{errors.slug}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  URL artikel: /content/articles/
                  {formData.slug || "random-slug"}
                </p>
              </div>

              <div>
                <Label htmlFor="excerpt">Ringkasan</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange("excerpt", e.target.value)}
                  placeholder="Ringkasan singkat artikel (opsional)..."
                  rows={3}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ringkasan akan tampil dalam daftar artikel dan preview
                </p>
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="content">Konten Artikel *</Label>
                <div className="mt-2">
                  <TinyMCEEditor
                    value={formData.content}
                    onEditorChange={(content) =>
                      handleInputChange("content", content)
                    }
                    placeholder="Tulis konten artikel lengkap di sini..."
                  />
                </div>
                {errors.content && (
                  <p className="text-sm text-red-600 mt-1">{errors.content}</p>
                )}
              </div>
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
              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    handleInputChange("category", value)
                  }
                >
                  <SelectTrigger
                    className={`mt-2 ${
                      errors.category ? "border-red-500" : ""
                    }`}
                  >
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-600 mt-1">{errors.category}</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">
                  Status artikel akan ditentukan berdasarkan tombol yang
                  dipilih:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Save className="h-4 w-4" />
                    <span>
                      <strong>Simpan Draft:</strong> Artikel disimpan sebagai
                      draft
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Eye className="h-4 w-4" />
                    <span>
                      <strong>Publikasikan:</strong> Artikel langsung
                      dipublikasikan
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Tambah tag..."
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                />
                <Button type="button" size="sm" onClick={addTag}>
                  +
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Gambar Unggulan</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="featuredImage">URL Gambar</Label>
                <Input
                  id="featuredImage"
                  type="url"
                  value={formData.featuredImageUrl}
                  onChange={(e) =>
                    handleInputChange("featuredImageUrl", e.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                  className={
                    errors.featuredImageUrl ? "border-red-500 mt-2" : "mt-2"
                  }
                />
                {errors.featuredImageUrl && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.featuredImageUrl}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Opsional. Gambar akan tampil di preview artikel
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
