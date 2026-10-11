
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuid } = require("uuid");
const path = require("path");

const Claim = require("../models/Claim");
const config = require("../config");

// Use AWS SDK's default credential provider chain.
// Do not hardcode AWS access keys in this file.
const s3 = new S3Client({
  region: config.awsRegion || process.env.AWS_REGION || "us-east-1",
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Upload a document to S3 and save its metadata to MongoDB.
 *
 * `file` is expected to come from Multer memoryStorage().
 */
async function saveDocument(claimId, file, user) {
  if (!file || !file.buffer) {
    throw new Error("A valid uploaded file is required");
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error("Unsupported document type");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must not exceed 10 MB");
  }

  if (!config.s3Bucket) {
    throw new Error("S3 bucket is not configured");
  }

  const claim = await Claim.findById(claimId);

  if (!claim) {
    throw new Error("Claim not found");
  }

  const originalName = path.basename(file.originalname);
  const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${uuid()}-${safeFilename}`;
  const key = `claims/${claimId}/${storedName}`;

  let uploadedToS3 = false;

  try {
    // 1. Upload the document to Amazon S3.
    const result = await s3.send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    uploadedToS3 = true;

    console.log("[S3] Document uploaded", {
      claimId,
      key,
      httpStatusCode: result.$metadata?.httpStatusCode,
    });

    // 2. Save document metadata in MongoDB.
    const documentMetadata = {
      originalName,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      path: key,
    };

    claim.supportingDocuments.push(documentMetadata);

    // Add a timeline event if this model supports timeline tracking.
    if (Array.isArray(claim.timeline)) {
      claim.timeline.push({
        event: "DOCUMENT_UPLOADED",
        description: `Document uploaded: ${originalName}`,
        performedBy: user?._id || user?.id,
        timestamp: new Date(),
      });
    }

    await claim.save();

    // Do not expose the internal S3 key in the response.
    const savedDocument =
      claim.supportingDocuments[claim.supportingDocuments.length - 1];

    return {
      id: savedDocument._id,
      originalName: savedDocument.originalName,
      storedName: savedDocument.storedName,
      mimeType: savedDocument.mimeType,
      size: savedDocument.size,
    };
  } catch (error) {
    // 3. Compensate for an S3 upload if MongoDB persistence fails.
    if (uploadedToS3) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: config.s3Bucket,
            Key: key,
          })
        );
      } catch (cleanupError) {
        console.error("[S3] Cleanup failed", {
          claimId,
          errorName: cleanupError.name,
          message: cleanupError.message,
        });
      }
    }

    throw error;
  }
}

/**
 * Generate a temporary download URL for a document.
 * URL expires after five minutes.
 */
async function getDownloadUrl(claim, documentId) {
  if (!config.s3Bucket) {
    throw new Error("S3 bucket is not configured");
  }

  const document = claim.supportingDocuments.id(documentId);

  if (!document) {
    throw new Error("Document not found");
  }

  const command = new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: document.path,
  });

  return getSignedUrl(s3, command, {
    expiresIn: 300,
  });
}

module.exports = {
  saveDocument,
  getDownloadUrl,
};
