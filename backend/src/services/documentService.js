
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const { v4: uuid } = require("uuid");

const Claim = require("../models/Claim");
const config = require("../config");

const s3 = new S3Client({
  region: config.awsRegion || process.env.AWS_REGION,
});

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  return error;
}

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function saveDocument(claimId, file, user) {
  if (!file) {
    throw createError("No document provided", 400);
  }

  const claim = await Claim.findById(claimId);

  if (!claim) {
    throw createError("Claim not found", 404);
  }

  // Validate that this file type is supported.
  const allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "text/plain",
  ]);

  if (!allowedTypes.has(file.mimetype)) {
    throw createError(
      "Only PDF, JPEG, PNG, and TXT files are allowed",
      400,
    );
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw createError(
      "Document must be 10 MB or smaller",
      400,
    );
  }

  const storedName =
    `${uuid()}-${sanitizeFilename(file.originalname)}`;

  const key = `claims/${claimId}/${storedName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket || process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  const document = {
    originalName: file.originalname,
    storedName,
    mimeType: file.mimetype,
    size: file.size,
    path: key,
  };

  claim.supportingDocuments.push(document);

  if (claim.timeline) {
    claim.timeline.push({
      event: "DOCUMENT_UPLOADED",
      message: `Document uploaded: ${file.originalname}`,
      actor: {
        id: user.sub || user.id,
        name: user.name,
        role: user.role,
      },
    });
  }

  try {
    await claim.save();
  } catch (error) {
    // Avoid leaving an orphaned S3 object if MongoDB save fails.
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket:
            config.s3Bucket || process.env.S3_BUCKET_NAME,
          Key: key,
        }),
      );
    } catch (cleanupError) {
      console.error(
        "[DOCUMENT] S3 cleanup failed:",
        cleanupError.message,
      );
    }

    throw error;
  }

  const savedDocument =
    claim.supportingDocuments[
      claim.supportingDocuments.length - 1
    ];

  const result = savedDocument.toObject
    ? savedDocument.toObject()
    : savedDocument;

  // Never expose internal storage keys in the upload response.
  const { path, ...safeDocument } = result;

  return safeDocument;
}

// The calling route must verify that the user can access this claim.
async function getDownloadUrl(claim, documentId) {
  const document = claim.supportingDocuments.id(documentId);

  if (!document) {
    throw createError("Document not found", 404);
  }

  const bucket =
    config.s3Bucket || process.env.S3_BUCKET_NAME;

  if (!bucket || !document.path) {
    throw createError(
      "Document storage configuration is missing",
      500,
    );
  }

  const filename = sanitizeFilename(document.originalName);

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: document.path,
      ResponseContentDisposition:
        `attachment; filename="${filename}"`,
    }),
    { expiresIn: 300 },
  );

  return {
    url,
    name: document.originalName,
    expiresIn: 300,
  };
}

module.exports = {
  saveDocument,
  getDownloadUrl,
};
