use anchor_lang::prelude::*;

use crate::state::Whitelist;

#[derive(Accounts)]
pub struct WhitelistPDA<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    // user account
    /// CHECK : just an useraccount for creating PDA
    pub user : AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"whitelist", user.key().as_ref()],
        bump
    )]
    pub whitelist: Account<'info, Whitelist>,
    pub system_program: Program<'info, System>,
}

impl<'info> WhitelistPDA<'info> {
    pub fn whitelist_pda(&mut self, bumps: WhitelistPDABumps) -> Result<()> {
        // Initialize the whitelist with an empty address vector
        self.whitelist.set_inner(Whitelist { 
            is_whitelisted : true,
            bump: bumps.whitelist,
        });

        Ok(())
    }
}