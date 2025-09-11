"use client";

import React, { useState, useEffect } from "react";
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
import { FileText, Save, Eye, Trash2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const TinyMCEEditor = dynamic(
  () =>
    import("@/components/cms/TinyMCEEditor").then((mod) => ({
      default: mod.TinyMCEEditor,
    })),
  {
    loading: () => (
      <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
        Loading editor...
      </div>
    ),
  }
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { AlertModal } from "@/components/ui/alert-modal";

const categories = [
  { value: "general", label: "Umum" },
  { value: "nutrisi", label: "Nutrisi" },
  { value: "olahraga", label: "Olahraga" },
  { value: "motivational", label: "Motivasi" },
  { value: "medical", label: "Medis" },
  { value: "faq", label: "FAQ" },
  { value: "testimoni", label: "Testimoni" },
];

interface ArticleEditPageProps {
  params: Promise<{ id: string }>;
}

export default function ArticleEditPage({ params }: ArticleEditPageProps) {
  const router = useRouter();
  const [articleId, setArticleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featuredImageUrl: "",
    category: "general",
    status: "draft" as "draft" | "published" | "archived",
  });

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const resolvedParams = await params;
        setArticleId(resolvedParams.id);

        console.log("🔍 Edit Article: Loading article", resolvedParams.id);
        const response = await fetch(`/api/cms/articles/${resolvedParams.id}`);

        if (!response.ok) {
          console.error("❌ Edit Article: API error:", response.status);
          if (response.status === 404) {
            toast.error("Artikel tidak ditemukan");
          } else if (response.status === 401) {
            toast.error("Tidak memiliki akses");
          } else {
            toast.error("Gagal memuat artikel");
          }
          router.push("/dashboard/cms");
          return;
        }

        const data = await response.json();
        console.log("✅ Edit Article: Loaded", data.data);

        if (data.success) {
          const article = data.data;
          setFormData({
            title: article.title || "",
            slug: article.slug || "",
            content: article.content || "",
            excerpt: article.excerpt || "",
            featuredImageUrl: article.featuredImageUrl || "",
            category: article.category || "general",
            status: article.status || "draft",
          });
        }
      } catch (error) {
        console.error("❌ Edit Article: Network error:", error);
        toast.error("Terjadi kesalahan saat memuat artikel");
        router.push("/dashboard/cms");
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [params, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Judul artikel wajib diisi");
      return;
    }

    setSaving(true);

    try {
      console.log("💾 Edit Article: Saving changes...");
      const response = await fetch(`/api/cms/articles/${articleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Edit Article: API error:", errorData);
        toast.error(errorData.error || "Gagal menyimpan artikel");
        return;
      }

      const data = await response.json();
      console.log("✅ Edit Article: Saved successfully");

      toast.success("Artikel berhasil diperbarui!");
      router.push("/dashboard/cms");
    } catch (error) {
      console.error("❌ Edit Article: Network error:", error);
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Yakin ingin menghapus artikel ini? Tindakan ini tidak dapat dibatalkan."
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      console.log("🗑️ Edit Article: Deleting article...");
      const response = await fetch(`/api/cms/articles/${articleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Edit Article: Delete error:", errorData);
        toast.error(errorData.error || "Gagal menghapus artikel");
        return;
      }

      console.log("✅ Edit Article: Deleted successfully");
      toast.success("Artikel berhasil dihapus!");
      router.push("/dashboard/cms");
    } catch (error) {
      console.error("❌ Edit Article: Delete network error:", error);
      toast.error("Terjadi kesalahan saat menghapus artikel");
    } finally {
      setDeleting(false);
    }
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
      {/* Action Buttons Card */}
      <Card>
        <CardContent className="py-2 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 sm:flex-none">
              <BackButton text="Kembali ke CMS" />
              <div className="hidden sm:block h-6 w-px bg-gray-300 flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  Edit Artikel
                </h1>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {formData.status === "published" && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto sm:flex-none order-4 sm:order-1"
                >
                  <Link
                    href={`/content/articles/${formData.slug}`}
                    target="_blank"
                    className="flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden xs:inline">Lihat</span>
                  </Link>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto sm:flex-none order-3 sm:order-2"
                size="sm"
              >
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                <span className="hidden xs:inline">Hapus</span>
                <span className="xs:hidden">Del</span>
              </Button>

              <Button
                form="edit-article-form"
                disabled={saving || !formData.title.trim()}
                className="w-full sm:w-auto sm:flex-none order-2 sm:order-3"
                size="sm"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                <span className="hidden xs:inline">Simpan</span>
                <span className="xs:hidden">Save</span>
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
                Edit detail artikel edukasi kesehatan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form id="edit-article-form" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Judul Artikel *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Masukkan judul artikel..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug URL *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          slug: e.target.value,
                        }))
                      }
                      placeholder="slug-artikel"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      URL artikel: /content/articles/
                      {formData.slug || "slug-artikel"}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Ringkasan</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          excerpt: e.target.value,
                        }))
                      }
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
                          setFormData((prev) => ({ ...prev, content }))
                        }
                        placeholder="Edit konten artikel lengkap di sini..."
                      />
                    </div>
                  </div>
                </div>
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
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value as any }))
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Kategori *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger className="mt-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Gambar Thumbnail */}
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
                        if (!file.type.startsWith("image/")) {
                          alert("File harus berupa gambar");
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          alert("File harus kurang dari 2MB");
                          return;
                        }

                        try {
                          // Upload file to get permanent URL
                          const formDataUpload = new FormData();
                          formDataUpload.append("thumbnail", file);

                          const uploadResponse = await fetch(
                            "/api/upload?type=article-thumbnail",
                            {
                              method: "POST",
                              body: formDataUpload,
                            }
                          );

                          if (!uploadResponse.ok) {
                            throw new Error("Upload failed");
                          }

                          const uploadResult = await uploadResponse.json();

                          if (uploadResult.success && uploadResult.url) {
                            setFormData((prev) => ({
                              ...prev,
                              featuredImageUrl: uploadResult.url,
                            }));
                            toast.success("Gambar berhasil diupload");
                          } else {
                            throw new Error(
                              uploadResult.error || "Upload failed"
                            );
                          }
                        } catch (error) {
                          console.error("Upload error:", error);
                          toast.error("Gagal mengupload gambar");
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
                          onClick={() =>
                            document.getElementById("thumbnail-upload")?.click()
                          }
                        >
                          Ganti Gambar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              featuredImageUrl: "",
                            }));
                            const input = document.getElementById(
                              "thumbnail-upload"
                            ) as HTMLInputElement;
                            if (input) input.value = "";
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() =>
                        document.getElementById("thumbnail-upload")?.click()
                      }
                    >
                      <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
                        <svg fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM11 7a1 1 0 112 0v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H7a1 1 0 110-2h4V7z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-1">
                        Klik untuk upload gambar thumbnail
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG, WebP - Max 2MB
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-500">
                  Opsional. Gambar akan tampil sebagai thumbnail di halaman
                  berita
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
