# EffiSend — Agentic Multichain Payments for High-Traffic Venues

<img src="./images/header.png" style="width: 600px;" />

> A mobile-first crypto wallet and AI concierge that lets anyone receive, swap, bridge, and spend digital assets across 5 blockchains — verified by face, secured by PIN, guided by an AI agent that speaks your language.

**Platform:** Solana Seeker  
**Channel:** Solana dApp Store  
**Primary Network:** Solana  
**Full Multichain:** Solana · Base · Monad · Hedera · Starknet  
**Stack:** Expo 54 · React Native · `@solana/kit` · Metaplex · Jupiter API · Starknet.js · Ethers.js

---

## The Problem

Crypto payments at high-traffic real-world venues are broken. You have tokens across multiple chains, no idea which account has enough balance, and no fast way to prove who you are without hardware wallets or browser extensions. The cashier is waiting. The queue is growing. The moment is gone.

<img src="./images/problem.jpg" style="width: 600px;" />

> **EffiSend was built for Tokyo Dome City — but the architecture is designed for any high-traffic, real-world venue where speed, identity, and multichain liquidity intersect.**

Football stadiums, concert halls, theme parks, transit hubs — anywhere tens of thousands of people need to transact quickly and trustlessly.

---

## How It Works — The Big Picture

EffiSend's architecture is divided into three core pillars that work in harmony to provide a seamless venue experience.

### 1. Wallet Services (Identity & Assets)
The foundation of EffiSend is a biometric-first, non-custodial wallet that abstracts away seed phrases and complex setups.

<img src="./Images/s4.png" width=32% /> <img src="./Images/s5.png" width=32% /> <img src="./Images/s6.png" width=32% />

### Wallet Services Diagram:

```mermaid
graph TD
    User((User)) -->|Face Scan| FaceID[Biometric Identity Layer]
    FaceID -->|On-the-fly| Onboard[Deterministic Wallet Creation]
    Onboard --> Wallet[Multichain Hub]
    
    Wallet --> SOL[Solana<br/>SOL · USDC · USDT · BONK · JUP]
    Wallet --> EVM[EVM / L2<br/>Base · Monad]
    Wallet --> Others[Starknet · Hedera]
```

### 2. Information Services (Venue Ecosystem)
EffiSend provides deep, real-time data for high-traffic physical venues, ensuring users have everything they need at their fingertips.

<img src="./Images/s1.png" width=32% /> <img src="./Images/s2.png" width=32% /> <img src="./Images/s3.png" width=32% />

### Information Services Diagram:

```mermaid
graph LR
    VH[Venue Hub] --> AM[Amenities & Facilities]
    VH --> EV[Event Schedules]
    VH --> MP[Interactive Map]
```

*   **Amenities & Events** — A comprehensive directory of venue facilities (restaurants, security, first aid) and dynamic event schedules.
*   **Interactive Map** — High-performance vector mapping with location-aware navigation to points of interest.

### 3. Agent Services (Intelligence & Execution)
DeSmond, the AI Concierge, translates natural language into complex venue and blockchain operations, acting as a single interface for all user needs.

<img src="./Images/s7.png" width=32% /> <img src="./Images/s8.png" width=32% /> <img src="./Images/s9.png" width=32% />

### Agent Services Diagram:

```mermaid
graph TD
    User((User)) -->|Natural Language| DeSmond[DeSmond AI Agent]
    
    DeSmond --> Info[Information Services]
    Info --> Amenities[Amenities]
    Info --> Events[Events]
    
    DeSmond --> Crypto[Crypto Services]
    Crypto --> Balances[Balances]
    Crypto --> Trans[Transfers]
    Crypto --> Swaps[Swaps]
    Crypto --> Bridges[Bridges]
    Crypto --> TopUp[Card Top-Ups]
```

---

## Solana — The Primary Settlement Layer

Solana is not a secondary integration. It is the **heart of EffiSend's architecture** — chosen for its sub-second finality, negligible fees, and rich composable ecosystem.

### SPL Token Support

EffiSend natively manages the following Solana mainnet assets:

| Token | Mint Address | Decimals |
|-------|-------------|----------|
| **SOL** | Native | 9 |
| **USDC** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | 6 |
| **USDT** | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` | 6 |
| **BONK** | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` | 5 |
| **JUP** | `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN` | 6 |
| **BTC (Wrapped)** | `3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh` | 8 |

### Institutional-Grade Infrastructure

EffiSend is built on the next-generation **@solana/kit** SDK, ensuring high-performance, parallelized token resolution without relying on centralized indexers. 

*   **100% Uptime Architecture** — The system maintains a redundant pool of RPC endpoints with silent, automatic failover. If one node lags, EffiSend switches instantly—the user never sees an error.
*   **Sub-Second Finality** — Leveraging Solana's speed to ensure that real-world payments at a cashier happen at the speed of tap-to-pay.

### Swaps — Jupiter on Solana

When DeSmond or a user executes a swap on Solana, the backend routes through **Jupiter** — the deepest liquidity aggregator on the SVM. Example interaction:

> *"Swap 50 USDC for SOL"* → DeSmond resolves the route → Jupiter finds the best path → transaction signed server-side → confirmation returned in natural language.

---

## Solana Mobile & Distribution Hub

EffiSend is optimized for the **Solana Seeker**, leveraging the world's most advanced web3 mobile hardware to bring agentic payments to the palm of your hand.

<img src="./Images/s10.png" width=32% /> <img src="./Images/s11.png" width=32% /> <img src="./Images/s12.png" width=32% />

*   **Solana dApp Store Distribution** — By launching on the Solana dApp Store, EffiSend bypasses traditional gatekeepers, reaching a global audience of crypto-native users with zero censorship and a web3-first experience.
*   **Seeker-Native Integration** — Designed to feel at home on the Solana Seeker, ensuring that face-to-face payments and AI-guided operations are fluid, fast, and hardware-secured.
*   **Mass Distribution Strategy** — Our presence in the Solana ecosystem acts as a multiplier, allowing EffiSend to scale across physical venues worldwide by tapping into the existing community of Solana mobile users.

---

## Biometric Identity — The Face Layer

This is the most important innovation in EffiSend. There are **no seed phrases**. There are **no browser extensions**. There are **no hardware wallets**. Your face is your key.

### Wallet Onboarding

```mermaid
sequenceDiagram
    participant U as User
    participant App as EffiSend App
    participant API as Backend API
    participant Chain as Blockchain

    U->>App: Initiates Wallet Onboarding (at any time)
    App->>U: Show face scan interface
    U->>App: Scans face (CamFace component)
    App->>API: POST /createOrFetchFace {image}
    API->>API: Extract face embedding vector
    API-->>App: Return unique face ID

    App->>API: POST /createOrFetchWallet {faceId}
    API->>API: Deterministic key derivation<br/>from face embedding
    API-->>App: Return wallet addresses\n(EVM · Solana · Starknet · Hedera)

    App->>U: Optional: Set 4-digit PIN
    App->>App: Store PIN as boolean flag only\n(never the digits)
    App->>Chain: Wallet is live on all 5 networks
```

- **Deterministic:** Same face → same wallet, every time. Account recovery is just a re-scan.
- **Non-custodial by design:** Keys are derived from the face embedding — the backend cannot arbitrarily generate them.
- **Hardware-Backed Security:** All sensitive data (including the biometric login flag) is stored in the device's **SecureStore** (encrypted on-device).
- **Brute-Force Protection:** A 3-attempt PIN lockout automatically resets the session, forcing a biometric re-scan to continue.

### The "Face-to-Pay" Experience
 
 This is where EffiSend's power becomes tangible. A merchant shows a USD amount; a customer pays in any token, on any chain, using only their face.
 
 ```mermaid
 sequenceDiagram
    participant M as Merchant Terminal
    participant C as Customer (FaceID)
    participant W as Multichain Wallet

    M->>C: Scan Customer Face
    C->>W: Instant Identity & Balance Resolution
    W->>M: Show eligible tokens across 5 chains
    C->>M: Selects Token (e.g. Solana USDC)
    W->>M: Transaction Signed & Confirmed
    M-->>C: Payment Success ✅
```

**The EffiSend Advantage:**
*   **Intelligent Liquidity Filtering** — Only tokens with sufficient balance are shown, eliminating payment failures.
*   **Parallel Execution** — All 5 blockchains are queried simultaneously; payment resolution happens in milliseconds.
*   **Zero-Touch Interaction** — The customer never touches the merchant's device; identity is verified purely through biometrics.
*   **Flexible Security** — Optional PIN layer for high-value transactions with built-in brute-force protection.

---

## DeSmond — AI Concierge for People and Payments

DeSmond is a proactive, **fully multilingual** AI agent embedded in EffiSend. It automatically detects your language and responds in kind while keeping proper nouns accurate. It covers two distinct domains through a single natural language interface.

```mermaid
graph LR
    User((User)) -->|Natural Language| D[DeSmond AI]

    D --> G[Venue Guide]
    G --> G1[Facilities & Navigation]
    G --> G2[Events & Schedules]
    G --> G3[Emergency Services]

    D --> C[Crypto Operations]
    C --> C1[Balance Queries<br/>across all 5 networks]
    C --> C2[Token Transfers<br/>Solana · EVM · Starknet]
    C --> C3[Swaps<br/>Jupiter on Solana]
    C --> C4[Cross-Chain Bridge<br/>Solana ↔ EVM ↔ Starknet]
    C --> C5[Card Top-Ups<br/>15+ destination networks]
    C --> C6[Starknet Staking<br/>WBTC delegation · rewards]
```

### Venue Guide Capabilities
- **Facility Discovery:** Find restaurants, pharmacies, ATMs, first aid within the venue
- **Event Scheduling:** Real-time schedules for concerts, games, seasonal events
- **Spatial Intelligence:** Walking distances between gates, nearest exits, station access
- **Emergency Access:** Instant location of security, lost & found, medical services

### Solana-Focused Crypto Examples

**Check your full Solana balance:**
> *"How much SOL and USDC do I have?"*  
> DeSmond reads your Solana wallet and returns all token balances in your language.

**Swap on Solana via Jupiter:**
> *"Swap 50 USDC for SOL"*  
> DeSmond routes through Jupiter, finds the optimal path, executes, and confirms.

**Bridge from Solana:**
> *"Bridge 100 USDC from Solana to Base"*  
> DeSmond calculates the bridge fee, selects LI.FI or LayerSwap, and executes — no UI navigation required.

**View your Solana NFTs:**
> *"Show me my NFTs on Solana"*  
> DeSmond resolves all Metaplex metadata from your wallet and describes your collection.

**Fund a card from Solana:**
> *"Top up my Kast card with 50 USDC from my Solana wallet"*  
> DeSmond validates the card alias, routes through the bridge if needed, and confirms the top-up.

> [!NOTE]
> DeSmond communicates exclusively in natural language — no code, no addresses, no chain selectors. It handles all technical routing internally and surfaces only what the user needs to confirm.

---

## NFT & Pass Gallery — Multichain Collectibles

The gallery aggregates digital assets from three chains into a single categorized view:

```mermaid
graph TD
    Gallery[Global NFT & Pass Gallery]

    Gallery --> SOL[Solana Assets]
    Gallery --> EVM[EVM / L2 Collectibles]
    Gallery --> HED[Hedera Ecosystem]

    SOL --> S1[Metaplex Direct Resolution]
    EVM --> M1[Multi-Contract Pass Support]
    HED --> H1[HTS Native Assets]
```

Each NFT card displays: chain badge, asset image, collection name, contract address. Tapping opens a full detail modal. Pull-to-refresh updates the gallery with a 30-second smart cooldown to minimize RPC load.

---

## Unified Liquidity Hub (Tab 4)

EffiSend's main dashboard provides a single source of truth for your multichain net worth, combining real-time pricing with deep liquidity management.

*   **Real-time USD Tracking** — Instant valuation of all SOL, SPL, and cross-chain tokens powered by the CoinGecko API.
*   **Intelligent Balance Polling** — 30-second auto-refresh ensures you always see accurate liquidity before making a payment.

### Crypto Card Management

Register and fund external crypto cards (Metamask, Kast, Bitrefill) directly from your Solana balance. The "Add Card" interface handles the heavy lifting:

1.  **Identity:** Give your card a unique alias.
2.  **Network Routing:** Select the destination network (Linea, Base, Solana, Monad, Starknet, and 10+ others).
3.  **Token Selection:** Choose your preferred funding stablecoin (USDC or USDT).
4.  **Network-Aware Validation:** The UI performs real-time address verification based on the selected chain (checksums for EVM, regex for Solana/Starknet) before allowing the card to be saved.

```mermaid
flowchart TD
    Input[User enters address] --> Net{Which network?}
    Net -->|EVM| EVM[Address Checksum]
    Net -->|Starknet| SK[validateAndParseAddress]
    Net -->|Solana| SOL2[isAddress @solana/kit]
    EVM --> Valid{Valid?}
    SK --> Valid
    SOL2 --> Valid
    Valid -->|Yes| Save[Encrypted Storage]
    Valid -->|No| Block[Block submission]
```

---

