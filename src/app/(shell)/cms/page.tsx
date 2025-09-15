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
  DashboardStatsCardsSkeleton,
  CMSContentListSkeleton,
} from "@/components/ui/dashboard-skeleton";
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

        if (contentResponse.status === 401) {
          toast.error("Tidak memiliki akses ke CMS. Hubungi administrator.");
        } else if (contentResponse.status === 403) {
          toast.error("Akses ditolak. Butuh role ADMIN atau SUPERADMIN.");
        } else if (contentResponse.status === 500) {
          toast.error("Server error. Silakan coba lagi nanti.");
        } else {
          toast.error(
            `HTTP ${contentResponse.status}: ${contentResponse.statusText}`
          );
        }
        return;
      }

      const contentData = await contentResponse.json();
      logger.info("Content data received", {
        success: contentData.success,
        contentCount: contentData.data?.length,
      });

      if (contentData.success) {
        setContent(contentData.data || []);
      } else {
        logger.error("Content API returned error", new Error(contentData.error || "Unknown error"));
        toast.error(contentData.error || "Gagal memuat konten");
      }
    } catch (error) {
      logger.error("Content loading error", error instanceof Error ? error : new Error(String(error)));

      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Koneksi bermasalah. Periksa internet Anda.");
      } else {
        toast.error("Terjadi kesalahan saat memuat konten");
      }
    } finally {
      setContentLoading(false);
      setLoading(false);
    }
  }, [activeTab]);

  // Load statistics only once on mount
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        logger.info("Loading statistics (one-time)");
        setStatsLoading(true);
        const response = await fetch(
          "/api/cms/content?type=all&limit=0&stats_only=true"
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.statistics) {
            setStatistics(data.statistics);
            logger.info("Statistics loaded (one-time)", { statistics: data.statistics });
          }
        }
      } catch (error) {
        logger.error("Statistics loading error", error instanceof Error ? error : new Error(String(error)));
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStatistics();
  }, []); // Empty dependency array - only run once on mount

  // Load content when tab changes
  useEffect(() => {
    if (statistics) {
      // Only fetch content after statistics are loaded
      fetchContent();
    }
  }, [activeTab, statistics, fetchContent]);

  const getStatusColor = (status: string) => {
    switch (status) {
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
        <DashboardStatsCardsSkeleton />

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
            <CMSContentListSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statsLoading ? (
        <DashboardStatsCardsSkeleton />
      ) : statistics ? (
        <CMSStatsCards statistics={statistics} />
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
                  <CMSContentListSkeleton />
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
