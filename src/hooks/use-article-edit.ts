import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArticleStatus } from "@/lib/constants/articles";
import { routes } from "@/lib/routes";

import { logger } from '@/lib/logger';
interface ArticleFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImageUrl: string;
  category: string;
  status: ArticleStatus;
}

interface UseArticleEditProps {
  params: Promise<{ id: string }>;
}

export function useArticleEdit({ params }: UseArticleEditProps) {
  const router = useRouter();
  const [articleId, setArticleId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<ArticleFormData>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featuredImageUrl: "",
    category: "general",
    status: "draft",
  });

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const resolvedParams = await params;
        setArticleId(resolvedParams.id);

        logger.info("🔍 Edit Article: Loading article", { articleId: resolvedParams.id });
        const response = await fetch(`/api/cms/articles/${resolvedParams.id}`);

        if (!response.ok) {
          logger.error("❌ Edit Article: API error:", undefined, { statusCode: response.status });
          if (response.status === 404) {
            toast.error("Artikel tidak ditemukan");
          } else if (response.status === 401) {
            toast.error("Tidak memiliki akses");
          } else {
            toast.error("Gagal memuat artikel");
          }
          router.push(routes.cms);
          return;
        }

        const data = await response.json();
        logger.info("✅ Edit Article: Loaded", data.data);

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
      } catch (error: unknown) {
        logger.error("❌ Edit Article: Network error:", error instanceof Error ? error : new Error(String(error)));
        toast.error("Terjadi kesalahan saat memuat artikel");
        router.push(routes.cms);
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
      logger.info("💾 Edit Article: Saving changes...");
      const response = await fetch(`/api/cms/articles/${articleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("❌ Edit Article: API error:", errorData);
        toast.error(errorData.error || "Gagal menyimpan artikel");
        return;
      }

      logger.info("✅ Edit Article: Saved successfully");
      toast.success("Artikel berhasil diperbarui!");
      router.push(routes.cms);
    } catch (error: unknown) {
      logger.error("❌ Edit Article: Network error:", error instanceof Error ? error : new Error(String(error)));
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
      logger.info("🗑️ Edit Article: Deleting article...");
      const response = await fetch(`/api/cms/articles/${articleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("❌ Edit Article: Delete error:", errorData);
        toast.error(errorData.error || "Gagal menghapus artikel");
        return;
      }

      logger.info("✅ Edit Article: Deleted successfully");
      toast.success("Artikel berhasil dihapus!");
      router.push(routes.cms);
    } catch (error: unknown) {
      logger.error("❌ Edit Article: Delete network error:", error instanceof Error ? error : new Error(String(error)));
      toast.error("Terjadi kesalahan saat menghapus artikel");
    } finally {
      setDeleting(false);
    }
  };

  const updateFormData = (updates: Partial<ArticleFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return {
    articleId,
    loading,
    saving,
    deleting,
    formData,
    handleSubmit,
    handleDelete,
    updateFormData,
  };
}