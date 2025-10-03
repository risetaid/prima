"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// Import Quill and CSS
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { logger } from '@/lib/logger';

interface QuillEditorProps {
  value: string;
  onEditorChange: (content: string) => void;
  placeholder?: string;
  height?: number;
}

export function QuillEditor({
  value,
  onEditorChange,
  placeholder = "Tulis konten artikel...",
  height = 500,
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isUpdatingRef = useRef(false);
  const onEditorChangeRef = useRef(onEditorChange);
  const timeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);

  // Update the ref whenever onEditorChange changes
  useEffect(() => {
    onEditorChangeRef.current = onEditorChange;
  }, [onEditorChange]);

  useLayoutEffect(() => {
    if (editorRef.current && !quillRef.current && !isMountedRef.current) {
      timeoutRef.current = window.setTimeout(() => {
        if (editorRef.current && !quillRef.current && !isMountedRef.current) {
          logger.info("[QuillEditor] Initializing editor");

          // Clear any existing content to prevent double initialization
          if (editorRef.current) {
            editorRef.current.innerHTML = "";
          }

          // Quill options
          const quillOptions = {
            theme: "snow",
            placeholder,
            modules: {
              toolbar: [
                [{ header: [1, 2, 3, 4, 5, 6, false] }],
                [{ font: [] }],
                [{ size: [] }],
                ["bold", "italic", "underline", "strike"],
                [{ color: [] }, { background: [] }],
                [{ script: "sub" }, { script: "super" }],
                [{ list: "ordered" }, { list: "bullet" }],
                [{ indent: "-1" }, { indent: "+1" }],
                [{ align: [] }],
                ["blockquote", "code-block"],
                ["link", "image", "video"],
                ["clean"],
              ],
            },
          };

          // Initialize Quill editor
          const quill = new Quill(editorRef.current, quillOptions);
          quillRef.current = quill;
          isMountedRef.current = true;

          // Set initial content if provided
          if (value && quill.root.innerHTML !== value) {
            quill.clipboard.dangerouslyPasteHTML(value);
          }

          // Add custom image handler
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolbar = quill.getModule("toolbar") as any;
          toolbar.addHandler("image", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const formData = new FormData();
                formData.append("image", file);
                try {
                  const response = await fetch(
                    "/api/upload?type=article-image",
                    {
                      method: "POST",
                      body: formData,
                    }
                  );
                  const result = await response.json();
                  if (result.success && result.url) {
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, "image", result.url);
                  } else {
                    alert("Upload failed");
                  }
                } catch {
                  alert("Upload error");
                }
              }
            };
            input.click();
          });

          // Listen for text changes
          const handleChange = () => {
            if (!isUpdatingRef.current) {
              const html = quill.root.innerHTML;
              onEditorChangeRef.current(html);
            }
          };
          quill.on("text-change", handleChange);
        }
      }, 0);
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      if (quillRef.current) {
        quillRef.current.off("text-change");
        quillRef.current = null;
        isMountedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder]); // Intentionally exclude 'value' - it's only used for initial content. Subsequent value changes are handled by separate useEffect below

  // Update content when value prop changes
  useEffect(() => {
    if (quillRef.current && value !== undefined) {
      const currentContent = quillRef.current.root.innerHTML;

      // Only update if content is actually different to prevent infinite loops
      if (currentContent !== value) {
        isUpdatingRef.current = true;

        // Use dangerouslyPasteHTML for proper React integration
        // This preserves cursor position and doesn't interfere with React's virtual DOM
        quillRef.current.clipboard.dangerouslyPasteHTML(value);

        // Reset the flag after a short delay to allow the change event to fire
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, [value]);

  return (
    <div className="quill-editor-container">
      <div
        ref={editorRef}
        style={{ height: `${height}px` }}
        className="border rounded-lg"
      />
    </div>
  );
}
