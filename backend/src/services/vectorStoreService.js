const {
  Chroma,
} = require("@langchain/community/vectorstores/chroma");

const {
  chromaHost,
  chromaPort,
  chromaSsl,
} = require("../config");

const {
  LocalHuggingFaceEmbeddings,
} = require("./embeddingService");

let vectorStore = null;

async function getVectorStore() {
  if (vectorStore) {
    return vectorStore;
  }

  console.log(
    `[VECTOR DB] Connecting to local Chroma at ${chromaHost}:${chromaPort}...`,
  );

  const embeddings =
    new LocalHuggingFaceEmbeddings();

  vectorStore = new Chroma(
    embeddings,
    {
      collectionName:
        "securesure_policies",

      host: chromaHost,

      port: chromaPort,

      ssl: chromaSsl,
    },
  );

  console.log(
    "[VECTOR DB] Local Chroma configured",
  );

  return vectorStore;
}

module.exports = {
  getVectorStore,
};

// const {
//   Chroma,
// } = require("@langchain/community/vectorstores/chroma");

// const {
//   chromaHost,
//   chromaApiKey,
//   chromaTenant,
//   chromaDatabase,
// } = require("../config");

// const {
//   LocalHuggingFaceEmbeddings,
// } = require("./embeddingService");

// let vectorStore = null;

// async function getVectorStore() {
//   if (vectorStore) {
//     return vectorStore;
//   }

//   console.log(
//     "[VECTOR DB] Connecting to Chroma Cloud..."
//   );

//   const embeddings =
//     new LocalHuggingFaceEmbeddings();

//   vectorStore = new Chroma(
//     embeddings,
//     {
//       collectionName:
//         "securesure_policies",

//       host: chromaHost,

//       clientParams: {
//         apiKey: chromaApiKey,
//         tenant: chromaTenant,
//         database: chromaDatabase,
//       },
//     }
//   );

//   console.log(
//     "[VECTOR DB] Chroma Cloud connected"
//   );

//   return vectorStore;
// }

// module.exports = {
//   getVectorStore,
// };

// // const { Chroma } = require("@langchain/community/vectorstores/chroma");

// // const {
// //   chromaHost,
// //   chromaApiKey,
// //   chromaTenant,
// //   chromaDatabase,
// // } = require("../config");

// // const {
// //   HuggingFaceEmbeddings,
// // } = require("./embeddingService");

// // let vectorStore = null;

// // async function getVectorStore() {
// //   if (vectorStore) {
// //     return vectorStore;
// //   }

// //   const embeddings = new HuggingFaceEmbeddings();

// //   vectorStore = new Chroma(embeddings, {
// //     collectionName: "securesure_policies",

// //     host: chromaHost,

// //     clientParams: {
// //       apiKey: chromaApiKey,
// //       tenant: chromaTenant,
// //       database: chromaDatabase,
// //     },
// //   });

// //   return vectorStore;
// // }

// // module.exports = {
// //   getVectorStore,
// // };