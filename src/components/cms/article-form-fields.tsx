import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";

const QuillEditor = dynamic(
  () =>
    import("@/components/cms/QuillEditor").then((mod) => ({
      default: mod.QuillEditor,
    })),
  {
    loading: () => (
      <div className="h-64 bg-gray-100 rounded animate-pulse flex items-center justify-center">
        Loading editor...
      </div>
    ),
  }
);

interface ArticleFormFieldsProps {
  formData: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
  };
  onChange: (field: string, value: string) => void;
}

export function ArticleFormFields({
  formData,
  onChange,
}: ArticleFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Judul Artikel *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Masukkan judul artikel..."
        />
      </div>

      <div>
        <Label htmlFor="slug">Slug URL *</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => onChange("slug", e.target.value)}
          placeholder="slug-artikel"
        />
        <p className="text-sm text-gray-500 mt-1">
          URL artikel: /content/articles/
          {formData.slug || "slug-artikel"}
        </p>
      </div>

      <div>
        <Label htmlFor="excerpt">Ringkasan</Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) => onChange("excerpt", e.target.value)}
          placeholder="Ringkasan singkat artikel (opsional)..."
          rows={3}
          className="mt-2"
        />
        <p className="text-sm text-gray-500 mt-1">
          Ringkasan akan tampil dalam daftar artikel dan preview
        </p>
      </div>

      {/* Content */}
      <div>
        <Label htmlFor="content">Konten Artikel *</Label>
        <div className="mt-2">
          <QuillEditor
            value={formData.content}
            onEditorChange={(content: string) => onChange("content", content)}
            placeholder="Edit konten artikel lengkap di sini..."
          />
        </div>
      </div>
    </div>
  );
}
