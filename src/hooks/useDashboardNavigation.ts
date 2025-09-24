"use client";

import { useRouter } from "next/navigation";

export function useDashboardNavigation() {
  const router = useRouter();

  const onPengingatClick = () => {
    router.push("/pengingat");
  };

  const onBeritaClick = () => {
    router.push("/berita");
  };

  const onVideoClick = () => {
    router.push("/video-edukasi");
  };

  return {
    onPengingatClick,
    onBeritaClick,
    onVideoClick,
  };
}
