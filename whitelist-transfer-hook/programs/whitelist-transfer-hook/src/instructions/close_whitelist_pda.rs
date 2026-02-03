use anchor_lang::prelude::*;

use crate::state::Whitelist;

#[derive(Accounts)]
pub struct CloseWhitelistPDA<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    // user account
    /// CHECK : just an useraccount for creating PDA
    pub user : AccountInfo<'info>,

    #[account(
        mut,
        close = admin,
        seeds = [b"whitelist", user.key().as_ref()],
        bump
    )]
    pub whitelist: Account<'info, Whitelist>,
    pub system_program: Program<'info, System>,
}

impl<'info> CloseWhitelistPDA<'info> {
    pub fn close_whitelist_pda(&mut self, bumps: CloseWhitelistPDABumps) -> Result<()> {
        // Initialize the whitelist with an empty address vector
        self.whitelist.set_inner(Whitelist { 
            is_whitelisted : false,
            bump: bumps.whitelist,
        });
        
        Ok(())
    }
}