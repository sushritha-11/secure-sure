require("dotenv").config();

const { ChromaClient } = require("chromadb");

async function test() {
  console.log("[CHROMA TEST]");

  const client = new ChromaClient({
    host: process.env.CHROMA_HOST || "localhost",
    port: Number(process.env.CHROMA_PORT) || 8000,
    ssl: process.env.CHROMA_SSL === "true",
  });

  const heartbeat =
    await client.heartbeat();

  console.log(
    "[CHROMA] Heartbeat:",
    heartbeat,
  );

  const collections =
    await client.listCollections();

  console.log(
    "[CHROMA] Connection successful!",
  );

  console.log(
    "[CHROMA] Collections:",
    collections,
  );
}

test().catch((error) => {
  console.error(
    "[CHROMA] Connection failed:",
  );

  console.error(error);

  process.exit(1);
});