import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

interface ThumbnailUploadProps {
  featuredImageUrl: string;
  onImageChange: (url: string) => void;
}

export function ThumbnailUpload({
  featuredImageUrl,
  onImageChange,
}: ThumbnailUploadProps) {
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simple validation
      if (!file.type.startsWith("image/")) {
        alert("File harus berupa gambar");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("File harus kurang dari 2MB");
        return;
      }

      try {
        // Upload file to get permanent URL
        const formDataUpload = new FormData();
        formDataUpload.append("thumbnail", file);

        const uploadResponse = await fetch(
          "/api/upload?type=article-thumbnail",
          {
            method: "POST",
            body: formDataUpload,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const uploadResult = await uploadResponse.json();

        if (uploadResult.success && uploadResult.url) {
          onImageChange(uploadResult.url);
          toast.success("Gambar berhasil diupload");
        } else {
          throw new Error(uploadResult.error || "Upload failed");
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Gagal mengupload gambar");
      }
    }
  };

  const handleReplaceImage = () => {
    document.getElementById("thumbnail-upload")?.click();
  };

  const handleRemoveImage = () => {
    onImageChange("");
    const input = document.getElementById(
      "thumbnail-upload"
    ) as HTMLInputElement;
    if (input) input.value = "";
  };

  return (
    <div className="space-y-4">
      {/* File upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          id="thumbnail-upload"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {featuredImageUrl ? (
          <div className="space-y-3">
            <Image
              src={featuredImageUrl}
              alt="Thumbnail preview"
              width={128}
              height={128}
              className="mx-auto max-h-32 rounded-lg border"
            />
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReplaceImage}
              >
                Ganti Gambar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
              >
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => document.getElementById("thumbnail-upload")?.click()}
          >
            <div className="w-12 h-12 mx-auto mb-3 text-gray-400">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM11 7a1 1 0 112 0v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H7a1 1 0 110-2h4V7z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-1">
              Klik untuk upload gambar thumbnail
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, WebP - Max 2MB
            </p>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Opsional. Gambar akan tampil sebagai thumbnail di halaman berita
      </p>
    </div>
  );
}