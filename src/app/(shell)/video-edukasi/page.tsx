"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Calendar,
  User,
  Play,
  ExternalLink,
  Search,
  Filter,
  Grid,
  List,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { VideoCardSkeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/ui/header";
import { ThumbnailImage } from "@/components/ui/optimized-image";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

interface VideoContent {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  status: "published";
  publishedAt: string;
  createdAt: string;
  author?: string;
  durationMinutes?: string;
  thumbnailUrl?: string;
}

interface ApiContentItem {
  id: string;
  type: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  status: string;
  publishedAt: string;
  createdAt: string;
  author?: string;
  durationMinutes?: string;
  thumbnailUrl?: string;
}

export default function VideoPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isMounted, setIsMounted] = useState(false);

  const filterVideos = useCallback(() => {
    let filtered = videos;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (video) =>
          video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (video.description &&
            video.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (video) => video.category === selectedCategory
      );
    }

    setFilteredVideos(filtered);
  }, [videos, searchTerm, selectedCategory]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchPublishedVideos();
  }, []);

  useEffect(() => {
    filterVideos();
  }, [videos, searchTerm, selectedCategory, filterVideos]);


  const getUniqueCategories = () => {
    const categories = videos.map((video) => video.category);
    return Array.from(new Set(categories));
  };

  const fetchPublishedVideos = async () => {
    try {
      logger.info("Fetching published videos");

      const response = await fetch("/api/cms/content?type=videos&public=true&limit=20");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Silakan login untuk mengakses video edukasi");
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch videos`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Videos are already filtered to published only by the API
        const publishedVideos = data.data.filter(
          (item: ApiContentItem) => item.type === "video"
        );
        setVideos(publishedVideos);
        logger.info(`Loaded ${publishedVideos.length} published videos`);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (error) {
      logger.error("Failed to load videos", error instanceof Error ? error : new Error(String(error)));
      setError(
        error instanceof Error ? error.message : "Gagal memuat video edukasi"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      });
    } catch {
      return new Date(dateString).toLocaleDateString();
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-blue-100 text-blue-800 border-blue-200",
      nutrisi: "bg-green-100 text-green-800 border-green-200",
      olahraga: "bg-purple-100 text-purple-800 border-purple-200",
      motivational: "bg-orange-100 text-orange-800 border-orange-200",
      medical: "bg-red-100 text-red-800 border-red-200",
      faq: "bg-indigo-100 text-indigo-800 border-indigo-200",
      testimoni: "bg-pink-100 text-pink-800 border-pink-200",
    };
    return (
      colors[category.toLowerCase()] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: "Umum",
      nutrisi: "Nutrisi",
      olahraga: "Olahraga",
      motivational: "Motivasi",
      medical: "Medis",
      faq: "FAQ",
      testimoni: "Testimoni",
    };
    return labels[category.toLowerCase()] || category;
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return null;
    // Handle different duration formats
    if (duration.includes(":")) {
      return duration; // Already in MM:SS format
    }
    return `${duration}`; // Just append for now
  };

  const Background = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{
          backgroundImage: "url(/bg_desktop.png)",
        }}
      />
    </div>
  );

  const VideoCard = ({ video, viewMode }: { video: VideoContent; viewMode: "grid" | "list" }) => {
    const isValidThumbnail =
      video.thumbnailUrl &&
      typeof video.thumbnailUrl === "string" &&
      video.thumbnailUrl.trim() !== "";

    const Thumbnail = () => (
      <div className={`relative ${viewMode === "grid" ? "aspect-video" : "w-full sm:w-48 aspect-video"} bg-gray-100 ${viewMode === "list" ? "rounded-lg overflow-hidden flex-shrink-0" : ""} ${viewMode === "grid" ? "" : "flex items-center justify-center"}`}>
        {isValidThumbnail ? (
          <div className={`${viewMode === "grid" ? "group-hover:scale-105" : "hover:scale-105"} transition-transform duration-200`}>
            <ThumbnailImage
              src={video.thumbnailUrl!}
              alt={video.title}
              aspectRatio="video"
            />
          </div>
        ) : (
          <Video className={`h-${viewMode === "grid" ? "12" : "8"} w-${viewMode === "grid" ? "12" : "8"} text-gray-400`} />
        )}
        {video.durationMinutes && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(video.durationMinutes)}</span>
          </div>
        )}
      </div>
    );

    if (viewMode === "grid") {
      return (
        <Card className="bg-white hover:shadow-xl transition-all duration-200 border-0 shadow-md overflow-hidden group">
          <Thumbnail />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-3">
              <Badge className={`${getCategoryColor(video.category)} text-xs font-medium border`}>
                {getCategoryLabel(video.category)}
              </Badge>
              <Video className="h-5 w-5 text-red-500 group-hover:text-red-600 transition-colors" />
            </div>
            <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-red-600 transition-colors">
              {video.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {video.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{video.description}</p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(video.publishedAt)}</span>
              </div>
              {video.author && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-20">{video.author}</span>
                </div>
              )}
            </div>
            <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
              <Link href={`/content/videos/${video.slug}`} target="_blank" className="flex items-center justify-center gap-2">
                <Play className="h-4 w-4" />
                <span>Tonton Video</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-white hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Thumbnail />
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <Video className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{video.title}</h3>
                    <Badge className={`${getCategoryColor(video.category)} text-xs ml-3 flex-shrink-0`}>
                      {getCategoryLabel(video.category)}
                    </Badge>
                  </div>
                  {video.description && (
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{video.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(video.publishedAt)}</span>
                    </div>
                    {video.durationMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(video.durationMinutes)}</span>
                      </div>
                    )}
                    {video.author && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{video.author}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 self-start">
              <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                <Link href={`/content/videos/${video.slug}`} target="_blank" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  <span>Tonton</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const Controls = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, viewMode, setViewMode, isMounted, getUniqueCategories }: {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    selectedCategory: string;
    setSelectedCategory: (value: string) => void;
    viewMode: "grid" | "list";
    setViewMode: (mode: "grid" | "list") => void;
    isMounted: boolean;
    getUniqueCategories: () => string[];
  }) => (
    <div className="flex flex-col sm:flex-row gap-4 min-w-0 sm:min-w-96">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Cari video..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-50 border-gray-200"
        />
      </div>
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-full sm:w-48 bg-gray-50 border-gray-200">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Kategori</SelectItem>
          {getUniqueCategories().map((category) => (
            <SelectItem key={category} value={category}>
              {getCategoryLabel(category)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isMounted && (
        <div className="flex border rounded-lg bg-gray-50">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-l-lg transition-colors ${
              viewMode === "grid" ? "bg-red-100 text-red-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-r-lg transition-colors ${
              viewMode === "list" ? "bg-red-100 text-red-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  const EducationalFooter = () => (
    <div className="mt-12 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-8 border border-red-100">
      <div className="text-center max-w-3xl mx-auto">
        <div className="text-4xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Tips Menonton Video Edukasi</h3>
        <p className="text-gray-700 leading-relaxed">
          Video-video ini telah dirancang khusus oleh tim medis berpengalaman untuk memberikan motivasi dan edukasi praktis dalam perawatan kesehatan.
          <strong className="text-red-700"> Tonton dengan tenang</strong> dan terapkan tips yang sesuai dengan kondisi kesehatan Anda.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">✓ Konten Profesional</span>
          <span className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">✓ Motivasi Positif</span>
          <span className="px-3 py-1 bg-white rounded-full text-sm text-red-700 border border-red-200">✓ Mudah Dipraktikkan</span>
        </div>
      </div>
    </div>
  );

  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 relative">
      <Background />

      {/* Desktop: Header */}
      <div className="hidden lg:block relative z-10">
        <Header showNavigation={true} />
      </div>

      {/* Mobile: Header */}
      <div className="lg:hidden relative z-10">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-4 py-5">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <h1 className="text-xl font-bold text-blue-600">PRIMA</h1>
            <UserButton />
          </div>
        </header>
      </div>

      {/* Desktop: Main Content */}
      <div className="hidden lg:block relative z-10">
        <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>

      {/* Mobile: Card Layout */}
      <div className="lg:hidden relative z-10">
        <main className="px-4 py-8">
          {/* Mobile: Controls */}
          <div className="mb-6">
            {/* Search Bar - Full Width */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Mobile: Filter Buttons */}
            <div className="flex space-x-3 mb-6">
              {getUniqueCategories().map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    selectedCategory === category
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {getCategoryLabel(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredVideos.map((video) => {
              const categoryLabel = getCategoryLabel(video.category);
              const categoryColor = getCategoryColor(video.category);

              return (
                <div
                  key={video.id}
                  onClick={() => window.open(`/content/videos/${video.slug}`, "_blank")}
                  className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-base line-clamp-2">{video.title}</h3>
                        <span className={`${categoryColor} px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0`}>
                          {categoryLabel}
                        </span>
                      </div>

                      {video.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {video.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(video.publishedAt)}</span>
                        </div>
                        {video.durationMinutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(video.durationMinutes)}</span>
                          </div>
                        )}
                        {video.author && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-20">{video.author}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredVideos.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {videos.length === 0 ? 'Belum ada video' : 'Tidak ada video yang sesuai dengan pencarian'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md mx-auto">
          <Video className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Gagal Memuat Video</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchPublishedVideos()} className="mt-4">Coba Lagi</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {videos.length === 0 && !loading ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🎥</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Belum Ada Video</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Video edukasi kesehatan akan ditampilkan di sini ketika tersedia. Silakan cek kembali nanti.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-50 rounded-lg">
                  <Video className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {filteredVideos.length} Video Tersedia
                  </h3>
                  <p className="text-gray-600">
                    {filteredVideos.length < videos.length
                      ? `Menampilkan ${filteredVideos.length} dari ${videos.length} video`
                      : "Semua video edukasi terkini"}
                  </p>
                </div>
              </div>
              <Controls
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isMounted={isMounted}
                getUniqueCategories={getUniqueCategories}
              />
            </div>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada video ditemukan</h3>
              <p className="text-gray-600">Coba ubah kata kunci pencarian atau filter kategori</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} viewMode={viewMode} />
              ))}
            </div>
          )}

          <EducationalFooter />
        </>
      )}
    </Layout>
  );
}

