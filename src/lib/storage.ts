import { put, del, list } from '@vercel/blob'

export async function uploadFile(file: File, filename: string) {
  try {
    const blob = await put(filename, file, {
      access: 'public',
    })
    return { success: true, url: blob.url }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Failed to upload file' }
  }
}

export async function deleteFile(url: string) {
  try {
    await del(url)
    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

export async function listFiles() {
  try {
    const { blobs } = await list()
    return { success: true, files: blobs }
  } catch (error) {
    console.error('List error:', error)
    return { success: false, error: 'Failed to list files' }
  }
}