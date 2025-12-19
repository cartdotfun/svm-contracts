/**
 * E2E Test: Solana Gateway Session → Base Settlement
 * 
 * This script tests the complete cross-chain flow:
 * 1. Register a gateway on Solana with provider EVM address
 * 2. Open a session with agent EVM address
 * 3. Record usage
 * 4. Settle session (emits SettlementProof event with real addresses)
 * 5. Relay settlement to Base (run relay service to verify)
 * 
 * Prerequisites:
 * - Solana CLI configured for devnet
 * - Wallet with devnet SOL
 * - Dependencies installed (npm install in sdk/)
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Wallet, BN } from "@coral-xyz/anchor"
import {
    GatewaySessionClient,
    deriveGatewayPda,
    deriveSessionPda,
    bytesToEvmAddress,
    sessionIdToHex,
    evmAddressToBytes
} from "../sdk/src/index"

// Configuration
const SOLANA_RPC = "https://api.devnet.solana.com"

// EVM addresses to use for testing
// Agent (buyer) = test wallet
const TEST_AGENT_EVM = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD20"
// Provider (seller) = YOUR wallet (will receive funds)
const TEST_PROVIDER_EVM = "0x14339ABF94Db70b7d29325C62e2209322C3A4de4"

async function main() {
    console.log("═══════════════════════════════════════════════════════════")
    console.log("      E2E Test: Solana Gateway Session → Base Settlement")
    console.log("═══════════════════════════════════════════════════════════\n")

    // Connect to Solana devnet
    const connection = new Connection(SOLANA_RPC, "confirmed")

    // Load wallet from Solana CLI config
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~"
    const keypairPath = `${homeDir}/.config/solana/id.json`

    console.log(`📁 Loading wallet from: ${keypairPath}`)
    const keypairData = await import("fs").then(fs =>
        JSON.parse(fs.readFileSync(keypairPath, "utf-8"))
    )
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData))
    const wallet = new Wallet(keypair)

    console.log(`💳 Wallet: ${wallet.publicKey.toBase58()}`)

    // Check balance
    const balance = await connection.getBalance(wallet.publicKey)
    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`)
    console.log(`🔗 Agent EVM: ${TEST_AGENT_EVM}`)
    console.log(`🔗 Provider EVM: ${TEST_PROVIDER_EVM}\n`)

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.error("❌ Insufficient balance. Need at least 0.1 SOL")
        process.exit(1)
    }

    // Convert EVM addresses to bytes
    const agentEvmBytes = evmAddressToBytes(TEST_AGENT_EVM)
    const providerEvmBytes = evmAddressToBytes(TEST_PROVIDER_EVM)

    // Create client
    const client = new GatewaySessionClient(connection, wallet)
    console.log(`📡 Program ID: ${client.program.programId.toBase58()}\n`)

    // Step 1: Register Gateway
    console.log("═══════════════════════════════════════════════════════════")
    console.log("Step 1: Register Gateway")
    console.log("═══════════════════════════════════════════════════════════")

    const testSlug = `test-gateway-${Date.now().toString(36)}`
    const pricePerRequest = new BN(1000) // 0.001 USDC in 6 decimals

    console.log(`   Slug: ${testSlug}`)
    console.log(`   Price: ${pricePerRequest.toString()} (atomic USDC)`)
    console.log(`   Provider EVM: ${TEST_PROVIDER_EVM}`)

    try {
        const registerTx = await client.registerGateway(testSlug, pricePerRequest, providerEvmBytes)
        console.log(`   ✅ Gateway registered! TX: ${registerTx}`)
        console.log(`   🔗 https://explorer.solana.com/tx/${registerTx}?cluster=devnet\n`)
    } catch (error: any) {
        if (error.message?.includes("already in use")) {
            console.log("   ⚠️ Gateway already exists, continuing...\n")
        } else {
            throw error
        }
    }

    // Verify gateway
    const gateway = await client.getGateway(testSlug)
    if (gateway) {
        console.log("   📋 Gateway Info:")
        console.log(`      Provider: ${gateway.provider.toBase58()}`)
        console.log(`      Provider EVM: ${bytesToEvmAddress(gateway.providerEvmAddress)}`)
        console.log(`      Price: ${gateway.pricePerRequest.toString()}`)
        console.log(`      Active: ${gateway.isActive}`)
        console.log(`      Total Sessions: ${gateway.totalSessions.toString()}\n`)
    }

    // Step 2: Open Session
    console.log("═══════════════════════════════════════════════════════════")
    console.log("Step 2: Open Session")
    console.log("═══════════════════════════════════════════════════════════")

    const estimatedDeposit = new BN(100000) // 0.1 USDC
    const durationSeconds = new BN(3600) // 1 hour

    console.log(`   Estimated Deposit: ${estimatedDeposit.toString()} (atomic USDC)`)
    console.log(`   Duration: ${durationSeconds.toString()} seconds`)
    console.log(`   Agent EVM: ${TEST_AGENT_EVM}`)

    const { tx: openTx, sessionPda, nonce } = await client.openSession(
        testSlug,
        estimatedDeposit,
        durationSeconds,
        agentEvmBytes
    )

    console.log(`   ✅ Session opened! TX: ${openTx}`)
    console.log(`   🔗 https://explorer.solana.com/tx/${openTx}?cluster=devnet`)
    console.log(`   📍 Session PDA: ${sessionPda.toBase58()}`)
    console.log(`   🔢 Nonce: ${nonce.toString()}\n`)

    // Verify session
    const session = await client.getSession(sessionPda)
    if (session) {
        console.log("   📋 Session Info:")
        console.log(`      Agent: ${session.agent.toBase58()}`)
        console.log(`      Agent EVM: ${bytesToEvmAddress(session.agentEvmAddress)}`)
        console.log(`      Gateway: ${session.gateway.toBase58()}`)
        console.log(`      Deposit: ${session.estimatedDeposit.toString()}`)
        console.log(`      Used: ${session.used.toString()}`)
        console.log(`      Expires: ${new Date(session.expiresAt.toNumber() * 1000).toISOString()}\n`)
    }

    // Step 3: Record Usage
    console.log("═══════════════════════════════════════════════════════════")
    console.log("Step 3: Record Usage")
    console.log("═══════════════════════════════════════════════════════════")

    const usageAmount = new BN(5000) // 0.005 USDC per request

    console.log(`   Recording ${usageAmount.toString()} (5 requests @ 1000 each)`)

    const usageTx = await client.recordUsage(sessionPda, testSlug, usageAmount)
    console.log(`   ✅ Usage recorded! TX: ${usageTx}`)
    console.log(`   🔗 https://explorer.solana.com/tx/${usageTx}?cluster=devnet\n`)

    // Verify updated session
    const updatedSession = await client.getSession(sessionPda)
    if (updatedSession) {
        console.log("   📋 Updated Session:")
        console.log(`      Used: ${updatedSession.used.toString()}`)
        console.log(`      Usage Count: ${updatedSession.usageCount}\n`)
    }

    // Step 4: Settle Session
    console.log("═══════════════════════════════════════════════════════════")
    console.log("Step 4: Settle Session (Emit SettlementProof)")
    console.log("═══════════════════════════════════════════════════════════")

    // Set up event listener before settling
    let settlementProofReceived = false
    const listenerId = client.onSettlementProof((proof, signature) => {
        console.log("\n   🎉 SettlementProof Event Received!")
        console.log(`      Session ID: ${sessionIdToHex(proof.sessionId)}`)
        console.log(`      Agent EVM: ${bytesToEvmAddress(proof.agentEvmAddress)}`)
        console.log(`      Provider EVM: ${bytesToEvmAddress(proof.providerEvmAddress)}`)
        console.log(`      Used Amount: ${proof.usedAmount.toString()}`)
        console.log(`      Timestamp: ${new Date(proof.timestamp.toNumber() * 1000).toISOString()}`)
        console.log(`      Signature: ${signature}`)
        settlementProofReceived = true
    })

    console.log("   📡 Listening for SettlementProof events...")

    const settleTx = await client.settleSession(sessionPda, testSlug)
    console.log(`   ✅ Session settled! TX: ${settleTx}`)
    console.log(`   🔗 https://explorer.solana.com/tx/${settleTx}?cluster=devnet`)

    // Wait a bit for the event
    await new Promise(resolve => setTimeout(resolve, 5000))

    if (!settlementProofReceived) {
        console.log("\n   ⚠️ SettlementProof event not received (relay will pick it up)")
    }

    // Clean up listener
    client.removeEventListener(listenerId)

    // Verify final session state
    const finalSession = await client.getSession(sessionPda)
    if (finalSession) {
        console.log("\n   📋 Final Session State:")
        console.log(`      State: ${JSON.stringify(finalSession.state)}`)
        console.log(`      Total Used: ${finalSession.used.toString()}`)
    }

    // Summary
    console.log("\n═══════════════════════════════════════════════════════════")
    console.log("                        TEST COMPLETE")
    console.log("═══════════════════════════════════════════════════════════")
    console.log("\n📋 Summary:")
    console.log(`   Gateway: ${testSlug}`)
    console.log(`   Session PDA: ${sessionPda.toBase58()}`)
    console.log(`   Agent EVM: ${TEST_AGENT_EVM}`)
    console.log(`   Provider EVM: ${TEST_PROVIDER_EVM}`)
    console.log(`   Total Usage: ${finalSession?.used.toString() || "N/A"}`)

    console.log("\n🔄 Next Steps:")
    console.log("   1. The relay service will pick up the SettlementProof event")
    console.log("   2. It will call TrustEngine.settleFromSolana() on Base")
    console.log("   3. Verify settlement on Base Sepolia TrustEngine:")
    console.log("      https://sepolia.basescan.org/address/0xd3f28DCf8Bc874eCe06a5a86C1b0DE52D4E602b2")

    console.log("\n✅ E2E Test completed successfully!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Test failed:", error)
        process.exit(1)
    })
