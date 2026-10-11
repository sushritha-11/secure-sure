const {
  ollamaBaseUrl,
  ollamaModel,
} = require("../config");

console.log("[AI SERVICE] Loaded");
console.log("[AI SERVICE] Ollama URL:", ollamaBaseUrl);
console.log("[AI SERVICE] Ollama model:", ollamaModel);


// ============================================================
// BUILD PROMPT
// ============================================================

function prompt(c, ctx) {
  return `You are an insurance claims assessment assistant for SecureSure Insurance.

Your role is to assist a claims officer by analyzing a claim using ONLY the retrieved policy information.

CLAIM INFORMATION

Claim Number: ${c.claimNumber}
Policy Number: ${c.policyNumber}
Customer: ${c.customerName}
Claim Type: ${c.claimType}
Claimed Amount: ${c.claimedAmount}
Incident Date: ${c.incidentDate || "Not provided"}
Incident Description: ${
    c.incidentDescription || "Not provided"
  }

RETRIEVED POLICY CONTEXT

${ctx || "No policy context was retrieved."}


TASK

Provide a concise advisory assessment for the claims officer.

Your response must contain these sections:

1. RELEVANT POLICY CONDITIONS
Identify the policy conditions from the retrieved context that are relevant to this claim.

2. MISSING INFORMATION OR DOCUMENTATION
Identify information or documents that appear to be missing based on the claim and retrieved policy context.

3. RECOMMENDED NEXT ACTION
Recommend what the claims officer should review or obtain next.

4. DECISION AUTHORITY
State that the final decision remains with the claims officer.


STRICT RULES

- Use ONLY the retrieved policy context.
- Do NOT invent policy clauses.
- Do NOT invent policy numbers, limits, exclusions, waiting periods, or coverage conditions.
- Do NOT assume that something is covered unless the retrieved policy context supports it.
- Do NOT automatically approve the claim.
- Do NOT automatically reject the claim.
- If the retrieved policy context is insufficient, explicitly say that additional policy information is required.
- The final claim decision belongs to the claims officer.
- Keep the assessment concise and professional.
`;
}


// ============================================================
// CALL OLLAMA
// ============================================================

async function callOllama(promptText) {
  console.log(
    "[AI] Calling Ollama:",
    ollamaModel,
  );

  console.log(
    "[AI] Ollama URL:",
    ollamaBaseUrl,
  );

  const response = await fetch(
    `${ollamaBaseUrl}/api/generate`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: ollamaModel,

        prompt: promptText,

        stream: false,

        options: {
          temperature: 0.1,
        },
      }),
    },
  );

  console.log(
    "[AI] Ollama HTTP status:",
    response.status,
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Ollama returned ${response.status}: ${errorText}`,
    );
  }

  const data =
    await response.json();

  console.log(
    "[AI] Ollama response received",
  );

  if (!data.response) {
    throw new Error(
      "Ollama returned an empty response",
    );
  }

  return data.response;
}


// ============================================================
// FALLBACK
// ============================================================

function fallback(c, ps) {
  const missing = [];

  if (!c.incidentDescription) {
    missing.push(
      "incident description",
    );
  }

  if (!c.incidentDate) {
    missing.push(
      "incident date",
    );
  }

  if (
    !c.supportingDocuments ||
    !c.supportingDocuments.length
  ) {
    missing.push(
      "supporting documentation",
    );
  }

  return `AI-ASSISTED ADVISORY ASSESSMENT

Claim: ${c.claimNumber}
Type: ${c.claimType}

Relevant Policy Sources:
${
  ps.length
    ? ps
        .map((x) => `- ${x.file}`)
        .join("\n")
    : "- No policy sources retrieved"
}

MISSING INFORMATION
${
  missing.length
    ? missing.join(", ")
    : "No obvious missing information from the current record"
}

RECOMMENDED NEXT ACTION
Review the retrieved policy conditions and supporting evidence before making a decision.

DECISION AUTHORITY
Claims officer.

This assessment does not approve or reject the claim.`;
}


// ============================================================
// MAIN ASSESSMENT FUNCTION
// ============================================================

async function generateAssessment(
  c,
  ps,
) {
  console.log(
    "[AI] generateAssessment() called for:",
    c.claimNumber,
  );

  const ctx = ps
    .map(
      (x) =>
        `SOURCE: ${x.file}\n${x.text}`,
    )
    .join("\n\n");

  console.log(
    "[AI] Retrieved policy context length:",
    ctx.length,
  );

  try {
    const result =
      await callOllama(
        prompt(c, ctx),
      );

    return (
      result ||
      fallback(c, ps)
    );
  } catch (error) {
    console.error(
      "[AI ERROR]",
      error.message,
    );

    return fallback(c, ps);
  }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
  generateAssessment,
};

// const {
//   hfToken,
//   hfModel,
// } = require("../config");

// function prompt(claim, policies) {
//   const context = policies
//     .map(
//       (policy, index) =>
//         `POLICY SOURCE ${index + 1}: ${policy.file}\n${policy.text}`,
//     )
//     .join("\n\n");

//   return `
// You are an insurance claims assessment assistant.

// Your role is advisory only.

// CLAIM INFORMATION
// Claim Number: ${claim.claimNumber}
// Policy Number: ${claim.policyNumber}
// Customer: ${claim.customerName}
// Claim Type: ${claim.claimType}
// Claimed Amount: ${claim.claimedAmount}
// Incident Date: ${claim.incidentDate}
// Incident Description: ${claim.incidentDescription}

// RETRIEVED POLICY CONTEXT
// ${context}

// TASK

// Provide a concise advisory assessment using ONLY the retrieved
// policy context.

// Return exactly these sections:

// RELEVANT POLICY CONDITIONS
// - Identify policy conditions that are relevant to this claim.

// MISSING INFORMATION
// - Identify documents or information that are required or appear
//   to be missing.

// RECOMMENDED NEXT ACTION
// - State what the claims officer should verify or request next.

// GROUNDING RULES

// 1. Use only the retrieved policy context.
// 2. Do not invent policy clauses.
// 3. Do not assume coverage that is not stated in the retrieved context.
// 4. Clearly distinguish facts from recommendations.
// 5. If the retrieved context is insufficient, say so.
// 6. Never automatically approve the claim.
// 7. Never automatically reject the claim.
// 8. The claims officer remains responsible for the final decision.
// `;
// }

// async function external(promptText) {
//   if (!hfToken || !hfModel) {
//     return null;
//   }

//   console.log(
//     "[AI] Calling Hugging Face:",
//     hfModel,
//   );

//   const response = await fetch(
//     "https://router.huggingface.co/v1/chat/completions",
//     {
//       method: "POST",

//       headers: {
//         "Content-Type": "application/json",

//         Authorization:
//           `Bearer ${hfToken}`,
//       },

//       body: JSON.stringify({
//         model: hfModel,

//         messages: [
//           {
//             role: "user",
//             content: promptText,
//           },
//         ],

//         temperature: 0.1,

//         max_tokens: 700,
//       }),
//     },
//   );

//   if (!response.ok) {
//     const errorText =
//       await response.text();

//     throw new Error(
//       `Hugging Face API returned ${response.status}: ${errorText}`,
//     );
//   }

//   const data =
//     await response.json();

//   return (
//     data.choices?.[0]?.message?.content ||
//     null
//   );
// }

// function fallback(claim, policies) {
//   return `
// AI-ASSISTED ADVISORY ASSESSMENT

// Claim: ${claim.claimNumber}
// Type: ${claim.claimType}

// Relevant Policy Sources:
// ${policies
//   .map((p) => `- ${p.file}`)
//   .join("\n")}

// MISSING INFORMATION
// ${
//   !claim.incidentDescription
//     ? "- Incident description"
//     : !claim.supportingDocuments?.length
//       ? "- Supporting documentation"
//       : "- No obvious missing information from the current record"
// }

// RECOMMENDED NEXT ACTION
// Review the retrieved policy conditions and supporting
// evidence before making a decision.

// DECISION AUTHORITY
// Claims officer.

// This assessment does not approve or reject the claim.
// `;
// }

// async function generateAssessment(
//   claim,
//   policies,
// ) {
//   try {
//     const result =
//       await external(
//         prompt(claim, policies),
//       );

//     return (
//       result ||
//       fallback(claim, policies)
//     );
//   } catch (error) {
//     console.error(
//       "[AI]",
//       error.message,
//     );

//     return fallback(
//       claim,
//       policies,
//     );
//   }
// }

// module.exports = {
//   generateAssessment,
// };

// // const { hfToken, hfModel } = require("../config");

// // function prompt(c, ctx) {
// //   return `Role: Insurance claims assessment assistant.

// // Claim:
// // - Claim Number: ${c.claimNumber}
// // - Policy Number: ${c.policyNumber}
// // - Customer: ${c.customerName}
// // - Claim Type: ${c.claimType}
// // - Claimed Amount: ${c.claimedAmount}
// // - Incident: ${c.incidentDescription}

// // Retrieved Policy Context:
// // ${ctx}

// // Task:
// // Provide a concise advisory assessment.

// // Identify:
// // 1. Relevant policy conditions.
// // 2. Missing information or documentation.
// // 3. Recommended next action.

// // Rules:
// // - Use only the retrieved policy context.
// // - Never invent policy clauses.
// // - Never automatically approve or reject the claim.
// // - The final decision remains with the claims officer.`;
// // }

// // async function external(p) {
// //   if (!hfToken || !hfModel) {
// //     return null;
// //   }

// //   console.log("[AI] Calling Hugging Face:", hfModel);

// //   const response = await fetch(
// //     "https://router.huggingface.co/v1/chat/completions",
// //     {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //         Authorization: `Bearer ${hfToken}`,
// //       },
// //       body: JSON.stringify({
// //         model: hfModel,
// //         messages: [
// //           {
// //             role: "user",
// //             content: p,
// //           },
// //         ],
// //         temperature: 0.1,
// //       }),
// //     },
// //   );

// //   if (!response.ok) {
// //     const errorText = await response.text();
// //     throw new Error(
// //       `Hugging Face API returned ${response.status}: ${errorText}`,
// //     );
// //   }

// //   const data = await response.json();

// //   return data.choices?.[0]?.message?.content || null;
// // }

// // function fallback(c, ps) {
// //   const missing = [];

// //   if (!c.incidentDescription) {
// //     missing.push("incident description");
// //   }

// //   if (!c.incidentDate) {
// //     missing.push("incident date");
// //   }

// //   if (!c.supportingDocuments?.length) {
// //     missing.push("supporting documentation");
// //   }

// //   return `AI-ASSISTED ADVISORY ASSESSMENT

// // Claim ${c.claimNumber} (${c.claimType}) for ${c.customerName}.

// // Retrieved policy sources:
// // ${ps.length ? ps.map((x) => x.file).join(", ") : "none"}

// // Missing information:
// // ${
// //   missing.length
// //     ? missing.join(", ")
// //     : "No obvious missing fields in current record."
// // }

// // Recommended next action:
// // Review retrieved policy clauses and supporting evidence before making a decision.

// // Decision authority:
// // Claims officer.

// // This assessment does not approve or reject the claim.`;
// // }

// // async function generateAssessment(c, ps) {
// //   const ctx = ps.map((x) => `SOURCE ${x.file}\n${x.text}`).join("\n\n");

// //   try {
// //     return (await external(prompt(c, ctx))) || fallback(c, ps);
// //   } catch (e) {
// //     console.error("[AI]", e.message);
// //     return fallback(c, ps);
// //   }
// // }

// // module.exports = {
// //   generateAssessment,
// // };

// // // const { aiApiUrl, aiApiKey, aiModel } = require("../config");
// // // function prompt(c, ctx) {
// // //   return `Role: Insurance claims assessment assistant.\nClaim: ${c.claimNumber}; Policy: ${c.policyNumber}; Customer: ${c.customerName}; Type: ${c.claimType}; Amount: ${c.claimedAmount}; Incident: ${c.incidentDescription}\nPolicy context:\n${ctx}\nTask: concise advisory assessment; identify relevant conditions, missing information and recommended next action. Never invent policy clauses. Never automatically approve/reject. Final decision remains with claims officer.`;
// // // }
// // // async function external(p) {
// // //   if (!aiApiUrl || !aiApiKey || !aiModel) return null;
// // //   const r = await fetch(aiApiUrl, {
// // //     method: "POST",
// // //     headers: {
// // //       "Content-Type": "application/json",
// // //       Authorization: `Bearer ${aiApiKey}`,
// // //     },
// // //     body: JSON.stringify({
// // //       model: aiModel,
// // //       messages: [{ role: "user", content: p }],
// // //       temperature: 0.1,
// // //     }),
// // //   });
// // //   if (!r.ok) throw Error(`AI provider returned ${r.status}`);
// // //   const d = await r.json();
// // //   return d.choices?.[0]?.message?.content || d.output_text || null;
// // // }
// // // function fallback(c, ps) {
// // //   const missing = [];
// // //   if (!c.incidentDescription) missing.push("incident description");
// // //   if (!c.incidentDate) missing.push("incident date");
// // //   if (!c.supportingDocuments?.length) missing.push("supporting documentation");
// // //   return `AI-ASSISTED ADVISORY ASSESSMENT\nClaim ${c.claimNumber} (${c.claimType}) for ${c.customerName}.\nRetrieved policy sources: ${ps.length ? ps.map((x) => x.file).join(", ") : "none"}.\nMissing information: ${missing.length ? missing.join(", ") : "No obvious missing fields in current record."}\nRecommended next action: review retrieved policy clauses and supporting evidence before making a decision.\nDecision authority: claims officer. This assessment does not approve or reject the claim.`;
// // // }
// // // async function generateAssessment(c, ps) {
// // //   const ctx = ps.map((x) => `SOURCE ${x.file}\n${x.text}`).join("\n\n");
// // //   try {
// // //     return (await external(prompt(c, ctx))) || fallback(c, ps);
// // //   } catch (e) {
// // //     console.error("[AI]", e.message);
// // //     return fallback(c, ps);
// // //   }
// // // }
// // // module.exports = { generateAssessment };
