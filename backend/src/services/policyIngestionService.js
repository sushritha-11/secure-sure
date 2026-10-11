const fs = require("fs");
const path = require("path");

const {
  RecursiveCharacterTextSplitter,
} = require("@langchain/textsplitters");

const { Document } = require("@langchain/core/documents");

const { getVectorStore } = require("./vectorStoreService");

const policyDir = path.join(
  __dirname,
  "../../data/policies",
);

async function loadPolicyDocuments() {
  if (!fs.existsSync(policyDir)) {
    throw new Error(
      `Policy directory not found: ${policyDir}`,
    );
  }

  const files = fs
    .readdirSync(policyDir)
    .filter((file) => file.endsWith(".txt"));

  const documents = [];

  for (const file of files) {
    const filePath = path.join(policyDir, file);

    const text = fs.readFileSync(
      filePath,
      "utf8",
    );

    documents.push(
      new Document({
        pageContent: text,
        metadata: {
          source: file,
          type: "insurance-policy",
        },
      }),
    );
  }

  console.log(
    `[INGESTION] Loaded ${documents.length} policy documents`,
  );

  return documents;
}

async function ingestPolicies() {
  console.log("[INGESTION] Starting policy ingestion...");

  const documents = await loadPolicyDocuments();

  const splitter =
    new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 80,
    });

  const chunks = await splitter.splitDocuments(
    documents,
  );

  console.log(
    `[INGESTION] Created ${chunks.length} chunks`,
  );

  const vectorStore =
    await getVectorStore();

  await vectorStore.addDocuments(chunks);

  console.log(
    "[INGESTION] Policies successfully stored in Chroma",
  );

  return {
    documents: documents.length,
    chunks: chunks.length,
  };
}

if (require.main === module) {
  ingestPolicies()
    .then((result) => {
      console.log(
        "[INGESTION] Complete:",
        result,
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        "[INGESTION] Failed:",
        error,
      );
      process.exit(1);
    });
}

module.exports = {
  ingestPolicies,
};