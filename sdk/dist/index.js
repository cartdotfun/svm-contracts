"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  GatewaySessionClient: () => GatewaySessionClient,
  PROGRAM_ID: () => PROGRAM_ID,
  bytesToEvmAddress: () => bytesToEvmAddress,
  deriveGatewayPda: () => deriveGatewayPda,
  deriveSessionPda: () => deriveSessionPda,
  evmAddressToBytes: () => evmAddressToBytes,
  sessionIdToHex: () => sessionIdToHex
});
module.exports = __toCommonJS(index_exports);
var import_web3 = require("@solana/web3.js");
var import_anchor = require("@coral-xyz/anchor");

// src/idl.json
var idl_default = {
  address: "GfZc1CEda7wT5TgArqf3uyMD1iLiTz2zxc6M5wyEey1g",
  metadata: {
    name: "gateway_session_solana",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor"
  },
  instructions: [
    {
      name: "cancel_session",
      discriminator: [
        57,
        207,
        155,
        166,
        136,
        32,
        99,
        116
      ],
      accounts: [
        {
          name: "session",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "session.agent",
                account: "Session"
              },
              {
                kind: "account",
                path: "session.gateway",
                account: "Session"
              },
              {
                kind: "account",
                path: "session.created_at",
                account: "Session"
              }
            ]
          }
        },
        {
          name: "agent",
          signer: true
        }
      ],
      args: []
    },
    {
      name: "deactivate_gateway",
      discriminator: [
        2,
        119,
        77,
        158,
        3,
        8,
        116,
        252
      ],
      accounts: [
        {
          name: "gateway",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                kind: "account",
                path: "gateway.slug",
                account: "Gateway"
              }
            ]
          }
        },
        {
          name: "provider",
          signer: true,
          relations: [
            "gateway"
          ]
        }
      ],
      args: []
    },
    {
      name: "open_session",
      discriminator: [
        130,
        54,
        124,
        7,
        236,
        20,
        104,
        104
      ],
      accounts: [
        {
          name: "session",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "agent"
              },
              {
                kind: "account",
                path: "gateway"
              },
              {
                kind: "arg",
                path: "nonce"
              }
            ]
          }
        },
        {
          name: "gateway",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                kind: "account",
                path: "gateway.slug",
                account: "Gateway"
              }
            ]
          }
        },
        {
          name: "agent",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "estimated_deposit",
          type: "u64"
        },
        {
          name: "duration_seconds",
          type: "i64"
        },
        {
          name: "nonce",
          type: "i64"
        },
        {
          name: "agent_evm_address",
          type: {
            array: [
              "u8",
              20
            ]
          }
        }
      ]
    },
    {
      name: "record_usage",
      docs: [
        "Record usage - hot path for MagicBlock ER delegation"
      ],
      discriminator: [
        185,
        5,
        42,
        72,
        185,
        187,
        202,
        147
      ],
      accounts: [
        {
          name: "session",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "session.agent",
                account: "Session"
              },
              {
                kind: "account",
                path: "session.gateway",
                account: "Session"
              },
              {
                kind: "account",
                path: "session.created_at",
                account: "Session"
              }
            ]
          }
        },
        {
          name: "gateway",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                kind: "account",
                path: "gateway.slug",
                account: "Gateway"
              }
            ]
          }
        },
        {
          name: "provider",
          signer: true
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "register_gateway",
      discriminator: [
        183,
        184,
        135,
        228,
        71,
        191,
        76,
        222
      ],
      accounts: [
        {
          name: "gateway",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                kind: "arg",
                path: "slug"
              }
            ]
          }
        },
        {
          name: "provider",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "slug",
          type: "string"
        },
        {
          name: "price_per_request",
          type: "u64"
        },
        {
          name: "provider_evm_address",
          type: {
            array: [
              "u8",
              20
            ]
          }
        }
      ]
    },
    {
      name: "settle_session",
      discriminator: [
        156,
        20,
        180,
        117,
        117,
        85,
        225,
        128
      ],
      accounts: [
        {
          name: "session",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "session.agent",
                account: "Session"
              },
              {
                kind: "account",
                path: "session.gateway",
                account: "Session"
              },
              {
                kind: "account",
                path: "session.created_at",
                account: "Session"
              }
            ]
          }
        },
        {
          name: "gateway",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                kind: "account",
                path: "gateway.slug",
                account: "Gateway"
              }
            ]
          }
        },
        {
          name: "settler",
          signer: true
        }
      ],
      args: []
    },
    {
      name: "update_gateway_price",
      discriminator: [
        76,
        253,
        154,
        98,
        207,
        247,
        210,
        247
      ],
      accounts: [
        {
          name: "gateway",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  103,
                  97,
                  116,
                  101,
                  119,
                  97,
                  121
                ]
              },
              {
                kind: "account",
                path: "gateway.slug",
                account: "Gateway"
              }
            ]
          }
        },
        {
          name: "provider",
          signer: true,
          relations: [
            "gateway"
          ]
        }
      ],
      args: [
        {
          name: "new_price",
          type: "u64"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "Gateway",
      discriminator: [
        210,
        132,
        162,
        254,
        10,
        224,
        45,
        86
      ]
    },
    {
      name: "Session",
      discriminator: [
        243,
        81,
        72,
        115,
        214,
        188,
        72,
        144
      ]
    }
  ],
  events: [
    {
      name: "SettlementProof",
      discriminator: [
        21,
        227,
        89,
        197,
        51,
        200,
        44,
        221
      ]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "EmptySlug",
      msg: "Gateway slug cannot be empty"
    },
    {
      code: 6001,
      name: "SlugTooLong",
      msg: "Gateway slug too long (max 32 characters)"
    },
    {
      code: 6002,
      name: "GatewayNotActive",
      msg: "Gateway not found or inactive"
    },
    {
      code: 6003,
      name: "InvalidPrice",
      msg: "Price must be greater than 0"
    },
    {
      code: 6004,
      name: "Unauthorized",
      msg: "Not authorized to perform this action"
    },
    {
      code: 6005,
      name: "SessionNotActive",
      msg: "Session is not active"
    },
    {
      code: 6006,
      name: "SessionExpired",
      msg: "Session has expired"
    },
    {
      code: 6007,
      name: "UsageExceedsDeposit",
      msg: "Usage amount exceeds estimated deposit"
    },
    {
      code: 6008,
      name: "CannotCancelWithUsage",
      msg: "Cannot cancel session with recorded usage"
    },
    {
      code: 6009,
      name: "InvalidDuration",
      msg: "Duration must be greater than 0"
    },
    {
      code: 6010,
      name: "InvalidDeposit",
      msg: "Deposit must be greater than 0"
    }
  ],
  types: [
    {
      name: "Gateway",
      docs: [
        "Gateway account - registered API providers"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "slug",
            type: "string"
          },
          {
            name: "provider",
            type: "pubkey"
          },
          {
            name: "provider_evm_address",
            type: {
              array: [
                "u8",
                20
              ]
            }
          },
          {
            name: "price_per_request",
            type: "u64"
          },
          {
            name: "is_active",
            type: "bool"
          },
          {
            name: "total_sessions",
            type: "u64"
          },
          {
            name: "total_volume",
            type: "u64"
          },
          {
            name: "created_at",
            type: "i64"
          },
          {
            name: "bump",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "Session",
      docs: [
        "Session account - tracks API usage for an agent"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "agent",
            type: "pubkey"
          },
          {
            name: "agent_evm_address",
            type: {
              array: [
                "u8",
                20
              ]
            }
          },
          {
            name: "gateway",
            type: "pubkey"
          },
          {
            name: "provider",
            type: "pubkey"
          },
          {
            name: "estimated_deposit",
            type: "u64"
          },
          {
            name: "used",
            type: "u64"
          },
          {
            name: "created_at",
            type: "i64"
          },
          {
            name: "expires_at",
            type: "i64"
          },
          {
            name: "state",
            type: {
              defined: {
                name: "SessionState"
              }
            }
          },
          {
            name: "usage_count",
            type: "u32"
          },
          {
            name: "bump",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "SessionState",
      docs: [
        "Session state enum"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "None"
          },
          {
            name: "Active"
          },
          {
            name: "Settled"
          },
          {
            name: "Cancelled"
          },
          {
            name: "Expired"
          }
        ]
      }
    },
    {
      name: "SettlementProof",
      docs: [
        "Settlement proof emitted for LayerZero cross-chain messaging"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "session_id",
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "agent_evm_address",
            type: {
              array: [
                "u8",
                20
              ]
            }
          },
          {
            name: "provider_evm_address",
            type: {
              array: [
                "u8",
                20
              ]
            }
          },
          {
            name: "used_amount",
            type: "u64"
          },
          {
            name: "timestamp",
            type: "i64"
          }
        ]
      }
    }
  ]
};

// src/index.ts
var PROGRAM_ID = new import_web3.PublicKey(idl_default.address);
function deriveGatewayPda(slug) {
  return import_web3.PublicKey.findProgramAddressSync(
    [Buffer.from("gateway"), Buffer.from(slug)],
    PROGRAM_ID
  );
}
function deriveSessionPda(agent, gateway, nonce) {
  return import_web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("session"),
      agent.toBuffer(),
      gateway.toBuffer(),
      nonce.toArrayLike(Buffer, "le", 8)
    ],
    PROGRAM_ID
  );
}
var GatewaySessionClient = class {
  program;
  connection;
  provider;
  constructor(connection, wallet) {
    this.connection = connection;
    this.provider = new import_anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed"
    });
    (0, import_anchor.setProvider)(this.provider);
    this.program = new import_anchor.Program(idl_default, this.provider);
  }
  // Gateway Operations
  // -------------------------------------------------------------------------
  async registerGateway(slug, pricePerRequest, providerEvmAddress) {
    const [gatewayPda] = deriveGatewayPda(slug);
    const tx = await this.program.methods.registerGateway(slug, pricePerRequest, providerEvmAddress).accounts({
      gateway: gatewayPda,
      provider: this.provider.wallet.publicKey,
      systemProgram: new import_web3.PublicKey("11111111111111111111111111111111")
    }).rpc();
    return tx;
  }
  async updateGatewayPrice(slug, newPrice) {
    const [gatewayPda] = deriveGatewayPda(slug);
    const tx = await this.program.methods.updateGatewayPrice(newPrice).accounts({
      gateway: gatewayPda,
      provider: this.provider.wallet.publicKey
    }).rpc();
    return tx;
  }
  async deactivateGateway(slug) {
    const [gatewayPda] = deriveGatewayPda(slug);
    const tx = await this.program.methods.deactivateGateway().accounts({
      gateway: gatewayPda,
      provider: this.provider.wallet.publicKey
    }).rpc();
    return tx;
  }
  async getGateway(slug) {
    const [gatewayPda] = deriveGatewayPda(slug);
    try {
      const account = await this.program.account.gateway.fetch(gatewayPda);
      return account;
    } catch {
      return null;
    }
  }
  // Session Operations
  // -------------------------------------------------------------------------
  async openSession(gatewaySlug, estimatedDeposit, durationSeconds, agentEvmAddress, nonce) {
    const sessionNonce = nonce ?? new import_anchor.BN(Date.now());
    const [gatewayPda] = deriveGatewayPda(gatewaySlug);
    const [sessionPda] = deriveSessionPda(
      this.provider.wallet.publicKey,
      gatewayPda,
      sessionNonce
    );
    const tx = await this.program.methods.openSession(estimatedDeposit, durationSeconds, sessionNonce, agentEvmAddress).accounts({
      session: sessionPda,
      gateway: gatewayPda,
      agent: this.provider.wallet.publicKey,
      systemProgram: new import_web3.PublicKey("11111111111111111111111111111111")
    }).rpc();
    return { tx, sessionPda, nonce: sessionNonce };
  }
  async recordUsage(sessionPda, gatewaySlug, amount) {
    const [gatewayPda] = deriveGatewayPda(gatewaySlug);
    const tx = await this.program.methods.recordUsage(amount).accounts({
      session: sessionPda,
      gateway: gatewayPda,
      provider: this.provider.wallet.publicKey
    }).rpc();
    return tx;
  }
  async settleSession(sessionPda, gatewaySlug) {
    const [gatewayPda] = deriveGatewayPda(gatewaySlug);
    const tx = await this.program.methods.settleSession().accounts({
      session: sessionPda,
      gateway: gatewayPda,
      settler: this.provider.wallet.publicKey
    }).rpc();
    return tx;
  }
  async cancelSession(sessionPda) {
    const tx = await this.program.methods.cancelSession().accounts({
      session: sessionPda,
      agent: this.provider.wallet.publicKey
    }).rpc();
    return tx;
  }
  async getSession(sessionPda) {
    try {
      const account = await this.program.account.session.fetch(sessionPda);
      return account;
    } catch {
      return null;
    }
  }
  // Event Subscription
  // -------------------------------------------------------------------------
  onSettlementProof(callback) {
    return this.program.addEventListener("SettlementProof", (event, slot, signature) => {
      callback(event, signature);
    });
  }
  removeEventListener(listenerId) {
    this.program.removeEventListener(listenerId);
  }
};
function evmAddressToBytes(address) {
  const hex = address.startsWith("0x") ? address.slice(2) : address;
  const bytes = [];
  for (let i = 0; i < 40; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
}
function bytesToEvmAddress(bytes) {
  return "0x" + bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sessionIdToHex(sessionId) {
  return "0x" + sessionId.map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GatewaySessionClient,
  PROGRAM_ID,
  bytesToEvmAddress,
  deriveGatewayPda,
  deriveSessionPda,
  evmAddressToBytes,
  sessionIdToHex
});
