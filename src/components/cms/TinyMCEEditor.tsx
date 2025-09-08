'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'

// Lazy load TinyMCE to reduce initial bundle size
const Editor = dynamic(
  () => import('@tinymce/tinymce-react').then((mod) => ({ default: mod.Editor })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Memuat editor...</div>
      </div>
    )
  }
)

interface TinyMCEEditorProps {
  value: string
  onEditorChange: (content: string) => void
  placeholder?: string
  height?: number
}

export function TinyMCEEditor({ 
  value, 
  onEditorChange, 
  placeholder = "Tulis konten artikel...",
  height = 500 
}: TinyMCEEditorProps) {
  const editorRef = useRef<any>(null)

  const handleEditorChange = (content: string) => {
    try {
      onEditorChange(content)
    } catch (error) {
      console.error('TinyMCE onChange error:', error)
    }
  }

  return (
    <div className="tinymce-wrapper">
      <Editor
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        onInit={(_evt, editor) => {
          editorRef.current = editor
          console.log('TinyMCE initialized successfully')
        }}
        initialValue=""
        value={value}
        onEditorChange={handleEditorChange}
        init={{
          height,
          menubar: false,
          plugins: [
            // Core editing features (stable)
            'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'link', 'lists', 'media', 'searchreplace', 'table', 'visualblocks', 'wordcount',
            // Safe premium features
            'checklist', 'mediaembed', 'casechange', 'formatpainter', 'pageembed', 'advtable', 'advcode',
            // Essential plugins
            'image', 'help', 'fullscreen', 'preview', 'code'
          ],
          toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | checklist numlist bullist indent outdent | emoticons charmap | removeformat | fullscreen preview help',
          
          // Basic configuration for stability
          
          // AI Assistant (disabled for stability)
          // ai_request: (request, respondWith) => 
          //   respondWith.string(() => Promise.reject('AI Assistant belum dikonfigurasi. Hubungi admin untuk mengaktifkan fitur ini.')),
          
          // Image handling - Minio upload configuration
          images_upload_handler: (blobInfo: any, _progress: any) => new Promise<string>((resolve, reject) => {
            try {
              // Validate file size (max 5MB)
              if (blobInfo.blob().size > 5 * 1024 * 1024) {
                reject('Ukuran gambar terlalu besar. Maksimal 5MB.')
                return
              }

              // Validate file type
              const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
              if (!allowedTypes.includes(blobInfo.blob().type)) {
                reject('Format gambar tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.')
                return
              }

              // Create FormData for upload
              const formData = new FormData()
              formData.append('photo', blobInfo.blob(), blobInfo.filename())

                // Upload to Minio via API
                fetch('/api/upload/tinymce-image', {
                  method: 'POST',
                  body: formData,
                })
                 .then(response => {
                   if (!response.ok) {
                     throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                   }
                   return response.json()
                 })
                 .then(data => {
                   console.log('TinyMCE upload response:', data)
                   if (data.success && data.url) {
                     console.log('Image uploaded successfully:', data.url)
                     resolve(data.url)
                   } else {
                     console.error('Upload failed:', data)
                     reject(data.error || 'Upload failed')
                   }
                 })
                 .catch(error => {
                   console.error('Image upload error:', error)
                   reject('Terjadi kesalahan saat mengupload gambar: ' + error.message)
                 })
            } catch (error) {
              console.error('Image upload error:', error)
              reject('Terjadi kesalahan saat mengupload gambar.')
            }
          }),
          
          // Image options
          image_advtab: true,
          image_uploadtab: true,
          automatic_uploads: true,
          images_reuse_filename: true,
          images_upload_base_path: '',
          images_upload_credentials: false,
          image_class_list: [
            { title: 'Responsive', value: 'img-responsive' },
            { title: 'Bordered', value: 'img-bordered' },
            { title: 'Rounded', value: 'img-rounded' }
          ],
          
          // File picker for images (optional)
          file_picker_types: 'image',
          file_picker_callback: (callback, _value, meta) => {
            if (meta.filetype === 'image') {
              try {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp'
                
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement
                  const file = target.files?.[0]
                  
                  if (!file) {
                    return
                  }
                  
                  // Validate file size (max 5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    alert('Ukuran gambar terlalu besar. Maksimal 5MB.')
                    return
                  }
                  
                  // Validate file type
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                  if (!allowedTypes.includes(file.type)) {
                    alert('Format gambar tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.')
                    return
                  }
                  
                  const reader = new FileReader()
                  
                  reader.onload = (event) => {
                    const result = event.target?.result
                    if (result && typeof result === 'string') {
                      callback(result, {
                        alt: file.name.replace(/\\.[^/.]+$/, ''), // Remove extension for alt text
                        title: file.name
                      })
                    }
                  }
                  
                  reader.onerror = () => {
                    alert('Gagal membaca file gambar. Coba lagi.')
                  }
                  
                  reader.readAsDataURL(file)
                }
                
                input.click()
              } catch (error) {
                console.error('File picker error:', error)
                alert('Terjadi kesalahan saat memilih gambar.')
              }
            }
          },
          
          // Content styling
          content_style: `
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              font-size: 16px; 
              line-height: 1.6; 
              color: #374151; 
              max-width: none;
            }
            .img-responsive { max-width: 100%; height: auto; }
            .img-bordered { border: 2px solid #e5e7eb; }
            .img-rounded { border-radius: 0.5rem; }
            blockquote { 
              border-left: 4px solid #3b82f6; 
              padding-left: 1rem; 
              margin-left: 0; 
              color: #6b7280; 
            }
            pre { 
              background: #f9fafb; 
              border: 1px solid #e5e7eb; 
              border-radius: 0.375rem; 
              padding: 1rem; 
            }
          `,
          
          // Indonesian language support
          language: 'id',
          
          // Accessibility
          a11y_advanced_options: true,
          
          // Paste options
          paste_as_text: false,
          paste_auto_cleanup_on_paste: true,
          
          // Spellcheck
          browser_spellcheck: true,
          
          // Table options
          table_responsive_width: true,
          table_default_attributes: {
            'class': 'table table-striped'
          },
          
          // Remove branding
          branding: false,
          
          // Placeholder configuration
          placeholder: placeholder,
          
          // Error handling
          convert_urls: false,
          relative_urls: false,
          remove_script_host: false,

          // Image handling improvements
          image_prepend_url: '',
          image_title: true,
          image_caption: true,
          image_dimensions: false,
          
          // Setup
          setup: (editor) => {
            // Safe initialization
            editor.on('init', () => {
              try {
                if (value && value.trim() !== '') {
                  editor.setContent(value)
                } else {
                  editor.setContent('')
                }
              } catch (error) {
                console.error('TinyMCE init error:', error)
                editor.setContent('')
              }
            })
            
            // Handle editor errors
            editor.on('Error', (e) => {
              console.error('TinyMCE editor error:', e)
            })
            
            // Custom button for inserting patient info templates
            editor.ui.registry.addMenuButton('patienttemplates', {
              text: 'Template Pasien',
              fetch: (callback) => {
                const items = [
                  {
                    type: 'menuitem' as const,
                    text: 'Informasi Dasar Pasien',
                    onAction: () => {
                      editor.insertContent(`
                        <h3>Informasi Pasien</h3>
                        <p><strong>Nama:</strong> {{patient.name}}</p>
                        <p><strong>No. Telepon:</strong> {{patient.phone}}</p>
                        <p><strong>Tanggal:</strong> {{current.date}}</p>
                      `)
                    }
                  },
                  {
                    type: 'menuitem' as const,
                    text: 'Template Edukasi',
                    onAction: () => {
                      editor.insertContent(`
                        <h3>Tips Kesehatan</h3>
                        <ul>
                          <li>Minum obat sesuai jadwal yang ditentukan</li>
                          <li>Konsumsi makanan bergizi seimbang</li>
                          <li>Istirahat yang cukup</li>
                          <li>Olahraga ringan sesuai kemampuan</li>
                        </ul>
                        <p><em>Konsultasikan dengan {{volunteer.name}} jika ada pertanyaan.</em></p>
                      `)
                    }
                  }
                ]
                callback(items as any)
              }
            })
          }
        }}
      />
    </div>
  )
}