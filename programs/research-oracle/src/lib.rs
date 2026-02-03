use anchor_lang::prelude::*;

declare_id!("AriGWxj99R7PtrEn3dvszvVLDrSb8RLt6GEostKzLzFL");

#[program]
pub mod research_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let oracle_state = &mut ctx.accounts.oracle_state;
        oracle_state.authority = ctx.accounts.authority.key();
        oracle_state.total_attestations = 0;
        oracle_state.total_resolved = 0;
        oracle_state.cumulative_brier = 0;
        oracle_state.bump = ctx.bumps.oracle_state;
        Ok(())
    }

    pub fn attest(
        ctx: Context<Attest>,
        question_hash: [u8; 32],
        estimate: u16,
        confidence: u8,
        deadline: i64,
    ) -> Result<()> {
        require!(estimate <= 10000, OracleError::InvalidEstimate);
        require!(confidence <= 2, OracleError::InvalidConfidence);

        let attestation = &mut ctx.accounts.attestation;
        attestation.oracle = ctx.accounts.oracle_state.key();
        attestation.question_hash = question_hash;
        attestation.estimate = estimate;
        attestation.confidence = confidence;
        attestation.deadline = deadline;
        attestation.created_at = Clock::get()?.unix_timestamp;
        attestation.resolved = false;
        attestation.outcome = false;
        attestation.bump = ctx.bumps.attestation;

        let oracle_state = &mut ctx.accounts.oracle_state;
        oracle_state.total_attestations += 1;

        Ok(())
    }

    pub fn resolve(ctx: Context<Resolve>, outcome: bool) -> Result<()> {
        let attestation = &mut ctx.accounts.attestation;
        require!(!attestation.resolved, OracleError::AlreadyResolved);

        attestation.resolved = true;
        attestation.outcome = outcome;

        // Calculate Brier score contribution (scaled by 10000)
        let estimate_f = attestation.estimate as f64 / 10000.0;
        let outcome_f = if outcome { 1.0 } else { 0.0 };
        let brier = ((estimate_f - outcome_f).powi(2) * 10000.0) as u64;

        let oracle_state = &mut ctx.accounts.oracle_state;
        oracle_state.total_resolved += 1;
        oracle_state.cumulative_brier += brier;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + OracleState::INIT_SPACE,
        seeds = [b"oracle_state", authority.key().as_ref()],
        bump
    )]
    pub oracle_state: Account<'info, OracleState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(question_hash: [u8; 32])]
pub struct Attest<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Attestation::INIT_SPACE,
        seeds = [b"attestation", oracle_state.key().as_ref(), &question_hash],
        bump
    )]
    pub attestation: Account<'info, Attestation>,
    #[account(
        mut,
        seeds = [b"oracle_state", authority.key().as_ref()],
        bump = oracle_state.bump,
        has_one = authority
    )]
    pub oracle_state: Account<'info, OracleState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(
        mut,
        seeds = [b"attestation", oracle_state.key().as_ref(), &attestation.question_hash],
        bump = attestation.bump
    )]
    pub attestation: Account<'info, Attestation>,
    #[account(
        mut,
        seeds = [b"oracle_state", authority.key().as_ref()],
        bump = oracle_state.bump,
        has_one = authority
    )]
    pub oracle_state: Account<'info, OracleState>,
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct OracleState {
    pub authority: Pubkey,
    pub total_attestations: u64,
    pub total_resolved: u64,
    pub cumulative_brier: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Attestation {
    pub oracle: Pubkey,
    pub question_hash: [u8; 32],
    pub estimate: u16,
    pub confidence: u8,
    pub deadline: i64,
    pub created_at: i64,
    pub resolved: bool,
    pub outcome: bool,
    pub bump: u8,
}

#[error_code]
pub enum OracleError {
    #[msg("Estimate must be between 0 and 10000 basis points")]
    InvalidEstimate,
    #[msg("Confidence must be 0, 1, or 2 (LOW, MEDIUM, HIGH)")]
    InvalidConfidence,
    #[msg("Attestation has already been resolved")]
    AlreadyResolved,
}
