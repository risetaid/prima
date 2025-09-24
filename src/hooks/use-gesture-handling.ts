import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { logger } from '@/lib/logger';

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

interface PinchGesture {
  scale: number;
  center: TouchPoint;
}

interface GestureHandlers {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
  onPan?: (delta: { x: number; y: number }, point: TouchPoint) => void;
}

interface GestureOptions {
  swipeThreshold?: number;
  pinchThreshold?: number;
  tapThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
  preventScrollOnSwipe?: boolean;
  preventZoomOnPinch?: boolean;
}

const defaultOptions: Required<GestureOptions> = {
  swipeThreshold: 50,
  pinchThreshold: 0.1,
  tapThreshold: 10,
  doubleTapDelay: 300,
  longPressDelay: 500,
  preventScrollOnSwipe: true,
  preventZoomOnPinch: true,
};

export function useGestureHandling(
  elementRef: React.RefObject<HTMLElement>,
  handlers: GestureHandlers = {},
  options: GestureOptions = {}
) {
  const opts = useMemo(() => ({ ...defaultOptions, ...options }), [options]);
  const [isGestureActive, setIsGestureActive] = useState(false);
  
  // Gesture state
  const gestureState = useRef({
    startPoints: [] as TouchPoint[],
    lastPoints: [] as TouchPoint[],
    startTime: 0,
    tapCount: 0,
    lastTapTime: 0,
    longPressTimer: null as NodeJS.Timeout | null,
    initialDistance: 0,
    initialScale: 1,
  });

  // Helper functions
  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((p1: TouchPoint, p2: TouchPoint): TouchPoint => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      timestamp: Math.max(p1.timestamp, p2.timestamp),
    };
  }, []);

  const getTouchPoints = useCallback((touches: TouchList): TouchPoint[] => {
    return Array.from(touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }));
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer);
      gestureState.current.longPressTimer = null;
    }
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const points = getTouchPoints(e.touches);
    gestureState.current.startPoints = points;
    gestureState.current.lastPoints = points;
    gestureState.current.startTime = Date.now();
    
    setIsGestureActive(true);

    // Handle single touch
    if (points.length === 1) {
      const point = points[0];
      
      // Setup long press detection
      gestureState.current.longPressTimer = setTimeout(() => {
        if (handlers.onLongPress) {
          handlers.onLongPress(point);
          logger.debug('Long press detected', { point });
        }
      }, opts.longPressDelay);

      // Handle potential double tap
      const now = Date.now();
      const timeSinceLastTap = now - gestureState.current.lastTapTime;
      
      if (timeSinceLastTap < opts.doubleTapDelay) {
        gestureState.current.tapCount++;
      } else {
        gestureState.current.tapCount = 1;
      }
    }

    // Handle pinch start
    if (points.length === 2) {
      gestureState.current.initialDistance = getDistance(points[0], points[1]);
      gestureState.current.initialScale = 1;
      
      if (opts.preventZoomOnPinch) {
        e.preventDefault();
      }
    }
  }, [handlers, opts, getTouchPoints, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const points = getTouchPoints(e.touches);
    const startPoints = gestureState.current.startPoints;
    
    if (startPoints.length === 0) return;

    // Clear long press timer on movement
    clearLongPressTimer();

    // Handle single touch pan/swipe
    if (points.length === 1 && startPoints.length === 1) {
      const currentPoint = points[0];
      const startPoint = startPoints[0];
      const lastPoint = gestureState.current.lastPoints[0];
      
      const deltaX = currentPoint.x - startPoint.x;
      const deltaY = currentPoint.y - startPoint.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Handle pan
      if (handlers.onPan && lastPoint) {
        const panDelta = {
          x: currentPoint.x - lastPoint.x,
          y: currentPoint.y - lastPoint.y,
        };
        handlers.onPan(panDelta, currentPoint);
      }

      // Prevent scroll if we're potentially swiping
      if (opts.preventScrollOnSwipe && distance > opts.tapThreshold) {
        e.preventDefault();
      }
    }

    // Handle pinch
    if (points.length === 2 && startPoints.length === 2) {
      const currentDistance = getDistance(points[0], points[1]);
      const scale = currentDistance / gestureState.current.initialDistance;
      const center = getCenter(points[0], points[1]);
      
      if (Math.abs(scale - gestureState.current.initialScale) > opts.pinchThreshold) {
        if (handlers.onPinch) {
          handlers.onPinch({ scale, center });
          logger.debug('Pinch detected', { scale, center });
        }
        gestureState.current.initialScale = scale;
      }

      if (opts.preventZoomOnPinch) {
        e.preventDefault();
      }
    }

    gestureState.current.lastPoints = points;
  }, [handlers, opts, getTouchPoints, getDistance, getCenter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const endTime = Date.now();
    const duration = endTime - gestureState.current.startTime;
    const startPoints = gestureState.current.startPoints;
    
    clearLongPressTimer();
    setIsGestureActive(false);

    // Handle single touch end
    if (startPoints.length === 1 && e.changedTouches.length === 1) {
      const startPoint = startPoints[0];
      const endTouch = e.changedTouches[0];
      const endPoint: TouchPoint = {
        x: endTouch.clientX,
        y: endTouch.clientY,
        timestamp: endTime,
      };

      const deltaX = endPoint.x - startPoint.x;
      const deltaY = endPoint.y - startPoint.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Handle tap
      if (distance < opts.tapThreshold) {
        gestureState.current.lastTapTime = endTime;
        
        // Check for double tap
        if (gestureState.current.tapCount >= 2 && handlers.onDoubleTap) {
          handlers.onDoubleTap(endPoint);
          logger.debug('Double tap detected', { point: endPoint });
          gestureState.current.tapCount = 0;
        } else if (handlers.onTap) {
          // Delay single tap to check for double tap
          setTimeout(() => {
            if (gestureState.current.tapCount === 1) {
              handlers.onTap!(endPoint);
              logger.debug('Single tap detected', { point: endPoint });
            }
            gestureState.current.tapCount = 0;
          }, opts.doubleTapDelay);
        }
      }
      // Handle swipe
      else if (distance > opts.swipeThreshold && handlers.onSwipe) {
        const velocity = distance / duration;
        let direction: SwipeGesture['direction'];

        // Determine swipe direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left';
        } else {
          direction = deltaY > 0 ? 'down' : 'up';
        }

        const swipeGesture: SwipeGesture = {
          direction,
          distance,
          velocity,
          duration,
        };

        handlers.onSwipe(swipeGesture);
        logger.debug('Swipe detected', { 
          direction: swipeGesture.direction,
          distance: swipeGesture.distance,
          velocity: swipeGesture.velocity,
          duration: swipeGesture.duration
        });
      }
    }

    // Reset gesture state
    gestureState.current.startPoints = [];
    gestureState.current.lastPoints = [];
  }, [handlers, opts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setup event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isGestureActive,
  };
}

// Hook for swipe navigation
export function useSwipeNavigation(
  elementRef: React.RefObject<HTMLElement>,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  options?: GestureOptions
) {
  return useGestureHandling(
    elementRef,
    {
      onSwipe: (gesture) => {
        if (gesture.direction === 'left' && onSwipeLeft) {
          onSwipeLeft();
        } else if (gesture.direction === 'right' && onSwipeRight) {
          onSwipeRight();
        }
      },
    },
    options
  );
}

// Hook for pull-to-refresh
export function usePullToRefresh(
  elementRef: React.RefObject<HTMLElement>,
  onRefresh: () => void | Promise<void>,
  threshold: number = 100
) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pullState = useRef({
    startY: 0,
    currentY: 0,
    isPullStarted: false,
  });

  useGestureHandling(
    elementRef,
    {
      onPan: (delta, point) => {
        const element = elementRef.current;
        if (!element || element.scrollTop > 0) return;

        if (!pullState.current.isPullStarted && delta.y > 0) {
          pullState.current.isPullStarted = true;
          pullState.current.startY = point.y;
          setIsPulling(true);
        }

        if (pullState.current.isPullStarted) {
          const distance = Math.max(0, point.y - pullState.current.startY);
          setPullDistance(distance);

          if (distance > threshold && !isRefreshing) {
            // Trigger refresh
            setIsRefreshing(true);
            Promise.resolve(onRefresh()).finally(() => {
              setIsRefreshing(false);
              setIsPulling(false);
              setPullDistance(0);
              pullState.current.isPullStarted = false;
            });
          }
        }
      },
    },
    {
      preventScrollOnSwipe: false,
    }
  );

  // Reset pull state on touch end
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchEnd = () => {
      if (pullState.current.isPullStarted && pullDistance < threshold) {
        setIsPulling(false);
        setPullDistance(0);
        pullState.current.isPullStarted = false;
      }
    };

    element.addEventListener('touchend', handleTouchEnd);
    return () => element.removeEventListener('touchend', handleTouchEnd);
  }, [elementRef, pullDistance, threshold]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}

// Hook for pinch-to-zoom
export function usePinchToZoom(
  elementRef: React.RefObject<HTMLElement>,
  initialScale: number = 1,
  minScale: number = 0.5,
  maxScale: number = 3
) {
  const [scale, setScale] = useState(initialScale);
  const [isZooming, setIsZooming] = useState(false);

  useGestureHandling(
    elementRef,
    {
      onPinch: (gesture) => {
        setIsZooming(true);
        const newScale = Math.min(maxScale, Math.max(minScale, gesture.scale));
        setScale(newScale);
      },
    },
    {
      preventZoomOnPinch: true,
    }
  );

  // Reset zooming state
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchEnd = () => {
      setIsZooming(false);
    };

    element.addEventListener('touchend', handleTouchEnd);
    return () => element.removeEventListener('touchend', handleTouchEnd);
  }, [elementRef]);

  const resetZoom = useCallback(() => {
    setScale(initialScale);
  }, [initialScale]);

  return {
    scale,
    isZooming,
    resetZoom,
  };
}

// Hook for drag and drop on mobile
export function useMobileDragDrop<T>(
  elementRef: React.RefObject<HTMLElement>,
  data: T,
  onDrop?: (data: T, target: HTMLElement) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  useGestureHandling(
    elementRef,
    {
      onPan: (delta, point) => {
        if (isDragging) {
          setDragPosition({ x: point.x, y: point.y });
        }
      },
      onLongPress: (point) => {
        setIsDragging(true);
        setDragPosition({ x: point.x, y: point.y });
        logger.debug('Mobile drag started', { point });
      },
    }
  );

  // Handle drop
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDragging) {
        const touch = e.changedTouches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (elementBelow && onDrop) {
          onDrop(data, elementBelow as HTMLElement);
        }
        
        setIsDragging(false);
        setDragPosition({ x: 0, y: 0 });
        logger.debug('Mobile drag ended', { elementBelow: elementBelow?.tagName });
      }
    };

    element.addEventListener('touchend', handleTouchEnd);
    return () => element.removeEventListener('touchend', handleTouchEnd);
  }, [elementRef, isDragging, data, onDrop]);

  return {
    isDragging,
    dragPosition,
  };
}
