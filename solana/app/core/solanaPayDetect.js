import { findAssociatedTokenPda } from "@solana-program/token";

// Solana Pay payment detection, shared by the chat's SolanaPaymentWidget (browser,
// public RPCs) and /api/solanaPayStatus (server, official RPCs + Helius). Both run
// exactly this code; each passes its own `rpc(method, params)`. No UI imports here.

const SOL_DECIMALS = 9;
const AMOUNT_MATCH_SLACK_MS = 2 * 60 * 1000; // clock skew between the device and the chain
export const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Decimal string -> integer base units, exactly (no float rounding).
function toBaseUnits(amount, decimals) {
  if (!/^\d+(\.\d+)?$/.test(String(amount))) return null;
  const [whole, frac = ""] = String(amount).split(".");
  if (frac.length > decimals) return null;
  return BigInt(whole + frac.padEnd(decimals, "0"));
}

/**
 * Parses a Solana Pay URL into its parts. Two shapes:
 *  - transfer request:    solana:<RECIPIENT>?amount=<N>&spl-token=<MINT>&reference=<REF>
 *  - transaction request: solana:<url-encoded https link>, whose own query carries
 *    recipient / amount / spl-token / reference (DeSmond's /api/solanaPay links).
 */
export function parseSolanaUrl(url) {
  const empty = { recipient: null, amount: "0.00", splToken: null, reference: null };
  try {
    const withoutScheme = url.replace(/^solana:/, "");
    const decoded = decodeURIComponent(withoutScheme);
    if (/^https:\/\//i.test(decoded)) {
      const q = new URL(decoded).searchParams;
      return {
        recipient: q.get("recipient"),
        amount: q.get("amount") ?? "0.00",
        splToken: q.get("spl-token"),
        reference: q.get("reference"),
      };
    }
    const [recipientPart, queryString] = withoutScheme.split("?");
    const recipient = recipientPart.split("&")[0];
    const params = {};
    if (queryString) {
      queryString.split("&").forEach((part) => {
        const eqIdx = part.indexOf("=");
        if (eqIdx === -1) return;
        params[part.substring(0, eqIdx)] = decodeURIComponent(part.substring(eqIdx + 1));
      });
    }
    return {
      recipient,
      amount: params["amount"] ?? "0.00",
      splToken: params["spl-token"] ?? null,
      reference: params["reference"] ?? null,
    };
  } catch {
    return empty;
  }
}

// A mint's decimals and owner program never change: cache them for good.
const mintCache = new Map();
async function getMintInfo(rpc, mint) {
  if (!mintCache.has(mint)) {
    const info = await rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
    const decimals = info?.value?.data?.parsed?.info?.decimals;
    if (typeof decimals !== "number") return null;
    mintCache.set(mint, { decimals, program: info.value.owner });
  }
  return mintCache.get(mint);
}

/** The exact Solana Pay match: any transaction that carries the reference key. */
export async function findPaymentByReference(rpc, reference) {
  const sigs = await rpc("getSignaturesForAddress", [reference, { limit: 1 }]);
  return sigs?.length > 0 ? sigs[0].signature : null;
}

/**
 * Fallback when the wallet dropped the reference (Phantom's plain "send" does):
 * a transfer of EXACTLY the requested amount to the recipient, landed after the
 * link was created. DeSmond makes every link's amount unique (a few base units
 * of dust), so two customers paying at once can't be confused.
 * `seen` holds signatures already checked and not matching; one whose transaction
 * the RPC couldn't return yet is left out, so the next poll checks it again.
 * Returns the matching signature, or null.
 */
export async function findPaymentByAmount(rpc, parsed, createdAt, seen = new Set()) {
  const { recipient, splToken, amount } = parsed;
  if (!recipient) return null;

  let target = recipient;
  let decimals = SOL_DECIMALS;
  if (splToken) {
    // The recipient's associated token account, derived locally (many public RPCs
    // refuse getTokenAccountsByOwner). The mint's owner tells classic vs Token-2022.
    const mint = await getMintInfo(rpc, splToken);
    if (!mint) return null;
    decimals = mint.decimals;
    [target] = await findAssociatedTokenPda({ mint: splToken, owner: recipient, tokenProgram: mint.program });
  }
  const expected = toBaseUnits(amount, decimals);
  if (expected === null || expected <= 0n) return null;

  const sigs = await rpc("getSignaturesForAddress", [target, { limit: 15 }]);
  for (const { signature, blockTime, err } of sigs ?? []) {
    if (err || seen.has(signature)) continue;
    if (blockTime && blockTime * 1000 < createdAt - AMOUNT_MATCH_SLACK_MS) continue;
    const tx = await rpc("getTransaction", [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
    if (!tx) continue; // not served by this RPC yet: retry next poll
    seen.add(signature);
    if (!tx.meta || tx.meta.err) continue;
    let received = 0n;
    if (splToken) {
      const sum = (balances) =>
        (balances ?? [])
          .filter((b) => b.owner === recipient && b.mint === splToken)
          .reduce((total, b) => total + BigInt(b.uiTokenAmount.amount), 0n);
      received = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
    } else {
      const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey ?? k);
      const i = keys.indexOf(recipient);
      if (i >= 0) received = BigInt(tx.meta.postBalances[i]) - BigInt(tx.meta.preBalances[i]);
    }
    if (received === expected) return signature;
  }
  return null;
}
