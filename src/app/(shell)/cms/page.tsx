"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DashboardStatsSkeleton,
  ArticleCardSkeleton,
} from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/auth/role-guard";
import { CMSStatsCards } from "@/components/cms/CMSStatsCards";
import { CMSContentItem } from "@/components/cms/CMSContentItem";
import { logger } from "@/lib/logger";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  type: "article" | "video";
  thumbnailUrl: string | null;
  featuredImageUrl: string | null;
  authorName: string;
}

interface Statistics {
  articles: {
    total: number;
    published: number;
    draft: number;
  };
  videos: {
    total: number;
    published: number;
    draft: number;
  };
  total: {
    content: number;
    published: number;
    draft: number;
  };
}

function CMSPageContent() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // Progressive loading: Statistics first, then content
  const fetchContent = useCallback(async () => {
    try {
      logger.info("Starting content fetch", { activeTab });

      // Only fetch content, not statistics (statistics should remain static)
      setContentLoading(true);
      const contentResponse = await fetch(`/api/cms/content?type=${activeTab}`);
      logger.info("Content response received", { status: contentResponse.status });

        if (!contentResponse.ok) {
          logger.error("Content API request failed", new Error(`HTTP ${contentResponse.status}: ${contentResponse.statusText}`), { status: contentResponse.status });

          let errorMessage = `Gagal memuat konten: HTTP ${contentResponse.status}`;

          if (contentResponse.status === 401) {
            errorMessage = "Tidak memiliki akses ke CMS. Hubungi administrator.";
          } else if (contentResponse.status === 403) {
            errorMessage = "Akses ditolak. Butuh role ADMIN atau DEVELOPER.";
          } else if (contentResponse.status === 500) {
            errorMessage = "Server error. Silakan coba lagi nanti.";
          }

          toast.error(errorMessage);
          setError(errorMessage);
          return;
        }

      const contentData = await contentResponse.json();

      // Debug: Log the response structure
      logger.info('🔍 CMS API Response (Admin):', {
        success: contentData.success,
        hasData: !!contentData.data,
        dataType: Array.isArray(contentData.data) ? 'array' : typeof contentData.data,
        dataLength: Array.isArray(contentData.data) ? contentData.data.length : 'N/A',
        dataKeys: !Array.isArray(contentData.data) && typeof contentData.data === 'object' ? Object.keys(contentData.data) : 'N/A'
      });

      if (contentData.success) {
        // Check if contentData.data is an array, if not, try to find the array in the response
        let contentArray = contentData.data

        if (!Array.isArray(contentArray)) {
          logger.warn('⚠️ contentData.data is not an array, searching for content array...', contentArray)
          // Try common property names that might contain the content
          if (contentArray.data && Array.isArray(contentArray.data)) {
            contentArray = contentArray.data
          } else if (contentArray.content && Array.isArray(contentArray.content)) {
            contentArray = contentArray.content
          } else if (contentArray.articles && Array.isArray(contentArray.articles)) {
            contentArray = contentArray.articles
          } else if (contentArray.videos && Array.isArray(contentArray.videos)) {
            contentArray = contentArray.videos
          } else {
            logger.error('❌ Could not find content array in response', contentArray)
            toast.error('Invalid response format: content array not found')
            setContent([])
            return
          }
        }

        setContent(contentArray);
        logger.info("Content loaded successfully", { count: contentArray.length });
      } else {
        logger.error("Content API returned error", new Error(contentData.error || "Unknown error"));
        toast.error(contentData.error || "Gagal memuat konten");
      }
    } catch (error) {
      logger.error("Content loading error", error instanceof Error ? error : new Error(String(error)));

      let errorMessage = "Terjadi kesalahan saat memuat konten";

      if (error instanceof TypeError && error.message.includes("fetch")) {
        errorMessage = "Koneksi bermasalah. Periksa internet Anda.";
      }

      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setContentLoading(false);
      setLoading(false);
    }
  }, [activeTab]);

  // Load statistics only once on mount - simplified to avoid API issues
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        logger.info("Loading statistics (one-time)");
        setStatsLoading(true);

        // Try to fetch a small amount of content to get basic stats
        const response = await fetch(
          "/api/cms/content?type=all&limit=5"
        );

        if (response.ok) {
          const data = await response.json();

          // Debug: Log the response structure
          logger.info('🔍 CMS Statistics Response:', {
            success: data.success,
            hasData: !!data.data,
            hasStatistics: !!data.statistics,
            dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
            dataLength: Array.isArray(data.data) ? data.data.length : 'N/A'
          });

          if (data.success && data.statistics) {
            setStatistics(data.statistics);
            logger.info("Statistics loaded (one-time)", { statistics: data.statistics });
          } else if (data.success && data.data && data.data.statistics) {
            // Handle nested response format: data.data.statistics
            setStatistics(data.data.statistics);
            logger.info("✅ Statistics loaded from nested response", { statistics: data.data.statistics });
          } else if (data.success && Array.isArray(data.data)) {
            // Calculate basic stats from the content data
            logger.info('🔍 Processing CMS content data:', {
              totalItems: data.data.length,
              sampleItems: data.data.slice(0, 2).map((item: any) => ({
                id: item.id,
                title: item.title,
                type: item.type,
                status: item.status
              }))
            });

            const articles = data.data.filter((item: any) => item.type === 'article');
            const videos = data.data.filter((item: any) => item.type === 'video');
          } else if (data.success && data.data && Array.isArray(data.data.data)) {
            // Handle nested response format: data.data.data
            const contentArray = data.data.data;
            logger.info('🔍 Processing nested CMS content data:', {
              totalItems: contentArray.length,
              sampleItems: contentArray.slice(0, 2).map((item: any) => ({
                id: item.id,
                title: item.title,
                type: item.type,
                status: item.status
              }))
            });

            const articles = contentArray.filter((item: any) => item.type === 'article');
            const videos = contentArray.filter((item: any) => item.type === 'video');

            logger.info('📊 Content breakdown:', {
              articles: articles.length,
              videos: videos.length,
              articleStatuses: articles.map((a: any) => a.status),
              videoStatuses: videos.map((v: any) => v.status)
            });

            const basicStats = {
              articles: {
                total: articles.length,
                published: articles.filter((a: any) => a.status === 'published' || a.status === 'PUBLISHED').length,
                draft: articles.filter((a: any) => a.status === 'draft' || a.status === 'DRAFT').length,
              },
              videos: {
                total: videos.length,
                published: videos.filter((v: any) => v.status === 'published' || v.status === 'PUBLISHED').length,
                draft: videos.filter((v: any) => v.status === 'draft' || v.status === 'DRAFT').length,
              },
              total: {
                content: contentArray.length,
                published: contentArray.filter((item: any) => item.status === 'published' || item.status === 'PUBLISHED').length,
                draft: contentArray.filter((item: any) => item.status === 'draft' || item.status === 'DRAFT').length,
              }
            };

            setStatistics(basicStats);
            logger.info("✅ Basic statistics calculated from content", {
              stats: basicStats,
              calculatedFrom: data.data.length + ' items'
            });
          } else {
            // Fallback: set empty statistics so content can load
            logger.warn("Statistics API returned unexpected data, using fallback", { data });
            setStatistics({
              articles: { total: 0, published: 0, draft: 0 },
              videos: { total: 0, published: 0, draft: 0 },
              total: { content: 0, published: 0, draft: 0 }
            });
          }
        } else {
          // Handle HTTP errors - statistics are not critical, so don't show error toasts
          logger.warn(`Statistics API returned ${response.status}, using empty statistics (non-critical)`);

          // Fallback: set empty statistics so content can still load
          setStatistics({
            articles: { total: 0, published: 0, draft: 0 },
            videos: { total: 0, published: 0, draft: 0 },
            total: { content: 0, published: 0, draft: 0 }
          });
        }
      } catch (error) {
        logger.error("Statistics loading error", error instanceof Error ? error : new Error(String(error)));
        // Set fallback statistics on error
        setStatistics({
          articles: { total: 0, published: 0, draft: 0 },
          videos: { total: 0, published: 0, draft: 0 },
          total: { content: 0, published: 0, draft: 0 }
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStatistics();
  }, []); // Empty dependency array - only run once on mount

  // Load content when tab changes or when statistics become available (including empty fallback)
  useEffect(() => {
    if (statistics !== null) {
      fetchContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statistics]); // Note: fetchContent omitted to prevent infinite loops

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: "bg-blue-100 text-blue-800 border-blue-200",
      nutrisi: "bg-green-100 text-green-800 border-green-200",
      olahraga: "bg-purple-100 text-purple-800 border-purple-200",
      motivational: "bg-orange-100 text-orange-800 border-orange-200",
      medical: "bg-red-100 text-red-800 border-red-200",
      faq: "bg-indigo-100 text-indigo-800 border-indigo-200",
      testimoni: "bg-pink-100 text-pink-800 border-pink-200",
    };
    return (
      colors[category as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Gagal Memuat Halaman CMS
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {error}
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>
              Refresh Halaman
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setStatistics(null);
                setContent([]);
                setLoading(true);
                setStatsLoading(true);
                setContentLoading(true);
                // Re-trigger data loading
                window.location.reload();
              }}
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show progressive loading states
  if (loading && statsLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <DashboardStatsSkeleton />

        {/* Content Tabs Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="grid w-full grid-cols-3 h-10 bg-gray-100 rounded">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 mx-1 my-1 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statsLoading ? (
        <DashboardStatsSkeleton />
      ) : statistics ? (
        (() => {
          logger.info('🎯 Rendering CMSStatsCards with statistics:', statistics as any);
          return <CMSStatsCards statistics={statistics} />;
        })()
      ) : null}

      {/* Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Konten Terbaru</CardTitle>
          <CardDescription>
            Kelola dan review konten yang telah dibuat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              logger.info("Tab changed", { from: activeTab, to: value });
              if (value !== activeTab) {
                setActiveTab(value);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm py-2">
                Semua
              </TabsTrigger>
              <TabsTrigger value="articles" className="text-xs sm:text-sm py-2">
                Artikel
              </TabsTrigger>
              <TabsTrigger value="videos" className="text-xs sm:text-sm py-2">
                Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {contentLoading ? (
                <div className="py-6">
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <ArticleCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : content.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Belum ada konten
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Mulai dengan membuat artikel atau video edukasi pertama
                    Anda.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <Button asChild>
                      <Link href="/cms/articles/create">
                        Buat Artikel
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/cms/videos/create">
                        Tambah Video
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                 <div className="space-y-4">
                   {content.map((item) => (
                     <CMSContentItem
                       key={item.id}
                       item={item}
                       getStatusColor={getStatusColor}
                       getCategoryColor={getCategoryColor}
                       formatDate={formatDate}
                     />
                   ))}
                 </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CMSPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN", "DEVELOPER"]}>
      <CMSPageContent />
    </RoleGuard>
  );
}
