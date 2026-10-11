const { getVectorStore } = require("./vectorStoreService");

async function searchPolicies(query, limit = 5) {
  const vectorStore = await getVectorStore();

  console.log(
    `[RETRIEVAL] Running MMR search for: ${query}`,
  );

  // LangChain's Chroma integration in the installed
  // version does not expose maxMarginalRelevanceSearch.
  // Retrieve a larger candidate set using similarity search.
  const documents = await vectorStore.similaritySearch(
    query,
    Math.max(limit * 3, 10),
  );

  // Simple diversity-aware selection from the retrieved
  // candidates so we don't return duplicate chunks.
  const selected = [];
  const seenSources = new Set();

  for (const doc of documents) {
    const source =
      doc.metadata?.source ||
      doc.metadata?.file ||
      "unknown-policy";

    if (!seenSources.has(source)) {
      selected.push(doc);
      seenSources.add(source);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  console.log(
    `[RETRIEVAL] Retrieved ${documents.length} candidates`,
  );

  console.log(
    `[RETRIEVAL] Selected ${selected.length} policy documents`,
  );

  return selected.map((doc) => ({
    file:
      doc.metadata?.source ||
      doc.metadata?.file ||
      "unknown-policy",

    text: doc.pageContent,

    score: null,

    metadata: doc.metadata,
  }));
}

module.exports = {
  searchPolicies,
};