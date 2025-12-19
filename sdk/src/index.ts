import { PublicKey, Connection, Keypair, TransactionSignature } from "@solana/web3.js"
import { Program, AnchorProvider, Wallet, BN, setProvider, Idl } from "@coral-xyz/anchor"
import idl from "./idl.json"

// Program ID from IDL
export const PROGRAM_ID = new PublicKey(idl.address)

// ============================================================================
// Types
// ============================================================================

export interface Gateway {
    slug: string
    provider: PublicKey
    providerEvmAddress: number[]
    pricePerRequest: BN
    isActive: boolean
    totalSessions: BN
    totalVolume: BN
    createdAt: BN
    bump: number
}

export interface Session {
    agent: PublicKey
    agentEvmAddress: number[]
    gateway: PublicKey
    provider: PublicKey
    estimatedDeposit: BN
    used: BN
    createdAt: BN
    expiresAt: BN
    state: SessionState
    usageCount: number
    bump: number
}

export type SessionState =
    | { none: Record<string, never> }
    | { active: Record<string, never> }
    | { settled: Record<string, never> }
    | { cancelled: Record<string, never> }
    | { expired: Record<string, never> }

export interface SettlementProof {
    sessionId: number[]
    agentEvmAddress: number[]
    providerEvmAddress: number[]
    usedAmount: BN
    timestamp: BN
}

// ============================================================================
// PDA Derivation
// ============================================================================

export function deriveGatewayPda(slug: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("gateway"), Buffer.from(slug)],
        PROGRAM_ID
    )
}

export function deriveSessionPda(
    agent: PublicKey,
    gateway: PublicKey,
    nonce: BN
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("session"),
            agent.toBuffer(),
            gateway.toBuffer(),
            nonce.toArrayLike(Buffer, "le", 8)
        ],
        PROGRAM_ID
    )
}

// ============================================================================
// Client
// ============================================================================

export class GatewaySessionClient {
    public program: Program
    public connection: Connection
    public provider: AnchorProvider

    constructor(connection: Connection, wallet: Wallet) {
        this.connection = connection
        this.provider = new AnchorProvider(connection, wallet, {
            commitment: "confirmed"
        })
        setProvider(this.provider)
        this.program = new Program(idl as Idl, this.provider)
    }

    // Gateway Operations
    // -------------------------------------------------------------------------

    async registerGateway(
        slug: string,
        pricePerRequest: BN,
        providerEvmAddress: number[]
    ): Promise<TransactionSignature> {
        const [gatewayPda] = deriveGatewayPda(slug)

        const tx = await this.program.methods
            .registerGateway(slug, pricePerRequest, providerEvmAddress)
            .accounts({
                gateway: gatewayPda,
                provider: this.provider.wallet.publicKey,
                systemProgram: new PublicKey("11111111111111111111111111111111")
            })
            .rpc()

        return tx
    }

    async updateGatewayPrice(
        slug: string,
        newPrice: BN
    ): Promise<TransactionSignature> {
        const [gatewayPda] = deriveGatewayPda(slug)

        const tx = await this.program.methods
            .updateGatewayPrice(newPrice)
            .accounts({
                gateway: gatewayPda,
                provider: this.provider.wallet.publicKey
            })
            .rpc()

        return tx
    }

    async deactivateGateway(slug: string): Promise<TransactionSignature> {
        const [gatewayPda] = deriveGatewayPda(slug)

        const tx = await this.program.methods
            .deactivateGateway()
            .accounts({
                gateway: gatewayPda,
                provider: this.provider.wallet.publicKey
            })
            .rpc()

        return tx
    }

    async getGateway(slug: string): Promise<Gateway | null> {
        const [gatewayPda] = deriveGatewayPda(slug)
        try {
            const account = await this.program.account.gateway.fetch(gatewayPda)
            return account as unknown as Gateway
        } catch {
            return null
        }
    }

    // Session Operations
    // -------------------------------------------------------------------------

    async openSession(
        gatewaySlug: string,
        estimatedDeposit: BN,
        durationSeconds: BN,
        agentEvmAddress: number[],
        nonce?: BN
    ): Promise<{ tx: TransactionSignature; sessionPda: PublicKey; nonce: BN }> {
        const sessionNonce = nonce ?? new BN(Date.now())
        const [gatewayPda] = deriveGatewayPda(gatewaySlug)
        const [sessionPda] = deriveSessionPda(
            this.provider.wallet.publicKey,
            gatewayPda,
            sessionNonce
        )

        const tx = await this.program.methods
            .openSession(estimatedDeposit, durationSeconds, sessionNonce, agentEvmAddress)
            .accounts({
                session: sessionPda,
                gateway: gatewayPda,
                agent: this.provider.wallet.publicKey,
                systemProgram: new PublicKey("11111111111111111111111111111111")
            })
            .rpc()

        return { tx, sessionPda, nonce: sessionNonce }
    }

    async recordUsage(
        sessionPda: PublicKey,
        gatewaySlug: string,
        amount: BN
    ): Promise<TransactionSignature> {
        const [gatewayPda] = deriveGatewayPda(gatewaySlug)

        const tx = await this.program.methods
            .recordUsage(amount)
            .accounts({
                session: sessionPda,
                gateway: gatewayPda,
                provider: this.provider.wallet.publicKey
            })
            .rpc()

        return tx
    }

    async settleSession(sessionPda: PublicKey, gatewaySlug: string): Promise<TransactionSignature> {
        const [gatewayPda] = deriveGatewayPda(gatewaySlug)

        const tx = await this.program.methods
            .settleSession()
            .accounts({
                session: sessionPda,
                gateway: gatewayPda,
                settler: this.provider.wallet.publicKey
            })
            .rpc()

        return tx
    }

    async cancelSession(sessionPda: PublicKey): Promise<TransactionSignature> {
        const tx = await this.program.methods
            .cancelSession()
            .accounts({
                session: sessionPda,
                agent: this.provider.wallet.publicKey
            })
            .rpc()

        return tx
    }

    async getSession(sessionPda: PublicKey): Promise<Session | null> {
        try {
            const account = await this.program.account.session.fetch(sessionPda)
            return account as unknown as Session
        } catch {
            return null
        }
    }

    // Event Subscription
    // -------------------------------------------------------------------------

    onSettlementProof(
        callback: (proof: SettlementProof, signature: string) => void
    ): number {
        return this.program.addEventListener("SettlementProof", (event, slot, signature) => {
            callback(event as unknown as SettlementProof, signature)
        })
    }

    removeEventListener(listenerId: number): void {
        this.program.removeEventListener(listenerId)
    }
}

// ============================================================================
// Utilities
// ============================================================================

export function evmAddressToBytes(address: string): number[] {
    const hex = address.startsWith("0x") ? address.slice(2) : address
    const bytes: number[] = []
    for (let i = 0; i < 40; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16))
    }
    return bytes
}

export function bytesToEvmAddress(bytes: number[]): string {
    return "0x" + bytes.map(b => b.toString(16).padStart(2, "0")).join("")
}

export function sessionIdToHex(sessionId: number[]): string {
    return "0x" + sessionId.map(b => b.toString(16).padStart(2, "0")).join("")
}
