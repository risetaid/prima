import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'minio'
import { getCurrentUser } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // Initialize MinIO client with error handling
    const minioEndpoint = process.env.MINIO_PUBLIC_ENDPOINT
    const minioUser = process.env.MINIO_ROOT_USER
    const minioPassword = process.env.MINIO_ROOT_PASSWORD

    if (!minioEndpoint || !minioUser || !minioPassword) {
      console.error('Missing MinIO environment variables:', {
        endpoint: !!minioEndpoint,
        user: !!minioUser,
        password: !!minioPassword
      })
      return NextResponse.json({ error: 'MinIO configuration missing' }, { status: 500 })
    }

    const minioClient = new Client({
      endPoint: minioEndpoint.replace('https://', '').replace('http://', ''),
      port: 443,
      useSSL: true,
      accessKey: minioUser,
      secretKey: minioPassword,
    })

    const body = await request.blob()
    const buffer = Buffer.from(await body.arrayBuffer())

    // Ensure bucket exists
    const bucketName = process.env.MINIO_BUCKET_NAME!
    const bucketExists = await minioClient.bucketExists(bucketName)
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1')
    }

    // Upload file to MinIO
    await minioClient.putObject(bucketName, filename, buffer, buffer.length, {
      'Content-Type': body.type || 'application/octet-stream',
    })

    // Generate public URL
    const url = `${process.env.MINIO_PUBLIC_ENDPOINT}/${bucketName}/${filename}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }

    // Initialize MinIO client with error handling
    const minioEndpoint = process.env.MINIO_PUBLIC_ENDPOINT
    const minioUser = process.env.MINIO_ROOT_USER
    const minioPassword = process.env.MINIO_ROOT_PASSWORD

    if (!minioEndpoint || !minioUser || !minioPassword) {
      console.error('Missing MinIO environment variables:', {
        endpoint: !!minioEndpoint,
        user: !!minioUser,
        password: !!minioPassword
      })
      return NextResponse.json({ error: 'MinIO configuration missing' }, { status: 500 })
    }

    const minioClient = new Client({
      endPoint: minioEndpoint.replace('https://', '').replace('http://', ''),
      port: 443,
      useSSL: true,
      accessKey: minioUser,
      secretKey: minioPassword,
    })

    // Delete file from MinIO
    const bucketName = process.env.MINIO_BUCKET_NAME!
    await minioClient.removeObject(bucketName, filename)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    )
  }
}