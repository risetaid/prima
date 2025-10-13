"use client";

import React, { useState } from "react";
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
import { Video, Save, Eye, Download } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { generateRandomSlug } from "@/lib/slug-utils";
import {
  extractYouTubeVideoId,
  fetchYouTubeVideoData,
} from "@/lib/youtube-utils";
import Image from "next/image";

import { logger } from '@/lib/logger';
const categories = [
  { value: "general", label: "Umum", color: "bg-blue-100 text-blue-800" },
  { value: "nutrisi", label: "Nutrisi", color: "bg-green-100 text-green-800" },
  {
    value: "olahraga",
    label: "Olahraga",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "motivational",
    label: "Motivasi",
    color: "bg-orange-100 text-orange-800",
  },
  { value: "medical", label: "Medis", color: "bg-red-100 text-red-800" },
  { value: "faq", label: "FAQ", color: "bg-indigo-100 text-indigo-800" },
  {
    value: "testimoni",
    label: "Testimoni",
    color: "bg-pink-100 text-pink-800",
  },
];

interface FormData {
  title: string;
  slug: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationMinutes: string;
  category: string;
  status: "draft" | "published";
}

interface ValidationError {
  path: string[];
  message: string;
}

export default function CreateVideoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingVideoData, setFetchingVideoData] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: generateRandomSlug(), // Use YouTube-style random slug
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    durationMinutes: "",
    category: "motivational",
    status: "draft",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const generateNewSlug = () => {
    return generateRandomSlug();
  };

  const fetchVideoDataFromUrl = async () => {
    if (!formData.videoUrl.trim()) {
      toast.error("Masukkan URL video terlebih dahulu");
      return;
    }

    const videoId = extractYouTubeVideoId(formData.videoUrl);
    if (!videoId) {
      toast.error("URL YouTube tidak valid");
      return;
    }

    setFetchingVideoData(true);
    try {
      const videoData = await fetchYouTubeVideoData(videoId);

      setFormData((prev) => ({
        ...prev,
        title: videoData.title || prev.title,
        description: videoData.description || prev.description,
        thumbnailUrl:
          videoData.thumbnailUrl ||
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        durationMinutes: videoData.duration || prev.durationMinutes,
      }));

      toast.success("Data video berhasil diambil!");
    } catch (error: unknown) {
      logger.error("Error fetching video data:", error instanceof Error ? error : new Error(String(error)));
      toast.error("Gagal mengambil data video. Pastikan URL valid.");
    } finally {
      setFetchingVideoData(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Judul video wajib diisi";
    if (!formData.slug.trim()) newErrors.slug = "Slug wajib diisi";
    if (!formData.videoUrl.trim()) newErrors.videoUrl = "URL video wajib diisi";
    if (!formData.category) newErrors.category = "Kategori wajib dipilih";

    // Validate YouTube URL
    if (formData.videoUrl && !extractYouTubeVideoId(formData.videoUrl)) {
      newErrors.videoUrl = "URL YouTube tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (status: "draft" | "published") => {
    const dataToSave = { ...formData, status };

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/cms/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Video berhasil ${
            status === "published" ? "dipublikasikan" : "disimpan sebagai draft"
          }`
        );
        router.push("/cms");
      } else {
        if (result.details) {
          // Handle validation errors from API
           const apiErrors: Record<string, string> = {};
           result.details.forEach((error: ValidationError) => {
             apiErrors[error.path[0]] = error.message;
           });
          setErrors(apiErrors);
        } else {
          toast.error(result.error || "Terjadi kesalahan");
        }
      }
    } catch (error: unknown) {
      logger.error("Error saving video:", error instanceof Error ? error : new Error(String(error)));
      toast.error("Terjadi kesalahan saat menyimpan video");
    } finally {
      setLoading(false);
    }
  };

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
                <Video className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  Video Baru
                </h1>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/cms")}
                disabled={loading}
                className="w-full sm:w-auto sm:flex-none order-3 sm:order-1"
                size="sm"
              >
                Batal
              </Button>
              <Button
                onClick={() => handleSave("draft")}
                disabled={loading || !formData.title.trim()}
                variant="outline"
                className="w-full sm:w-auto sm:flex-none order-2"
                size="sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                <span className="hidden xs:inline">Simpan Draft</span>
                <span className="xs:hidden">Draft</span>
              </Button>
              <Button
                onClick={() => handleSave("published")}
                disabled={loading || !formData.title.trim()}
                className="w-full sm:w-auto sm:flex-none order-1 sm:order-3"
                size="sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                <span className="hidden xs:inline">Publikasikan</span>
                <span className="xs:hidden">Publish</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Video</CardTitle>
              <CardDescription>
                Masukkan URL YouTube untuk auto-fetch data video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video URL with Auto-fetch */}
              <div>
                <Label htmlFor="videoUrl">URL YouTube *</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="videoUrl"
                    value={formData.videoUrl}
                    onChange={(e) =>
                      handleInputChange("videoUrl", e.target.value)
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={errors.videoUrl ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    onClick={fetchVideoDataFromUrl}
                    disabled={fetchingVideoData || !formData.videoUrl.trim()}
                    variant="outline"
                  >
                    {fetchingVideoData ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Auto-fetch
                  </Button>
                </div>
                {errors.videoUrl && (
                  <p className="text-sm text-red-600 mt-1">{errors.videoUrl}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Klik &quot;Auto-fetch&quot; untuk mengambil data video secara
                  otomatis
                </p>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Judul Video *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Contoh: Latihan Pernapasan untuk Pasien Kanker"
                  className={`mt-2 ${errors.title ? "border-red-500" : ""}`}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange("slug", e.target.value)}
                    placeholder="YouTube-style random slug"
                    className={errors.slug ? "border-red-500" : ""}
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
                  URL: /content/videos/{formData.slug || "random-slug"}
                </p>
              </div>

              {/* Duration - Auto-filled */}
              <div>
                <Label htmlFor="duration">Durasi</Label>
                <Input
                  id="duration"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    handleInputChange("durationMinutes", e.target.value)
                  }
                  placeholder="Auto-filled dari YouTube (atau isi manual)"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Akan diisi otomatis saat auto-fetch (jika tersedia)
                </p>
              </div>

              {/* Description - Auto-filled */}
              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Auto-filled dari deskripsi YouTube (atau isi manual)"
                  rows={6}
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Akan diisi otomatis saat auto-fetch dari deskripsi YouTube
                </p>
              </div>

              {/* Thumbnail URL - Auto-filled */}
              <div>
                <Label htmlFor="thumbnailUrl">URL Thumbnail</Label>
                <Input
                  id="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={(e) =>
                    handleInputChange("thumbnailUrl", e.target.value)
                  }
                  placeholder="Auto-filled dari YouTube thumbnail"
                  className="mt-2"
                  readOnly
                />
                <p className="text-sm text-gray-500 mt-1">
                  Thumbnail otomatis diambil dari YouTube dengan kualitas
                  maksimal
                </p>
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
                  Status video akan ditentukan berdasarkan tombol yang dipilih:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Save className="h-4 w-4" />
                    <span>
                      <strong>Simpan Draft:</strong> Video disimpan sebagai
                      draft
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Eye className="h-4 w-4" />
                    <span>
                      <strong>Publikasikan:</strong> Video langsung
                      dipublikasikan
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Preview */}
          {formData.thumbnailUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Image
                  src={formData.thumbnailUrl}
                  alt="Video thumbnail"
                  width={400}
                  height={225}
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

