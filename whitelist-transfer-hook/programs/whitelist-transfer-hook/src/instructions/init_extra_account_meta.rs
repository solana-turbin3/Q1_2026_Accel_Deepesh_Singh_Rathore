use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};

use crate::ID;

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    /// CHECK: ExtraAccountMetaList Account, must use these seeds
    #[account(
        init,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
        space = ExtraAccountMetaList::size_of(
            InitializeExtraAccountMetaList::extra_account_metas()?.len()
        ).unwrap(),
        payer = payer
    )]
    pub extra_account_meta_list: AccountInfo<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeExtraAccountMetaList<'info> {
    pub fn extra_account_metas() -> Result<Vec<ExtraAccountMeta>> {
        // Define the seeds for the whitelist PDA
        // Seed 1: Literal "whitelist"
        let seed_1 = Seed::Literal {
            bytes: "whitelist".as_bytes().to_vec(),
        };
        // Seed 2: The owner of the destination token account (account at index 2)
        // Using AccountData to access the owner field (bytes 32-64) of the TokenAccount
        let seed_2 = Seed::AccountData {
            account_index: 2,  // destination token account
            data_index: 32,    // owner field starts at byte 32
            length: 32,        // Pubkey is 32 bytes
        };
        
        // Create the extra account meta with these seeds
        // This tells Token-2022 to automatically resolve the whitelist PDA
        // based on the destination token account's owner
        let account_metas = vec![
            ExtraAccountMeta::new_with_seeds(
                &[seed_1, seed_2], 
                false,  // is_signer
                false   // is_writable
            ).unwrap()
        ];
        
        Ok(account_metas)
    }
}
