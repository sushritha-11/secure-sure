
require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,

  mongoUri: process.env.MONGO_URI || "",

  jwtSecret:
    process.env.JWT_SECRET || "dev-secret",

  clientUrl:
    process.env.CLIENT_URL ||
    "http://localhost:5173",

  // Local Ollama LLM
  ollamaBaseUrl:
    process.env.OLLAMA_BASE_URL ||
    "http://localhost:11434",

  ollamaModel:
    process.env.OLLAMA_MODEL ||
    "phi3:mini",

  // Local ChromaDB
  chromaHost:
    process.env.CHROMA_HOST || "localhost",

  chromaPort:
    Number(process.env.CHROMA_PORT) || 8000,

  chromaSsl:
    process.env.CHROMA_SSL === "true",

  // AWS S3
  awsRegion:
    process.env.AWS_REGION || "us-east-1",

  s3Bucket:
    process.env.S3_BUCKET_NAME || "",
};
