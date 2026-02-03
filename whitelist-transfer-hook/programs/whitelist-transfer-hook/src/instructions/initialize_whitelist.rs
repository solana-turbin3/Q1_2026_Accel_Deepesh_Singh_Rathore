use anchor_lang::prelude::*;

use crate::state::Whitelist;

#[derive(Accounts)]
pub struct InitializeWhitelistPDA<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    // user account
    /// CHECK : just an useraccount for creating PDA
    pub user : AccountInfo<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 4 + 1, // 8 bytes for discriminator, 4 bytes for vector length, 1 byte for bump
        seeds = [b"whitelist", user.key().as_ref()],
        bump
    )]
    pub whitelist: Account<'info, Whitelist>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeWhitelistPDA<'info> {
    pub fn initialize_whitelist(&mut self, bumps: InitializeWhitelistPDABumps) -> Result<()> {
        // Initialize the whitelist with an empty address vector
        self.whitelist.set_inner(Whitelist { 
            is_whitelisted : true,
            bump: bumps.whitelist,
        });

        Ok(())
    }
}