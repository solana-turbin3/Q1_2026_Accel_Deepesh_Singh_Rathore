use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct Whitelist {
    pub is_whitelisted : bool,
    pub bump: u8,
}