"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Video, TrendingUp, Clock, Eye, Plus } from "lucide-react";
import Link from "next/link";

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

interface CMSStatsCardsProps {
  statistics: Statistics;
}

export function CMSStatsCards({ statistics }: CMSStatsCardsProps) {
  const stats = [
    {
      title: "Total Konten",
      value: statistics.total.content,
      description: `${statistics.articles.total} artikel, ${statistics.videos.total} video`,
      icon: FileText,
    },
    {
      title: "Terpublish",
      value: statistics.total.published,
      description: "Dapat dilihat publik",
      icon: Eye,
      color: "text-green-600",
    },
    {
      title: "Draft",
      value: statistics.total.draft,
      description: "Belum dipublikasikan",
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Artikel",
      value: statistics.articles.total,
      description: `${statistics.articles.published} published`,
      icon: TrendingUp,
    },
    {
      title: "Video",
      value: statistics.videos.total,
      description: `${statistics.videos.published} published`,
      icon: Video,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {stats.map((stat) => (
        <Card key={stat.title} className="h-auto">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">{stat.title}</CardTitle>
            <stat.icon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className={`text-3xl font-bold ${stat.color || ""}`}>
              {stat.value}
            </div>
            <p className="text-sm text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}

      {/* Action Buttons Card */}
      <Card className="h-auto flex flex-col justify-center">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col gap-4">
            <Button asChild className="w-full h-12">
              <Link
                href="/cms/articles/create"
                className="flex items-center justify-center text-base"
              >
                <Plus className="h-5 w-5 mr-2" />
                Artikel Baru
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-12">
              <Link
                href="/cms/videos/create"
                className="flex items-center justify-center text-base"
              >
                <Video className="h-5 w-5 mr-2" />
                Video Baru
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}