"use client";

import { useState, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
  keyExtractor,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    onScroll?.(scrollTop);
  }, [onScroll]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.start * itemHeight;

  if (loading && loadingComponent) {
    return (
      <div 
        className={cn("overflow-hidden", className)}
        style={{ height: containerHeight }}
      >
        {loadingComponent}
      </div>
    );
  }

  if (items.length === 0 && emptyComponent) {
    return (
      <div 
        className={cn("overflow-hidden flex items-center justify-center", className)}
        style={{ height: containerHeight }}
      >
        {emptyComponent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
                className="w-full"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Hook for managing virtual list state
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - 5), // overscan
      end: Math.min(items.length - 1, endIndex + 5),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    scrollTop,
    setScrollTop,
  };
}

// Optimized virtual list for patient data
interface VirtualPatientListProps<T> {
  patients: T[];
  renderPatient: (patient: T, index: number) => React.ReactNode;
  containerHeight?: number;
  itemHeight?: number;
  className?: string;
  loading?: boolean;
  keyExtractor: (patient: T, index: number) => string | number;
}

export function VirtualPatientList<T>({
  patients,
  renderPatient,
  containerHeight = 400,
  itemHeight = 80, // Standard patient card height
  className,
  loading = false,
  keyExtractor,
}: VirtualPatientListProps<T>) {
  const LoadingComponent = () => (
    <div className="space-y-3 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="flex flex-col space-y-1">
              <div className="h-6 bg-gray-300 rounded-full w-16"></div>
              <div className="h-6 bg-gray-300 rounded-full w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyComponent = () => (
    <div className="text-center py-12">
      <p className="text-gray-500">Tidak ada pasien yang sesuai dengan filter</p>
    </div>
  );

  return (
    <VirtualList
      items={patients}
      itemHeight={itemHeight}
      containerHeight={containerHeight}
      renderItem={renderPatient}
      className={className}
      loading={loading}
      loadingComponent={<LoadingComponent />}
      emptyComponent={<EmptyComponent />}
      keyExtractor={keyExtractor}
      overscan={3} // Render 3 extra items above and below viewport
    />
  );
}
