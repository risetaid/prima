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
import dynamic from 'next/dynamic'
const TinyMCEEditor = dynamic(() => import('@/components/cms/TinyMCEEditor').then(mod => ({ default: mod.TinyMCEEditor })), {
  loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">Loading editor...</div>
})
import { generateRandomString } from "@/lib/slug-utils";
import { Save, Eye, FileText } from "lucide-react";
import { BackButton } from '@/components/ui/back-button';
import { toast } from "sonner";

interface FormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImageUrl: string;
  category: string;
  status: "draft" | "published" | "archived";
}

export default function CreateArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: generateRandomString(8), // Generate random slug by default
    content: "",
    excerpt: "",
    featuredImageUrl: "",
    category: "",
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Judul wajib diisi";
    if (!formData.slug.trim()) newErrors.slug = "Slug wajib diisi";
    if (!formData.content.trim()) newErrors.content = "Konten wajib diisi";
    if (!formData.category) newErrors.category = "Kategori wajib dipilih";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      {/* Action Buttons Card */}
      <Card>
        <CardContent className="py-2">
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
        </CardContent>
      </Card>

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



          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Gambar Thumbnail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* File upload area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    id="thumbnail-upload"
                    accept="image/*"
                    className="hidden"
                     onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                         // Simple validation
                         if (!file.type.startsWith('image/')) {
                           alert('File harus berupa gambar');
                           return;
                         }
                         if (file.size > 2 * 1024 * 1024) {
                           alert('File harus kurang dari 2MB');
                           return;
                         }

                         try {
                           // Upload file to get permanent URL
                           const formDataUpload = new FormData();
                           formDataUpload.append('thumbnail', file);

                           const uploadResponse = await fetch('/api/upload?type=article-thumbnail', {
                             method: 'POST',
                             body: formDataUpload,
                           });

                           if (!uploadResponse.ok) {
                             throw new Error('Upload failed');
                           }

                           const uploadResult = await uploadResponse.json();

                           if (uploadResult.success && uploadResult.url) {
                             setFormData(prev => ({ ...prev, featuredImageUrl: uploadResult.url }));
                             toast.success('Gambar berhasil diupload');
                           } else {
                             throw new Error(uploadResult.error || 'Upload failed');
                           }
                         } catch (error) {
                           console.error('Upload error:', error);
                           toast.error('Gagal mengupload gambar');
                         }
                       }
                     }}
                  />
                  
                   {formData.featuredImageUrl ? (
                     <div className="space-y-3">
                       <img
                         src={formData.featuredImageUrl}
                         alt="Thumbnail preview"
                         className="mx-auto max-h-32 rounded-lg border"
                       />
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('thumbnail-upload')?.click()}
                        >
                          Ganti Gambar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                           onClick={() => {
                             setFormData(prev => ({ ...prev, featuredImageUrl: '' }));
                             const input = document.getElementById('thumbnail-upload') as HTMLInputElement;
                             if (input) input.value = '';
                           }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer"
                      onClick={() => document.getElementById('thumbnail-upload')?.click()}
                    >
                      <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM11 7a1 1 0 112 0v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H7a1 1 0 110-2h4V7z"/>
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-1">Klik untuk upload gambar thumbnail</p>
                      <p className="text-sm text-gray-500">PNG, JPG, WebP - Max 2MB</p>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-500">
                  Opsional. Gambar akan tampil sebagai thumbnail di halaman berita
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
