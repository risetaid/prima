'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'

// TinyMCE type definitions
interface TinyMCEBlobInfo {
  blob(): Blob
  filename(): string
}

interface TinyMCEEditorInstance {
  editorUpload?: {
    blobCache: {
      create(id: string, file: File, base64: string): any
      add(blobInfo: any): void
    }
  }
}

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
  const editorRef = useRef<TinyMCEEditorInstance | null>(null)

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
          
          // Custom image upload handler following TinyMCE official docs
          images_upload_handler: (blobInfo: TinyMCEBlobInfo, progress: (percent: number) => void) => new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.withCredentials = false
            xhr.open('POST', '/api/upload?type=tinymce-image')

            xhr.upload.onprogress = (e) => {
              progress(e.loaded / e.total * 100)
            }

            xhr.onload = () => {
              if (xhr.status === 403) {
                reject({ message: 'HTTP Error: ' + xhr.status, remove: true })
                return
              }

              if (xhr.status < 200 || xhr.status >= 300) {
                reject('HTTP Error: ' + xhr.status)
                return
              }

              const json = JSON.parse(xhr.responseText)

              if (!json || typeof json.location != 'string') {
                reject('Invalid JSON: ' + xhr.responseText)
                return
              }

              resolve(json.location)
            }

            xhr.onerror = () => {
              reject('Image upload failed due to a XHR Transport error. Code: ' + xhr.status)
            }

            const formData = new FormData()
            formData.append('file', blobInfo.blob(), blobInfo.filename())

            xhr.send(formData)
          }),
          
          // Image options
          image_advtab: true,
          image_uploadtab: true,
          automatic_uploads: true,
          images_reuse_filename: true,
          images_upload_base_path: '',
          images_upload_credentials: false,

          // Additional image settings
          image_default_align: 'none',
          image_default_caption: false,
          image_class_list: [
            { title: 'Responsive', value: 'img-responsive' },
            { title: 'Bordered', value: 'img-bordered' },
            { title: 'Rounded', value: 'img-rounded' }
          ],
          
          // File picker for images following TinyMCE best practices
          file_picker_types: 'image',
          file_picker_callback: (callback, _value, meta) => {
            if (meta.filetype === 'image') {
              const input = document.createElement('input')
              input.setAttribute('type', 'file')
              input.setAttribute('accept', 'image/*')

              input.addEventListener('change', (e) => {
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

                const reader = new FileReader()
                reader.addEventListener('load', () => {
                  const id = 'blobid' + (new Date()).getTime()
                  const blobCache = editorRef.current?.editorUpload?.blobCache
                  if (blobCache && reader.result && typeof reader.result === 'string') {
                    const base64 = reader.result.split(',')[1]
                    const blobInfo = blobCache.create(id, file, base64)
                    blobCache.add(blobInfo)

                    // Call the callback with the blob URI and metadata
                    callback(blobInfo.blobUri(), { 
                      title: file.name,
                      alt: file.name.replace(/\.[^/.]+$/, '') // Remove extension for alt text
                    })
                  }
                })
                reader.readAsDataURL(file)
              })

              input.click()
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
                callback(items)
              }
            })
          }
        }}
      />
    </div>
  )
}

