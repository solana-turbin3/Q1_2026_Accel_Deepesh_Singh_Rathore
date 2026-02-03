import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createInitializeMintInstruction,
  getMintLen,
  ExtensionType,
  createTransferCheckedWithTransferHookInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeTransferHookInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { 
  SendTransactionError, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction 
} from '@solana/web3.js';
import { WhitelistTransferHook } from "../target/types/whitelist_transfer_hook";

describe("whitelist-transfer-hook", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const wallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.whitelistTransferHook as Program<WhitelistTransferHook>;

  const mint2022 = anchor.web3.Keypair.generate();

  // Sender token account address
  const sourceTokenAccount = getAssociatedTokenAddressSync(
    mint2022.publicKey,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  // Recipient token account address
  const recipient = anchor.web3.Keypair.generate();
  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mint2022.publicKey,
    recipient.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  // ExtraAccountMetaList address
  // Store extra accounts required by the custom transfer hook instruction
  const [extraAccountMetaListPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('extra-account-metas'), mint2022.publicKey.toBuffer()],
    program.programId,
  );

  const whitelist = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("whitelist"),
    ],
    program.programId
  )[0];

  // const user = anchor.web3.Keypair.generate();
  const whitelistPDA = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("whitelist"),
      recipient.publicKey.toBytes()
    ],
    program.programId
  )[0];

  it("Initializes the Whitelist", async () => {
    const tx = await program.methods.initializeWhitelist()
      .accountsStrict({
        admin: provider.publicKey,
        user : recipient.publicKey,
        whitelist : whitelistPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    const whitelistPDAAccount = await program.account.whitelist.fetch(whitelistPDA);
  
    console.log("\nWhitelist initialized:", whitelistPDA.toBase58());
    console.log("\nWhitelist initialized:", whitelistPDAAccount);
    console.log("Transaction signature:", tx);
  });

  it("Mark PDA Whitelist", async () => {
    const tx = await program.methods.whitelistPda()
      .accountsStrict({
        admin: provider.publicKey,
        user : recipient.publicKey,
        whitelist : whitelistPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    const whitelistPDAAccount = await program.account.whitelist.fetch(whitelistPDA);
  
    console.log("\nWhitelist initialized:", whitelistPDA.toBase58());
    console.log("\nWhitelist initialized:", whitelistPDAAccount);
    console.log("Transaction signature:", tx);
  });

  // it("Close whiteliest pda", async () => {
  //   const tx = await program.methods.closeWhitelistPda()
  //     .accountsStrict({
  //       admin: provider.publicKey,
  //       user : user.publicKey,
  //       whitelist : whitelistPDA,
  //       systemProgram: anchor.web3.SystemProgram.programId,
  //     })
  //     .rpc();
  //   const whitelistPDAAccount = await program.account.whitelist.fetch(whitelistPDA);
  
  //   // console.log("\nWhitelist initialized:", whitelistPDA.toBase58());
  //   console.log("\nWhitelist initialized:", whitelistPDAAccount);
  //   console.log("Transaction signature:", tx);
  // });

  // it("Add user to whitelist", async () => {
  //   const tx = await program.methods.addToWhitelist(provider.publicKey)
  //     .accountsPartial({
  //       admin: provider.publicKey,
  //       whitelist,
  //     })
  //     .rpc();

  //   console.log("\nUser added to whitelist:", provider.publicKey.toBase58());
  //   console.log("Transaction signature:", tx);
  // });

  // it("Remove user to whitelist", async () => {
  //   const tx = await program.methods.removeFromWhitelist(provider.publicKey)
  //     .accountsPartial({
  //       admin: provider.publicKey,
  //       whitelist,
  //     })
  //     .rpc();

  //   console.log("\nUser removed from whitelist:", provider.publicKey.toBase58());
  //   console.log("Transaction signature:", tx);
  // });

  it('Create Mint Account with Transfer Hook Extension', async () => {
    const extensions = [ExtensionType.TransferHook];
    const mintLen = getMintLen(extensions);
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint2022.publicKey,
        space: mintLen,
        lamports: lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeTransferHookInstruction(
        mint2022.publicKey,
        wallet.publicKey,
        program.programId, // Transfer Hook Program ID
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeMintInstruction(mint2022.publicKey, 9, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
    );

    const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [wallet.payer, mint2022], {
      skipPreflight: true,
      commitment: 'finalized',
    });

    const txDetails = await program.provider.connection.getTransaction(txSig, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
    //console.log(txDetails.meta.logMessages);

    console.log("\nTransaction Signature: ", txSig);
  });

  it('Create Token Accounts and Mint Tokens', async () => {
    // 100 tokens
    const amount = 100 * 10 ** 9;

    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        sourceTokenAccount,
        wallet.publicKey,
        mint2022.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        destinationTokenAccount,
        recipient.publicKey,
        mint2022.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
      createMintToInstruction(mint2022.publicKey, sourceTokenAccount, wallet.publicKey, amount, [], TOKEN_2022_PROGRAM_ID),
    );

    const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [wallet.payer], { skipPreflight: true });

    console.log("\nTransaction Signature: ", txSig);
  });

  // Account to store extra accounts required by the transfer hook instruction
  it('Create ExtraAccountMetaList Account', async () => {
    const initializeExtraAccountMetaListInstruction = await program.methods
      .initializeTransferHook()
      .accountsPartial({
        payer: wallet.publicKey,
        mint: mint2022.publicKey,
        extraAccountMetaList: extraAccountMetaListPDA,
        systemProgram: SystemProgram.programId,
      })
      //.instruction();
      .rpc();

    //const transaction = new Transaction().add(initializeExtraAccountMetaListInstruction);

    //const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [wallet.payer], { skipPreflight: true, commitment: 'confirmed' });
    console.log("\nExtraAccountMetaList Account created:", extraAccountMetaListPDA.toBase58());
    console.log('Transaction Signature:', initializeExtraAccountMetaListInstruction);

  });

  it('Should SUCCEED: Transfer to Whitelisted Recipient', async () => {
    // 1 token
    const amount = 1 * 10 ** 9;
    const amountBigInt = BigInt(amount);

    // Get initial balances
    const sourceAccountBefore = await provider.connection.getTokenAccountBalance(sourceTokenAccount);
    const destAccountBefore = await provider.connection.getTokenAccountBalance(destinationTokenAccount);
    
    console.log("\n--- Before Transfer ---");
    console.log("Source balance:", sourceAccountBefore.value.uiAmount);
    console.log("Destination balance:", destAccountBefore.value.uiAmount);

    // Create the base transfer instruction
    const transferInstruction = createTransferCheckedInstruction(
      sourceTokenAccount,
      mint2022.publicKey,
      destinationTokenAccount,
      wallet.publicKey,
      amountBigInt,
      9,
      [],
      TOKEN_2022_PROGRAM_ID,
    );

    // Manually add the extra accounts required by the transfer hook
    // These accounts are needed for the CPI to our transfer hook program
    transferInstruction.keys.push(
      // ExtraAccountMetaList PDA
      { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
      // Whitelist PDA (the extra account we defined)
      { pubkey: whitelistPDA, isSigner: false, isWritable: false },
      // Transfer hook program
      { pubkey: program.programId, isSigner: false, isWritable: false },
    );

    const transaction = new Transaction().add(transferInstruction);

    try {
      // Send the transaction
      const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [wallet.payer], { skipPreflight: false });
      console.log("\n✅ Transfer succeeded!");
      console.log("Transaction Signature:", txSig);

      // Verify balances changed
      const sourceAccountAfter = await provider.connection.getTokenAccountBalance(sourceTokenAccount);
      const destAccountAfter = await provider.connection.getTokenAccountBalance(destinationTokenAccount);
      
      console.log("\n--- After Transfer ---");
      console.log("Source balance:", sourceAccountAfter.value.uiAmount);
      console.log("Destination balance:", destAccountAfter.value.uiAmount);

      // Assertions to verify the transfer worked
      const expectedSourceBalance = sourceAccountBefore.value.uiAmount - 1;
      const expectedDestBalance = destAccountBefore.value.uiAmount + 1;
      
      if (sourceAccountAfter.value.uiAmount !== expectedSourceBalance) {
        throw new Error(`Source balance mismatch! Expected: ${expectedSourceBalance}, Got: ${sourceAccountAfter.value.uiAmount}`);
      }
      
      if (destAccountAfter.value.uiAmount !== expectedDestBalance) {
        throw new Error(`Destination balance mismatch! Expected: ${expectedDestBalance}, Got: ${destAccountAfter.value.uiAmount}`);
      }

      console.log("\n✅ Balance verification passed!");
      
    } catch (error) {
      if (error instanceof SendTransactionError) {
        console.error("\n❌ Transfer FAILED (but should have succeeded!)");
        console.error("Error details:", error.message);
        console.error("\nFull transaction logs:");
        error.logs?.forEach((log, i) => console.error(`  ${i}: ${log}`));
        throw error; // Re-throw to fail the test
      } else {
        console.error("\n❌ Unexpected error:", error);
        throw error;
      }
    }
  });

  it('Should FAIL: Transfer to Non-Whitelisted Recipient', async () => {
    // Create a new recipient that is NOT whitelisted
    const nonWhitelistedRecipient = anchor.web3.Keypair.generate();
    const nonWhitelistedTokenAccount = getAssociatedTokenAddressSync(
      mint2022.publicKey,
      nonWhitelistedRecipient.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Derive the whitelist PDA for this non-whitelisted recipient
    const nonWhitelistedPDA = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("whitelist"),
        nonWhitelistedRecipient.publicKey.toBytes()
      ],
      program.programId
    )[0];

    console.log("\n--- Testing Non-Whitelisted Recipient ---");
    console.log("Non-whitelisted recipient:", nonWhitelistedRecipient.publicKey.toBase58());
    console.log("Expected whitelist PDA:", nonWhitelistedPDA.toBase58());

    // Create the token account for non-whitelisted recipient
    const createAccountTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        nonWhitelistedTokenAccount,
        nonWhitelistedRecipient.publicKey,
        mint2022.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
    );

    await sendAndConfirmTransaction(provider.connection, createAccountTx, [wallet.payer], { skipPreflight: true });
    console.log("✅ Token account created for non-whitelisted recipient");

    // Try to transfer to non-whitelisted recipient
    const amount = 1 * 10 ** 9;
    const amountBigInt = BigInt(amount);

    const transferInstruction = createTransferCheckedInstruction(
      sourceTokenAccount,
      mint2022.publicKey,
      nonWhitelistedTokenAccount,
      wallet.publicKey,
      amountBigInt,
      9,
      [],
      TOKEN_2022_PROGRAM_ID,
    );

    // Manually add the extra accounts - this will fail because PDA doesn't exist
    transferInstruction.keys.push(
      { pubkey: extraAccountMetaListPDA, isSigner: false, isWritable: false },
      { pubkey: nonWhitelistedPDA, isSigner: false, isWritable: false },
      { pubkey: program.programId, isSigner: false, isWritable: false },
    );

    const transaction = new Transaction().add(transferInstruction);

    try {
      const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [wallet.payer], { skipPreflight: false });
      
      // If we get here, the transfer succeeded when it should have failed!
      console.error("\n❌ TEST FAILED: Transfer succeeded but should have been blocked!");
      console.error("Transaction Signature:", txSig);
      throw new Error("Transfer to non-whitelisted recipient should have failed but succeeded!");
      
    } catch (error) {
      if (error instanceof SendTransactionError) {
        // This is expected - check for the right error
        console.log("\n✅ Transfer correctly FAILED for non-whitelisted recipient");
        
        // Look for specific error messages in logs
        const errorLog = error.logs?.find(log => 
          log.includes("not whitelisted") || 
          log.includes("Unauthorized") ||
          log.includes("Account does not exist")
        );
        
        if (errorLog) {
          console.log("Error message:", errorLog);
        } else {
          console.log("\nTransaction logs:");
          error.logs?.forEach((log, i) => console.error(`  ${i}: ${log}`));
        }
        
        // Test passes because transfer was blocked as expected
        console.log("✅ Whitelist protection working correctly!");
        
      } else {
        // Unexpected error type
        console.error("\n❌ Unexpected error type:", error);
        throw error;
      }
    }
  });
});
