# Cart Protocol - SVM Contracts

Solana programs for Cart Protocol's M2M commerce infrastructure.

## Programs

| Program | Description |
|---------|-------------|
| **gateway-session-solana** | Payment sessions for API monetization on Solana |

## Quick Start

```bash
# Install dependencies
yarn install

# Build programs
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## SDK

The `sdk/` folder contains TypeScript bindings for interacting with the programs:

```typescript
import { GatewaySessionClient } from "./sdk";

const client = new GatewaySessionClient(connection, wallet);
await client.openSession(gatewaySlug, deposit, duration);
```

## Cross-Chain Settlement

This program supports cross-chain settlement to EVM chains via the `SettlementProof` event. See the settlement relay documentation for integration details.

## License

MIT
