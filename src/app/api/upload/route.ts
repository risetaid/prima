import { NextRequest, NextResponse } from "next/server";
import { Client } from "minio";
import { getCurrentUser } from "@/lib/auth-utils";

interface MinIOError {
  message: string;
  code?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "general";
    const filename = searchParams.get("filename");

    // Authentication check for general uploads
    if (type === "general") {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!filename) {
        return NextResponse.json(
          { error: "Filename required" },
          { status: 400 }
        );
      }
    }

    // Initialize MinIO client
    const minioEndpoint = process.env.MINIO_PUBLIC_ENDPOINT;
    const minioAccessKey =
      process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER;
    const minioSecretKey =
      process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

    if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
      console.error("Missing MinIO environment variables:", {
        endpoint: !!minioEndpoint,
        accessKey: !!minioAccessKey,
        secretKey: !!minioSecretKey,
      });
      return NextResponse.json(
        { error: "MinIO configuration missing" },
        { status: 500 }
      );
    }

    const minioClient = new Client({
      endPoint: minioEndpoint
        .replace("https://", "")
        .replace("http://", "")
        .replace(":443", ""),
      port: 443,
      useSSL: true,
      accessKey: minioAccessKey,
      secretKey: minioSecretKey,
    });

    let buffer: Buffer;
    let contentType: string;
    let finalFilename: string;
    let corsHeaders = {};

    // Handle different upload types
    if (type === "general") {
      // Original blob-based upload
      const body = await request.blob();
      buffer = Buffer.from(await body.arrayBuffer());
      contentType = body.type || "application/octet-stream";
      finalFilename = filename!;
    } else {
      // FormData-based uploads (tinymce-image, patient-photo, article-thumbnail)
      const data = await request.formData();
      let file: File | null = null;
      let sizeLimit = 5 * 1024 * 1024; // 5MB default
      let folder = "";

      // Determine file field and settings based on type
      switch (type) {
        case "quill-image":
          file = data.get("file") as File;
          corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          };
          break;
        case "patient-photo":
          file = data.get("photo") as File;
          break;
        case "article-thumbnail":
          file = data.get("thumbnail") as File;
          sizeLimit = 2 * 1024 * 1024; // 2MB for thumbnails
          folder = "article-thumbnails/";
          break;
        default:
          return NextResponse.json(
            { error: "Invalid upload type" },
            { status: 400 }
          );
      }

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate file type and security
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "File must be an image" },
          { status: 400 }
        );
      }

      // Validate file signature (magic bytes)
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      const signature = buffer.subarray(0, 4).toString("hex");
      const validSignatures = [
        "ffd8ff", // JPEG
        "89504e47", // PNG
        "47494638", // GIF87a/GIF89a
        "52494646", // WebP (RIFF)
      ];
      const isValidImage = validSignatures.some((sig) =>
        signature.startsWith(sig)
      );
      if (!isValidImage) {
        return NextResponse.json(
          {
            error:
              "Invalid image file. File signature does not match image format.",
          },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > sizeLimit) {
        const limitMB = sizeLimit / (1024 * 1024);
        return NextResponse.json(
          { error: `File size must be less than ${limitMB}MB` },
          { status: 400 }
        );
      }

      // Sanitize filename
      const timestamp = Date.now();
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/\.+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .toLowerCase();

      const ext = sanitizedName.split(".").pop() || "";
      const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
      if (!allowedExtensions.includes(ext)) {
        return NextResponse.json(
          {
            error:
              "Invalid file extension. Only jpg, jpeg, png, gif, webp allowed",
          },
          { status: 400 }
        );
      }

      finalFilename = `${folder}${timestamp}-${sanitizedName}`;
      contentType = file.type;
    }

    // Ensure bucket exists and set policy
    const bucketName = process.env.MINIO_BUCKET_NAME!;
    try {
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        await minioClient.makeBucket(bucketName, "us-east-1");
      }

      // Set bucket policy for public access
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };

      try {
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      } catch (policyError) {
        console.warn("Failed to set bucket policy:", policyError);
      }
    } catch (bucketError) {
      console.error("Bucket operation error:", bucketError);
      return NextResponse.json(
        {
          error: "Failed to access MinIO bucket",
          details:
            bucketError instanceof Error
              ? bucketError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Upload with retry logic for non-general types
    if (type !== "general") {
      let attempts = 0;
      const maxAttempts = 3;
      let currentFilename = finalFilename;

      while (attempts < maxAttempts) {
        try {
          await minioClient.putObject(
            bucketName,
            currentFilename,
            buffer,
            buffer.length,
            {
              "Content-Type": contentType,
            }
          );
          break; // Success
        } catch (error: unknown) {
          const minioError = error as MinIOError;
          console.error("Upload attempt failed:", {
            attempt: attempts + 1,
            error: minioError.message,
            code: minioError.code,
            filename: currentFilename,
          });
          attempts++;
          if (minioError.code === "NoSuchBucket" && attempts < maxAttempts) {
            await minioClient.makeBucket(bucketName, "us-east-1");
            continue;
          }
          if (attempts >= maxAttempts) {
            throw error;
          }
          // Generate new filename for retry
          const timestamp = Date.now();
          const sanitizedName = finalFilename.split("/").pop() || "file";
          currentFilename = finalFilename.includes("/")
            ? `${finalFilename.split("/")[0]}/${timestamp}-${sanitizedName}`
            : `${timestamp}-${sanitizedName}`;
        }
      }
      finalFilename = currentFilename;
    } else {
      // Simple upload for general type
      await minioClient.putObject(
        bucketName,
        finalFilename,
        buffer,
        buffer.length,
        {
          "Content-Type": contentType,
        }
      );
    }

    // Generate public URL
    const publicUrl = `${process.env.MINIO_PUBLIC_ENDPOINT?.replace(
      ":443",
      ""
    )}/${bucketName}/${finalFilename}`;

    // Return appropriate response format
    if (type === "quill-image") {
      return NextResponse.json(
        { location: publicUrl },
        { headers: corsHeaders }
      );
    } else if (type === "general") {
      return NextResponse.json({ url: publicUrl });
    } else {
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: finalFilename,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    // Initialize MinIO client with error handling
    const minioEndpoint = process.env.MINIO_PUBLIC_ENDPOINT;
    const minioUser = process.env.MINIO_ROOT_USER;
    const minioPassword = process.env.MINIO_ROOT_PASSWORD;

    if (!minioEndpoint || !minioUser || !minioPassword) {
      console.error("Missing MinIO environment variables:", {
        endpoint: !!minioEndpoint,
        user: !!minioUser,
        password: !!minioPassword,
      });
      return NextResponse.json(
        { error: "MinIO configuration missing" },
        { status: 500 }
      );
    }

    const minioClient = new Client({
      endPoint: minioEndpoint
        .replace("https://", "")
        .replace("http://", "")
        .replace(":443", ""),
      port: 443,
      useSSL: true,
      accessKey: minioUser,
      secretKey: minioPassword,
    });

    // Delete file from MinIO
    const bucketName = process.env.MINIO_BUCKET_NAME!;
    await minioClient.removeObject(bucketName, filename);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
