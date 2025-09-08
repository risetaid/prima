"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  text?: string;
  variant?: "default" | "simple";
}

export function BackButton({
  className,
  text = "Kembali",
  variant = "default",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  if (variant === "simple") {
    return (
      <button
        onClick={handleBack}
        className={cn(
          "cursor-pointer flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors",
          className
        )}
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-medium">{text}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleBack}
      className={cn(
        "cursor-pointer flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors",
        className
      )}
    >
      <ArrowLeft className="h-5 w-5" />
      <span className="font-medium">{text}</span>
    </button>
  );
}
