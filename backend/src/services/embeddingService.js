const { pipeline } = require("@huggingface/transformers");

const MODEL =
  "onnx-community/all-MiniLM-L6-v2-ONNX";

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    console.log(
      "[EMBEDDING] Loading local embedding model..."
    );

    extractor = await pipeline(
      "feature-extraction",
      MODEL
    );

    console.log(
      "[EMBEDDING] Local embedding model ready"
    );
  }

  return extractor;
}

class LocalHuggingFaceEmbeddings {
  async embedQuery(text) {
    const model = await getExtractor();

    const output = await model(text, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data);
  }

  async embedDocuments(documents) {
    const model = await getExtractor();

    const embeddings = [];

    for (const document of documents) {
      const output = await model(document, {
        pooling: "mean",
        normalize: true,
      });

      embeddings.push(
        Array.from(output.data)
      );
    }

    return embeddings;
  }
}

module.exports = {
  LocalHuggingFaceEmbeddings,
};


// const { Embeddings } = require("@langchain/core/embeddings");
// const { InferenceClient } = require("@huggingface/inference");
// const {
//   hfToken,
//   hfEmbeddingModel,
// } = require("../config");

// if (!hfToken) {
//   console.warn("[EMBEDDINGS] HF_TOKEN is not configured");
// }

// const hf = new InferenceClient(hfToken);

// function meanPool(matrix) {
//   if (!Array.isArray(matrix) || !matrix.length) {
//     throw new Error("Invalid embedding response");
//   }

//   const first = matrix[0];

//   // Already a single vector
//   if (typeof first === "number") {
//     return matrix;
//   }

//   // Token-level embeddings -> mean pool
//   if (Array.isArray(first)) {
//     const dimensions = first.length;
//     const result = new Array(dimensions).fill(0);

//     for (const tokenVector of matrix) {
//       for (let i = 0; i < dimensions; i++) {
//         result[i] += tokenVector[i];
//       }
//     }

//     for (let i = 0; i < dimensions; i++) {
//       result[i] /= matrix.length;
//     }

//     return result;
//   }

//   throw new Error("Unsupported embedding shape");
// }

// class HuggingFaceEmbeddings extends Embeddings {
//   constructor() {
//     super({});
//   }

//   async embedDocuments(texts) {
//     return Promise.all(
//       texts.map((text) => this.embedQuery(text)),
//     );
//   }

//   async embedQuery(text) {
//     if (!hfToken) {
//       throw new Error(
//         "HF_TOKEN is required for policy embeddings",
//       );
//     }

//     const output = await hf.featureExtraction({
//       model: hfEmbeddingModel,
//       inputs: text,
//     });

//     return meanPool(output);
//   }
// }

// module.exports = {
//   HuggingFaceEmbeddings,
// };