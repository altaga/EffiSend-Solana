import dotenv from "dotenv";
dotenv.config();

const JUP_API_KEY = process.env.JUPYTER_SWAP_API_KEY;
const JUP_BASE_URL = "https://api.jup.ag/swap/v2";

const normalizeMint = (mint) => {
    if (mint === "So11111111111111111111111111111111111111111") {
        console.log(`[DEBUG] [JUPITER-UTIL] Correcting SOL mint typo: ...1 -> ...2`);
        return "So11111111111111111111111111111111111111112";
    }
    return mint;
};

export const getJupiterOrder = async (params) => {
    // Correct common Solana mint typos in parameters
    if (params.inputMint) params.inputMint = normalizeMint(params.inputMint);
    if (params.outputMint) params.outputMint = normalizeMint(params.outputMint);

    const orderParams = new URLSearchParams(params);
    
    const headers = {};
    if (JUP_API_KEY) {
        headers["x-api-key"] = JUP_API_KEY;
    }

    console.log(`[DEBUG] [JUPITER-UTIL] Requesting /order: ${JUP_BASE_URL}/order?${orderParams.toString()}`);
    const response = await fetch(`${JUP_BASE_URL}/order?${orderParams.toString()}`, {
        headers
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ERROR] [JUPITER-UTIL] /order failed: ${response.status}`, errorText);
        throw new Error(`/order failed: ${response.status} ${errorText}`);
    }

    return await response.json();
};

export const executeJupiterSwap = async (signedTransaction, requestId) => {
    const headers = { "Content-Type": "application/json" };
    if (JUP_API_KEY) {
        headers["x-api-key"] = JUP_API_KEY;
    }

    console.log(`[DEBUG] [JUPITER-UTIL] Executing transaction via /execute...`);
    const response = await fetch(`${JUP_BASE_URL}/execute`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            signedTransaction,
            requestId,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ERROR] [JUPITER-UTIL] /execute failed: ${response.status}`, errorText);
        throw new Error(`/execute failed: ${response.status} ${errorText}`);
    }

    return await response.json();
};

// Classic Jupiter swap (quote + swap), where the wallet pays its own network fee.
// Fallback for when /order returns no transaction — e.g. a wallet without SOL for
// fees makes /order go gasless, which Jupiter only allows from $5 ("Minimum $5 for
// gasless"). Returns the unsigned transaction (base64) and its expiry height.
const JUP_CLASSIC_URL = "https://api.jup.ag/swap/v1";

export const getJupiterClassicSwap = async ({ inputMint, outputMint, amount, userPublicKey }) => {
    const headers = { "Content-Type": "application/json" };
    if (JUP_API_KEY) {
        headers["x-api-key"] = JUP_API_KEY;
    }
    const quoteParams = new URLSearchParams({
        inputMint: normalizeMint(inputMint),
        outputMint: normalizeMint(outputMint),
        amount,
        slippageBps: "50",
    });
    console.log(`[DEBUG] [JUPITER-UTIL] Classic /quote: ${quoteParams.toString()}`);
    const quoteRes = await fetch(`${JUP_CLASSIC_URL}/quote?${quoteParams.toString()}`, { headers });
    if (!quoteRes.ok) {
        const errorText = await quoteRes.text();
        throw new Error(`/quote failed: ${quoteRes.status} ${errorText}`);
    }
    const quoteResponse = await quoteRes.json();

    const swapRes = await fetch(`${JUP_CLASSIC_URL}/swap`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            quoteResponse,
            userPublicKey,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: "auto",
        }),
    });
    if (!swapRes.ok) {
        const errorText = await swapRes.text();
        throw new Error(`/swap failed: ${swapRes.status} ${errorText}`);
    }
    const swap = await swapRes.json();
    if (!swap.swapTransaction) throw new Error("No transaction in /swap response");
    console.log(`[DEBUG] [JUPITER-UTIL] Classic swap built: in=${quoteResponse.inAmount} out=${quoteResponse.outAmount}`);
    return { transaction: swap.swapTransaction, lastValidBlockHeight: swap.lastValidBlockHeight };
};
