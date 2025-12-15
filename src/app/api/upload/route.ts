import { NextResponse, NextRequest } from "next/server";
import { Client } from "minio";
import { logger } from "@/lib/logger";
import { createApiHandler, ApiHandlerContext } from "@/lib/api-helpers";

interface MinIOError {
  message: string;
  code?: string;
}


// Wrapper function to handle special quill-image case
async function handleUploadRequest(request: NextRequest): Promise<NextResponse> {

  // Use createApiHandler for all upload types
  const handler = createApiHandler(
    { auth: "optional" },
    async function (body: unknown, context: ApiHandlerContext): Promise<unknown> {
      const { request: req, user } = context;
      const { searchParams: sp } = new URL(req.url);
      const uploadType = sp.get("type") || "general";
      const rawFilename = sp.get("filename");
      
      // Security: Prevent path traversal attacks
      const filename = rawFilename ? rawFilename.replace(/\.\./g, '').replace(/\//g, '') : null;

      // Validate Content-Type for FormData uploads
      const contentTypeHeader = req.headers.get("content-type");
      if (uploadType !== "general" && contentTypeHeader && !contentTypeHeader.includes("multipart/form-data")) {
        throw new Error("Invalid Content-Type. Expected multipart/form-data for file uploads.");
      }

      // Custom authentication logic for upload API
      if (uploadType === "general") {
        if (!user) {
          throw new Error("Unauthorized");
        }
        if (!filename) {
          throw new Error("Filename required");
        }
      }

      // Initialize MinIO client
      const minioEndpoint = process.env.MINIO_PUBLIC_ENDPOINT;
      const minioAccessKey =
        process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER;
      const minioSecretKey =
        process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;

      if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
        logger.error("Missing MinIO environment variables", new Error("MinIO configuration missing"), {
          endpoint: !!minioEndpoint,
          accessKey: !!minioAccessKey,
          secretKey: !!minioSecretKey,
        });
        throw new Error("MinIO configuration missing");
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

      // Handle different upload types
      if (uploadType === "general") {
        // Original blob-based upload
        const bodyBlob = await req.blob();
        buffer = Buffer.from(await bodyBlob.arrayBuffer());
        contentType = bodyBlob.type || "application/octet-stream";
        finalFilename = filename!;
      } else {
        // FormData-based uploads (tinymce-image, patient-photo, article-thumbnail)
        const data = await req.formData();
        let file: File | null = null;
        let sizeLimit = 5 * 1024 * 1024; // 5MB default
        let folder = "";

        // Determine file field and settings based on type
        switch (uploadType) {
          case "quill-image":
            file = data.get("file") as File;
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
            throw new Error("Invalid upload type");
        }

        if (!file) {
          throw new Error("No file provided");
        }

        // Validate file type and security
        if (!file.type.startsWith("image/")) {
          throw new Error("File must be an image");
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
          throw new Error(
            "Invalid image file. File signature does not match image format."
          );
        }

        // Validate file size
        if (file.size > sizeLimit) {
          const limitMB = sizeLimit / (1024 * 1024);
          throw new Error(`File size must be less than ${limitMB}MB`);
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
          throw new Error(
            "Invalid file extension. Only jpg, jpeg, png, gif, webp allowed"
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
          logger.warn("Failed to set bucket policy", { error: policyError instanceof Error ? policyError.message : String(policyError) });
        }
      } catch (bucketError) {
        logger.error("Bucket operation error", bucketError as Error);
        throw new Error(
          `Failed to access MinIO bucket: ${
            bucketError instanceof Error
              ? bucketError.message
              : "Unknown error"
          }`
        );
      }

      // Upload with retry logic for non-general types
      if (uploadType !== "general") {
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
            logger.error("Upload attempt failed", minioError as Error, {
              attempt: attempts + 1,
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

      // Return standardized response format
      return {
        __isQuillResponse: uploadType === "quill-image",
        success: true,
        data: {
          url: publicUrl,
          filename: finalFilename,
          type: uploadType,
          size: buffer.length,
          contentType: contentType,
        },
      };
    }
  );

  // Call the handler
  const response = await handler(request, { params: Promise.resolve({}) });

  // Handle special quill-image response with CORS headers
  const result = await response.json();
  if (result.data && result.data.__isQuillResponse) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    // Return quill-expected format: { location: url }
    return NextResponse.json(
      { location: result.data.data.url },
      { headers: corsHeaders }
    );
  }

  return response;
}

export const POST = handleUploadRequest;

export const DELETE = createApiHandler(
  { auth: "required" },
  async function (body: unknown, context: ApiHandlerContext): Promise<unknown> {
    const { request } = context;
    const { searchParams } = new URL(request.url);
    const rawFilename = searchParams.get("filename");
    
    // Security: Prevent path traversal attacks
    const filename = rawFilename ? rawFilename.replace(/\.\./g, '').replace(/\//g, '') : null;

    if (!filename) {
      throw new Error("Filename required");
    }

    // Initialize MinIO client with error handling
    const minioEndpoint = process.env.MINIO_PUBLIC_ENDPOINT;
    const minioUser = process.env.MINIO_ROOT_USER;
    const minioPassword = process.env.MINIO_ROOT_PASSWORD;

    if (!minioEndpoint || !minioUser || !minioPassword) {
      logger.error("Missing MinIO environment variables", new Error("MinIO configuration missing"), {
        endpoint: !!minioEndpoint,
        user: !!minioUser,
        password: !!minioPassword,
      });
      throw new Error("MinIO configuration missing");
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

    return { success: true };
  }
);
