import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'minio'

// Initialize MinIO client
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!.replace('https://', '').replace('http://', ''),
  port: 443,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('photo') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (check both MIME and file signature)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file signature (magic bytes) to prevent MIME spoofing
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const signature = buffer.subarray(0, 4).toString('hex')

    const validSignatures = [
      'ffd8ff', // JPEG
      '89504e47', // PNG
      '47494638', // GIF87a/GIF89a
      '52494646', // WebP (RIFF)
    ]

    const isValidImage = validSignatures.some(sig => signature.startsWith(sig))
    if (!isValidImage) {
      return NextResponse.json({ error: 'Invalid image file. File signature does not match image format.' }, { status: 400 })
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Create unique filename with security sanitization
    const timestamp = Date.now()
    // Sanitize filename: remove path traversal, keep only alphanumeric and safe chars
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe chars with underscore
      .replace(/\.+/g, '.') // Replace multiple dots with single dot
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .toLowerCase()

    // Extract and validate file extension
    const ext = sanitizedName.split('.').pop() || ''
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file extension. Only jpg, jpeg, png, gif, webp allowed' }, { status: 400 })
    }

    const filename = `${timestamp}-${sanitizedName}`

    // Ensure bucket exists
    const bucketName = process.env.MINIO_BUCKET_NAME!
    const bucketExists = await minioClient.bucketExists(bucketName)
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1')
    }

    // Upload file to MinIO with retry logic
    let attempts = 0
    const maxAttempts = 3
    let finalFilename = filename

    while (attempts < maxAttempts) {
      try {
        await minioClient.putObject(bucketName, finalFilename, buffer, buffer.length, {
          'Content-Type': file.type || 'application/octet-stream',
        })
        break // Success, exit retry loop
      } catch (error: any) {
        attempts++
        if (error.code === 'NoSuchBucket' && attempts < maxAttempts) {
          // Bucket might have been deleted, recreate it
          await minioClient.makeBucket(bucketName, 'us-east-1')
          continue
        }
        if (attempts >= maxAttempts) {
          throw error
        }
        // Generate new filename for retry
        finalFilename = `${Date.now()}-${sanitizedName}`
      }
    }

    // Generate public URL
    const publicUrl = `${process.env.MINIO_ENDPOINT}/${bucketName}/${finalFilename}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: finalFilename
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}