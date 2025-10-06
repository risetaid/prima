import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavigationItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
}

interface NavigationCardProps {
  items: NavigationItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
}

export function NavigationCard({
  items,
  activeItem,
  onItemClick,
}: NavigationCardProps) {
  return (
    <Card className="lg:hidden mb-6 shadow-lg">
      <CardContent className="p-0">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            className={cn(
              "w-full px-6 py-4 flex items-center justify-between",
              "hover:bg-gray-50 active:bg-gray-100 transition-colors",
              "border-b last:border-b-0",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
              activeItem === item.id &&
                "bg-blue-50 border-l-4 border-l-blue-600 font-medium"
            )}
            aria-current={activeItem === item.id ? "page" : undefined}
            role="tab"
            aria-selected={activeItem === item.id}
          >
            <div className="flex items-center gap-3 flex-1 text-left min-w-0">
              <div
                className={cn(
                  "text-2xl flex-shrink-0 transition-colors",
                  activeItem === item.id ? "text-blue-600" : "text-gray-400"
                )}
                aria-hidden="true"
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "font-medium transition-colors truncate",
                    activeItem === item.id ? "text-blue-600" : "text-gray-900"
                  )}
                >
                  {item.label}
                </div>
                {item.description && (
                  <div className="text-sm text-gray-500 truncate">
                    {item.description}
                  </div>
                )}
              </div>
            </div>
            <ChevronRight
              className={cn(
                "w-5 h-5 flex-shrink-0 transition-colors",
                activeItem === item.id ? "text-blue-600" : "text-gray-400"
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
