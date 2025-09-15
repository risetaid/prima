import { Button } from "@/components/ui/button";
import { FileText, Save, Eye, Trash2 } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import Link from "next/link";

interface ArticleActionsProps {
  formData: {
    slug: string;
    status: string;
  };
  saving: boolean;
  deleting: boolean;
  onDelete: () => void;
}

export function ArticleActions({
  formData,
  saving,
  deleting,
  onDelete,
}: ArticleActionsProps) {
  return (
    <div className="space-y-6">
      {/* Action Buttons Card */}
      <div className="bg-white border rounded-lg p-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 sm:flex-none">
            <BackButton text="Kembali ke CMS" />
            <div className="hidden sm:block h-6 w-px bg-gray-300 flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Edit Artikel
              </h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {formData.status === "published" && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full sm:w-auto sm:flex-none order-4 sm:order-1"
              >
                <Link
                  href={`/content/articles/${formData.slug}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden xs:inline">Lihat</span>
                </Link>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              disabled={saving || deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto sm:flex-none order-3 sm:order-2"
              size="sm"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              <span className="hidden xs:inline">Hapus</span>
              <span className="xs:hidden">Del</span>
            </Button>

            <Button
              form="edit-article-form"
              disabled={saving || !formData.slug.trim()}
              className="w-full sm:w-auto sm:flex-none order-2 sm:order-3"
              size="sm"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              <span className="hidden xs:inline">Simpan</span>
              <span className="xs:hidden">Save</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}