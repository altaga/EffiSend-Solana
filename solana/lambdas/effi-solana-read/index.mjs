// effisend-effi-solana-read — PUBLIC, READ-ONLY: which Effi compressed NFTs does a
// Solana address hold? Called directly by the Effisend app (Passes tab).
//
// Why this exists: cNFTs are only visible through the DAS API, and the official
// Solana RPC that serves it without an API key answers 403 to browsers AND blocks
// Cloudflare (where the app's own server routes run). It answers AWS normally.
//
// Deliberately narrow: takes only an owner address and always searches the Effi
// collection — it can't be used as a general RPC proxy. No secrets, no DB access
// (basic logs-only role). Returns public on-chain data.
const DAS_RPCS = ["https://api.mainnet-beta.solana.com", "https://api.mainnet.solana.com"];
const EFFI_COLLECTION = "A6mvwAuQ7e7bi3CyZyLSaeYcZgWbqoWLdzQXaQWGnRuQ";
const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const reply = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

async function searchEffi(rpc, owner) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "effi",
        method: "searchAssets",
        params: { ownerAddress: owner, grouping: ["collection", EFFI_COLLECTION], page: 1, limit: 100 },
      }),
      signal: controller.signal,
    });
    const json = await res.json();
    if (json.error || !json.result) throw new Error(json.error?.message || "no result");
    return json.result.items.map((a) => a.id);
  } finally {
    clearTimeout(timer);
  }
}

export const handler = async (event) => {
  let owner;
  try {
    const body = typeof event?.body === "string" ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body) : event || {};
    owner = body.owner;
  } catch {
    return reply(400, { error: "Invalid JSON", ids: [] });
  }
  if (typeof owner !== "string" || !BASE58_ADDRESS.test(owner)) {
    return reply(400, { error: "Invalid Solana address", ids: [] });
  }
  try {
    // Real fallback: first endpoint that answers wins.
    const ids = await Promise.any(DAS_RPCS.map((rpc) => searchEffi(rpc, owner)));
    return reply(200, { error: null, ids });
  } catch (error) {
    console.error("[effi-solana-read]", owner, error.errors?.map((e) => e.message) || error.message);
    return reply(502, { error: "DAS unavailable", ids: [] });
  }
};
