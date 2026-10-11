const {
  StateGraph,
  START,
  END,
  StateSchema,
} = require("@langchain/langgraph");

const { z } = require("zod");

const {
  searchPolicies,
} = require("./policyService");

const {
  generateAssessment,
} = require("./aiService");

const RagState = new StateSchema({
  claim: z.any(),

  query: z.string(),

  policies: z.array(
    z.object({
      file: z.string(),
      text: z.string(),
      score: z.any().optional(),
    }),
  ),

  assessment: z.string(),

  sources: z.array(
    z.object({
      file: z.string(),
      score: z.any().optional(),
    }),
  ),
});

async function retrievePolicy(state) {
  console.log(
    "[LANGGRAPH] Node: retrievePolicy",
  );

  const policies =
    await searchPolicies(
      state.query,
      5,
    );

  if (!policies.length) {
    throw new Error(
      "No policy context could be retrieved",
    );
  }

  return {
    policies,
    sources: policies.map((p) => ({
      file: p.file,
      score: p.score,
    })),
  };
}

async function generatePolicyAssessment(
  state,
) {
  console.log(
    "[LANGGRAPH] Node: generateAssessment",
  );

  const assessment =
    await generateAssessment(
      state.claim,
      state.policies,
    );

  return {
    assessment,
  };
}

const graph = new StateGraph(RagState)
  .addNode(
    "retrievePolicy",
    retrievePolicy,
  )
  .addNode(
    "generateAssessment",
    generatePolicyAssessment,
  )
  .addEdge(
    START,
    "retrievePolicy",
  )
  .addEdge(
    "retrievePolicy",
    "generateAssessment",
  )
  .addEdge(
    "generateAssessment",
    END,
  )
  .compile();

async function generateClaimAssessment(
  claim,
) {
  const query = [
    claim.claimType,
    claim.incidentDescription,
    claim.policyNumber,
    "coverage exclusions documentation requirements",
  ].join(" ");

  try {
    const result =
      await graph.invoke({
        claim,
        query,
        policies: [],
        assessment: "",
        sources: [],
      });

    return {
      assessment: result.assessment,
      sources: result.sources,
    };
  } catch (error) {
    console.error(
      "[LANGGRAPH]",
      error.message,
    );

    return {
      assessment:
        "No policy context could be retrieved. Do not make a claim decision until policy information is available.",
      sources: [],
    };
  }
}

module.exports = {
  generateClaimAssessment,
  graph,
};

// const { searchPolicies } = require("./policyService");
// const { generateAssessment } = require("./aiService");
// async function generateClaimAssessment(c) {
//   const q = [
//     c.claimType,
//     c.incidentDescription,
//     c.policyNumber,
//     "coverage exclusions documentation requirements",
//   ].join(" ");
//   const policies = await searchPolicies(q, 5);
//   if (!policies.length)
//     return {
//       assessment:
//         "No policy context could be retrieved. Do not make a claim decision until policy information is available.",
//       sources: [],
//     };
//   return {
//     assessment: await generateAssessment(c, policies),
//     sources: policies.map((p) => ({ file: p.file, score: p.score })),
//   };
// }
// module.exports = { generateClaimAssessment };
