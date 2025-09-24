"use client";

import Image from "next/image";
import { useState, memo } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  fallbackSrc?: string;
  loading?: "lazy" | "eager";
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes,
  fallbackSrc = "/icon-192x192.png", // Default fallback to app icon
  loading = "lazy",
  quality = 75,
  placeholder = "empty",
  blurDataURL,
  onError,
  onLoad,
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false); // Reset error state for fallback
    } else {
      setHasError(true);
    }
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || (fill 
    ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    : undefined);

  if (hasError && imgSrc === fallbackSrc) {
    // Show placeholder div if even fallback fails
    return (
      <div 
        className={cn(
          "bg-gray-200 flex items-center justify-center text-gray-400 text-sm",
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        {alt || "Image"}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div 
          className={cn(
            "absolute inset-0 bg-gray-200 animate-pulse rounded",
            fill ? "w-full h-full" : ""
          )}
          style={fill ? undefined : { width, height }}
        />
      )}
      <Image
        src={imgSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={responsiveSizes}
        priority={priority}
        loading={loading}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onError={handleError}
        onLoad={handleLoad}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          fill ? "object-cover" : "",
          className
        )}
      />
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

export { OptimizedImage };

// Pre-configured variants for common use cases
export const ProfileImage = memo<Omit<OptimizedImageProps, "className" | "width" | "height"> & { size?: number }>(({
  size = 48,
  ...props
}) => (
  <OptimizedImage
    {...props}
    width={size}
    height={size}
    className="rounded-full object-cover"
    quality={80}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
  />
));

ProfileImage.displayName = "ProfileImage";

export const ThumbnailImage = memo<Omit<OptimizedImageProps, "className"> & { aspectRatio?: "square" | "video" | "wide" }>(({
  aspectRatio = "square",
  ...props
}) => {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video", 
    wide: "aspect-[16/9]"
  };

  return (
    <OptimizedImage
      {...props}
      fill
      className={cn("rounded-lg object-cover", aspectClasses[aspectRatio])}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
    />
  );
});

ThumbnailImage.displayName = "ThumbnailImage";

export const HeroImage = memo<Omit<OptimizedImageProps, "priority" | "loading">>(({
  ...props
}) => (
  <OptimizedImage
    {...props}
    priority={true}
    loading="eager"
    quality={85}
    sizes="100vw"
  />
));

HeroImage.displayName = "HeroImage";
