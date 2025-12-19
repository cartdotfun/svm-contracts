use anchor_lang::prelude::*;

declare_id!("GfZc1CEda7wT5TgArqf3uyMD1iLiTz2zxc6M5wyEey1g");

// ============================================================================
// STATE
// ============================================================================

/// Session state enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum SessionState {
    #[default]
    None,
    Active,
    Settled,
    Cancelled,
    Expired,
}

/// Gateway account - registered API providers
#[account]
#[derive(Default)]
pub struct Gateway {
    pub slug: String,
    pub provider: Pubkey,
    pub provider_evm_address: [u8; 20],
    pub price_per_request: u64,
    pub is_active: bool,
    pub total_sessions: u64,
    pub total_volume: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl Gateway {
    pub const MAX_SLUG_LEN: usize = 32;
    pub const SPACE: usize = 8 + 4 + Self::MAX_SLUG_LEN + 32 + 20 + 8 + 1 + 8 + 8 + 8 + 1;
}

/// Session account - tracks API usage for an agent
#[account]
#[derive(Default)]
pub struct Session {
    pub agent: Pubkey,
    pub agent_evm_address: [u8; 20],
    pub gateway: Pubkey,
    pub provider: Pubkey,
    pub estimated_deposit: u64,
    pub used: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub state: SessionState,
    pub usage_count: u32,
    pub bump: u8,
}

impl Session {
    pub const SPACE: usize = 8 + 32 + 20 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 4 + 1;
}

/// Settlement proof emitted for LayerZero cross-chain messaging
#[event]
pub struct SettlementProof {
    pub session_id: [u8; 32],
    pub agent_evm_address: [u8; 20],
    pub provider_evm_address: [u8; 20],
    pub used_amount: u64,
    pub timestamp: i64,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum GatewaySessionError {
    #[msg("Gateway slug cannot be empty")]
    EmptySlug,
    #[msg("Gateway slug too long (max 32 characters)")]
    SlugTooLong,
    #[msg("Gateway not found or inactive")]
    GatewayNotActive,
    #[msg("Price must be greater than 0")]
    InvalidPrice,
    #[msg("Not authorized to perform this action")]
    Unauthorized,
    #[msg("Session is not active")]
    SessionNotActive,
    #[msg("Session has expired")]
    SessionExpired,
    #[msg("Usage amount exceeds estimated deposit")]
    UsageExceedsDeposit,
    #[msg("Cannot cancel session with recorded usage")]
    CannotCancelWithUsage,
    #[msg("Duration must be greater than 0")]
    InvalidDuration,
    #[msg("Deposit must be greater than 0")]
    InvalidDeposit,
}

// ============================================================================
// PROGRAM
// ============================================================================

#[program]
pub mod gateway_session_solana {
    use super::*;

    pub fn register_gateway(
        ctx: Context<RegisterGateway>,
        slug: String,
        price_per_request: u64,
        provider_evm_address: [u8; 20],
    ) -> Result<()> {
        require!(!slug.is_empty(), GatewaySessionError::EmptySlug);
        require!(slug.len() <= Gateway::MAX_SLUG_LEN, GatewaySessionError::SlugTooLong);
        require!(price_per_request > 0, GatewaySessionError::InvalidPrice);

        let gateway = &mut ctx.accounts.gateway;
        let clock = Clock::get()?;

        gateway.slug = slug.clone();
        gateway.provider = ctx.accounts.provider.key();
        gateway.provider_evm_address = provider_evm_address;
        gateway.price_per_request = price_per_request;
        gateway.is_active = true;
        gateway.total_sessions = 0;
        gateway.total_volume = 0;
        gateway.created_at = clock.unix_timestamp;
        gateway.bump = ctx.bumps.gateway;

        msg!("Gateway registered: {} with EVM: {:?}", slug, provider_evm_address);
        Ok(())
    }

    pub fn update_gateway_price(ctx: Context<UpdateGatewayPrice>, new_price: u64) -> Result<()> {
        require!(new_price > 0, GatewaySessionError::InvalidPrice);
        ctx.accounts.gateway.price_per_request = new_price;
        msg!("Gateway price updated to {}", new_price);
        Ok(())
    }

    pub fn deactivate_gateway(ctx: Context<DeactivateGateway>) -> Result<()> {
        ctx.accounts.gateway.is_active = false;
        msg!("Gateway deactivated");
        Ok(())
    }

    pub fn open_session(
        ctx: Context<OpenSession>,
        estimated_deposit: u64,
        duration_seconds: i64,
        nonce: i64,
        agent_evm_address: [u8; 20],
    ) -> Result<()> {
        require!(estimated_deposit > 0, GatewaySessionError::InvalidDeposit);
        require!(duration_seconds > 0, GatewaySessionError::InvalidDuration);

        let clock = Clock::get()?;
        let session = &mut ctx.accounts.session;
        let gateway = &mut ctx.accounts.gateway;

        session.agent = ctx.accounts.agent.key();
        session.agent_evm_address = agent_evm_address;
        session.gateway = gateway.key();
        session.provider = gateway.provider;
        session.estimated_deposit = estimated_deposit;
        session.used = 0;
        session.created_at = nonce; // Use nonce as session identifier
        session.expires_at = clock.unix_timestamp + duration_seconds;
        session.state = SessionState::Active;
        session.usage_count = 0;
        session.bump = ctx.bumps.session;

        gateway.total_sessions += 1;
        msg!("Session opened for agent EVM: {:?}", agent_evm_address);
        Ok(())
    }

    /// Record usage - hot path for MagicBlock ER delegation
    pub fn record_usage(ctx: Context<RecordUsage>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let session = &mut ctx.accounts.session;
        let gateway = &mut ctx.accounts.gateway;

        require!(clock.unix_timestamp < session.expires_at, GatewaySessionError::SessionExpired);
        require!(
            session.used.checked_add(amount).unwrap() <= session.estimated_deposit,
            GatewaySessionError::UsageExceedsDeposit
        );

        session.used += amount;
        session.usage_count += 1;
        gateway.total_volume += amount;
        Ok(())
    }

    pub fn settle_session(ctx: Context<SettleSession>) -> Result<()> {
        let clock = Clock::get()?;
        let session = &mut ctx.accounts.session;
        let gateway = &ctx.accounts.gateway;

        session.state = SessionState::Settled;

        emit!(SettlementProof {
            session_id: session.key().to_bytes(),
            agent_evm_address: session.agent_evm_address,
            provider_evm_address: gateway.provider_evm_address,
            used_amount: session.used,
            timestamp: clock.unix_timestamp,
        });

        msg!("Session settled: used={}, provider_evm={:?}", session.used, gateway.provider_evm_address);
        Ok(())
    }

    pub fn cancel_session(ctx: Context<CancelSession>) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(session.used == 0, GatewaySessionError::CannotCancelWithUsage);
        session.state = SessionState::Cancelled;
        msg!("Session cancelled");
        Ok(())
    }
}

// ============================================================================
// ACCOUNTS
// ============================================================================

#[derive(Accounts)]
#[instruction(slug: String)]
pub struct RegisterGateway<'info> {
    #[account(
        init,
        payer = provider,
        space = Gateway::SPACE,
        seeds = [b"gateway", slug.as_bytes()],
        bump
    )]
    pub gateway: Account<'info, Gateway>,
    #[account(mut)]
    pub provider: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGatewayPrice<'info> {
    #[account(
        mut,
        seeds = [b"gateway", gateway.slug.as_bytes()],
        bump = gateway.bump,
        has_one = provider @ GatewaySessionError::Unauthorized
    )]
    pub gateway: Account<'info, Gateway>,
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateGateway<'info> {
    #[account(
        mut,
        seeds = [b"gateway", gateway.slug.as_bytes()],
        bump = gateway.bump,
        has_one = provider @ GatewaySessionError::Unauthorized
    )]
    pub gateway: Account<'info, Gateway>,
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(estimated_deposit: u64, duration_seconds: i64, nonce: i64)]
pub struct OpenSession<'info> {
    #[account(
        init,
        payer = agent,
        space = Session::SPACE,
        seeds = [
            b"session",
            agent.key().as_ref(),
            gateway.key().as_ref(),
            &nonce.to_le_bytes()
        ],
        bump
    )]
    pub session: Account<'info, Session>,
    #[account(
        mut,
        seeds = [b"gateway", gateway.slug.as_bytes()],
        bump = gateway.bump,
        constraint = gateway.is_active @ GatewaySessionError::GatewayNotActive
    )]
    pub gateway: Account<'info, Gateway>,
    #[account(mut)]
    pub agent: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordUsage<'info> {
    #[account(
        mut,
        seeds = [
            b"session",
            session.agent.as_ref(),
            session.gateway.as_ref(),
            &session.created_at.to_le_bytes()
        ],
        bump = session.bump,
        constraint = session.state == SessionState::Active @ GatewaySessionError::SessionNotActive
    )]
    pub session: Account<'info, Session>,
    #[account(
        mut,
        seeds = [b"gateway", gateway.slug.as_bytes()],
        bump = gateway.bump,
        constraint = gateway.key() == session.gateway
    )]
    pub gateway: Account<'info, Gateway>,
    #[account(constraint = provider.key() == session.provider @ GatewaySessionError::Unauthorized)]
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleSession<'info> {
    #[account(
        mut,
        seeds = [
            b"session",
            session.agent.as_ref(),
            session.gateway.as_ref(),
            &session.created_at.to_le_bytes()
        ],
        bump = session.bump,
        constraint = session.state == SessionState::Active @ GatewaySessionError::SessionNotActive
    )]
    pub session: Account<'info, Session>,
    #[account(
        seeds = [b"gateway", gateway.slug.as_bytes()],
        bump = gateway.bump,
        constraint = gateway.key() == session.gateway
    )]
    pub gateway: Account<'info, Gateway>,
    #[account(
        constraint = settler.key() == session.agent || settler.key() == session.provider @ GatewaySessionError::Unauthorized
    )]
    pub settler: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelSession<'info> {
    #[account(
        mut,
        seeds = [
            b"session",
            session.agent.as_ref(),
            session.gateway.as_ref(),
            &session.created_at.to_le_bytes()
        ],
        bump = session.bump,
        constraint = session.state == SessionState::Active @ GatewaySessionError::SessionNotActive
    )]
    pub session: Account<'info, Session>,
    #[account(constraint = agent.key() == session.agent @ GatewaySessionError::Unauthorized)]
    pub agent: Signer<'info>,
}
