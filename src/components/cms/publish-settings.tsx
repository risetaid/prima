import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ARTICLE_CATEGORIES, ArticleStatus } from "@/lib/constants/articles";

interface PublishSettingsProps {
  formData: {
    status: ArticleStatus;
    category: string;
  };
  onChange: (field: string, value: string) => void;
}

export function PublishSettings({ formData, onChange }: PublishSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => onChange("status", value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Pilih status..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="category">Kategori *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => onChange("category", value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Pilih kategori..." />
          </SelectTrigger>
          <SelectContent>
            {ARTICLE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}