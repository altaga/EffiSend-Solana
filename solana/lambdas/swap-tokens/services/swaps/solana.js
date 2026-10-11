import { 
    createKeyPairSignerFromBytes,
    getBase64Decoder,
    getBase64Encoder,
    getTransactionDecoder,
    getTransactionEncoder,
    partiallySignTransaction
} from '@solana/kit';
import bs58 from 'bs58';
import { getJupiterOrder, executeJupiterSwap, getJupiterClassicSwap } from '../../utils/jupiter.js';

export const handleSolanaSwap = async ({ accountData, chainConfig, fromTokenInfo, toTokenInfo, amount, to }) => {
    console.log(`[DEBUG] [SOLANA-SERVICE] Starting Solana swap...`);

    // Support both nested (TDC standard) and flat structures
    const privateKeyString = accountData.solana?.privateKey || accountData.privateKey;

    if (!privateKeyString) {
        throw new Error("Solana private key is missing from account data");
    }

    let privateKeyBytes;
    try {
        console.log(`[DEBUG] [SOLANA-SERVICE] Decoding private key...`);
        privateKeyBytes = bs58.decode(privateKeyString);
    } catch (e) {
        console.error(`[ERROR] [SOLANA-SERVICE] Invalid private key format:`, e);
        throw new Error("Invalid Solana private key format");
    }
    
    const signer = await createKeyPairSignerFromBytes(privateKeyBytes);
    console.log(`[DEBUG] [SOLANA-SERVICE] Signer address: ${signer.address}`);

    const amountInBaseUnits = Math.floor(amount * Math.pow(10, fromTokenInfo.decimals)).toString();
    
    const orderParams = {
        inputMint: fromTokenInfo.address,
        outputMint: toTokenInfo.address,
        amount: amountInBaseUnits,
        taker: signer.address,
    };

    if (to && to.trim() !== "" && to !== signer.address) {
        console.warn(`[WARN] [SOLANA-SERVICE] 'receiver' parameter detected (${to}). JupiterZ (RFQ) routing is disabled for this swap.`);
        orderParams.receiver = to;
    }

    const order = await getJupiterOrder(orderParams);
    
    if (!order.transaction) {
        console.error(`[ERROR] [SOLANA-SERVICE] No transaction in /order response. Code: ${order.errorCode || 'None'}`);
        // Nothing was signed or sent, so a second route can't double-swap. The classic
        // route has the wallet pay its own fee: it covers what /order refuses, like
        // swaps under Jupiter's $5 gasless minimum. It pays out to the signer only.
        if (orderParams.receiver) {
            throw new Error(order.errorMessage || "No transaction in /order response");
        }
        console.log(`[DEBUG] [SOLANA-SERVICE] /order refused (${order.errorMessage}); trying the classic route...`);
        return classicSwap({ signer, chainConfig, orderParams });
    }

    console.log(`[DEBUG] [SOLANA-SERVICE] Order received (requestId: ${order.requestId}). Mode: ${order.mode}, Router: ${order.router}`);

    const base64Decoder = getBase64Decoder();
    const base64Encoder = getBase64Encoder();
    
    // In @solana/kit, an Encoder converts T to Uint8Array, and Decoder converts Uint8Array to T.
    // So getBase64Encoder() converts a Base64 string into a Uint8Array.
    // getBase64Decoder() converts a Uint8Array into a Base64 string.
    const transactionBytes = base64Encoder.encode(order.transaction);
    console.log(`[DEBUG] [SOLANA-SERVICE] Transaction decoded to bytes. Length: ${transactionBytes.length}`);

    let transaction;
    try {
        transaction = getTransactionDecoder().decode(transactionBytes);
        console.log(`[DEBUG] [SOLANA-SERVICE] Transaction object parsed successfully.`);
    } catch (decodeErr) {
        console.error(`[ERROR] [SOLANA-SERVICE] getTransactionDecoder failed:`, decodeErr);
        // Fallback or more detail
        throw new Error(`Failed to decode Solana transaction: ${decodeErr.message}`);
    }

    
    const signedTransaction = await partiallySignTransaction(
        [signer.keyPair],
        transaction,
    );

    const signedTxBytes = getTransactionEncoder().encode(signedTransaction);
    const signedTxBase64 = base64Decoder.decode(signedTxBytes);

    const result = await executeJupiterSwap(signedTxBase64, order.requestId);

    if (result.status === "Failed") {
        console.error(`[ERROR] [SOLANA-SERVICE] Swap failed:`, result);
        throw new Error(`Swap execution failed (Code ${result.code}): ${result.error || 'Unknown Error'}`);
    }

    console.log(`[DEBUG] [SOLANA-SERVICE] Swap successful! TXID: ${result.signature}`);

    if (result.inputAmountResult && result.outputAmountResult) {
        console.log(`[DEBUG] [SOLANA-SERVICE] Tokens Sent: ${result.inputAmountResult} | Tokens Received: ${result.outputAmountResult}`);
    }

    return result.signature;
};
// ---- Classic route: /quote + /swap, signed here, sent through our own RPCs. ----

async function rpcCall(url, method, params, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
            signal: controller.signal,
        });
        const out = await res.json();
        if (out.error) {
            const detail = out.error.data?.err ? ` (${JSON.stringify(out.error.data.err)})` : "";
            const error = new Error(`${out.error.message || "RPC error"}${detail}`);
            error.rpcError = true; // the node answered: the transaction itself was rejected
            throw error;
        }
        if (out.result === undefined) throw new Error(`HTTP ${res.status}`);
        return out.result;
    } finally {
        clearTimeout(timer);
    }
}

/** First RPC that answers `method`; rejections by a node (rpcError) are final. */
async function firstAnswer(rpcs, method, params) {
    let lastError;
    for (const url of rpcs) {
        try {
            return await rpcCall(url, method, params);
        } catch (error) {
            if (error.rpcError && method === "sendTransaction") throw error;
            lastError = error;
        }
    }
    throw lastError || new Error("no Solana RPC");
}

async function classicSwap({ signer, chainConfig, orderParams }) {
    const { transaction: txBase64, lastValidBlockHeight } = await getJupiterClassicSwap({
        inputMint: orderParams.inputMint,
        outputMint: orderParams.outputMint,
        amount: orderParams.amount,
        userPublicKey: signer.address,
    });
    const transaction = getTransactionDecoder().decode(getBase64Encoder().encode(txBase64));
    const signed = await partiallySignTransaction([signer.keyPair], transaction);
    const signedBase64 = getBase64Decoder().decode(getTransactionEncoder().encode(signed));

    // The same signed transaction always has the same signature, so handing it to a
    // second RPC after a network error can never execute it twice.
    const rpcs = chainConfig.rpcs;
    let signature;
    try {
        signature = await firstAnswer(rpcs, "sendTransaction", [
            signedBase64,
            { encoding: "base64", preflightCommitment: "confirmed", maxRetries: 5 },
        ]);
    } catch (error) {
        if (/insufficient|AccountNotFound|prior credit|custom program error: 0x1\b/i.test(error.message)) {
            throw new Error("Not enough SOL for this swap's network fee (and the new token account's rent, if any)");
        }
        throw new Error(`Swap rejected: ${error.message}`);
    }
    console.log(`[DEBUG] [SOLANA-SERVICE] Classic swap sent: ${signature}. Confirming...`);

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
            const statuses = await firstAnswer(rpcs, "getSignatureStatuses", [[signature], { searchTransactionHistory: false }]);
            const status = statuses?.value?.[0];
            if (status?.err) throw new Error(`Swap failed on-chain: ${JSON.stringify(status.err)}`);
            if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) {
                console.log(`[DEBUG] [SOLANA-SERVICE] Classic swap confirmed: ${signature}`);
                return signature;
            }
            if (lastValidBlockHeight && !status) {
                const height = await firstAnswer(rpcs, "getBlockHeight", [{ commitment: "confirmed" }]);
                if (height > lastValidBlockHeight) throw new Error("Swap expired before landing (blockhash expired); nothing was spent");
            }
        } catch (error) {
            if (/on-chain|expired/.test(error.message)) throw error;
            // RPC hiccup: keep polling
        }
    }
    throw new Error(`Swap sent but not confirmed within 60 s: ${signature}`);
}
