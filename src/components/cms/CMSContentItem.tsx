"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Video, Eye } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

interface CMSContentItemProps {
  item: ContentItem;
  getStatusColor: (status: string) => string;
  getCategoryColor: (category: string) => string;
  formatDate: (dateString: string) => string;
}

export function CMSContentItem({
  item,
  getStatusColor,
  getCategoryColor,
  formatDate,
}: CMSContentItemProps) {
  const thumbnailUrl =
    item.type === "article" ? item.featuredImageUrl : item.thumbnailUrl;

  const isValidThumbnail =
    thumbnailUrl && typeof thumbnailUrl === "string" && thumbnailUrl.trim() !== "";

  return (
    <div className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors relative">
      <div className="flex gap-3 sm:gap-4 pr-24">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          {isValidThumbnail ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={thumbnailUrl}
                alt={item.title}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
              {item.type === "article" ? (
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              ) : (
                <Video className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {item.type === "article" ? (
              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Video className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            <h3 className="text-base sm:text-lg font-medium text-gray-900 line-clamp-2">
              {item.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className={`${getStatusColor(item.status)} text-xs`}>
              {item.status === "published" && "Published"}
              {item.status === "draft" && "Draft"}
              {item.status === "archived" && "Archived"}
            </Badge>
            <Badge
              variant="outline"
              className={`${getCategoryColor(item.category)} text-xs`}
            >
              {item.category}
            </Badge>
          </div>

          <div className="text-xs sm:text-sm text-gray-500 space-y-1">
            <div>Dibuat: {formatDate(item.createdAt)}</div>
            {item.updatedAt !== item.createdAt && (
              <div>Diubah: {formatDate(item.updatedAt)}</div>
            )}
            {item.status === "published" && item.publishedAt && (
              <div>Dipublish: {formatDate(item.publishedAt)}</div>
            )}
            <div>Penulis: {item.authorName}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col gap-2">
        {item.status === "published" && (
          <Button asChild variant="outline" size="sm" className="w-20">
            <Link
              href={`/content/${item.type === "article" ? "articles" : "videos"}/${item.slug}`}
              target="_blank"
              className="flex items-center justify-center"
            >
              <Eye className="h-4 w-4 sm:mr-0 mr-2" />
              <span className="sm:hidden">Lihat</span>
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="w-20">
          <Link
            href={`/dashboard/cms/${item.type === "article" ? "articles" : "videos"}/${item.id}/edit`}
            className="flex items-center justify-center"
          >
            <span>Edit</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}