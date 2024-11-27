import {  PublicKey, VersionedTransactionResponse } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { connection } from './connection';

dotenv.config();

const PUMP_FUN_MIGRATION_ACCOUNT = process.env.PUMP_FUN_MIGRATION_ACCOUNT as string;

if ( !PUMP_FUN_MIGRATION_ACCOUNT) {
  throw new Error('Environment variables PUMP_FUN_MIGRATION_ACCOUNT are not set.');
}



export function startTokenListener(onNewToken: (tokenMintAddress: string,poolId:string) => void) {
  connection.onLogs(
    new PublicKey(PUMP_FUN_MIGRATION_ACCOUNT),
    async (log) => {
      const signature = log.signature;
      if (!signature) {
        console.warn('No transaction signature found in log.');
        return;
      }

      const mintAndPool = await getMintAddressFromAccountIndex6(signature);
      if (mintAndPool?.tokenMint && mintAndPool?.poolId) {
        // console.log(`New token mint and pool ID found: ${mintAndPool?.tokenMint}, ${mintAndPool.poolId}`);
        onNewToken(mintAndPool?.tokenMint,mintAndPool.poolId);
      }
    },
    'processed'
  );
}



async function getMintAddressFromAccountIndex6(signature: string): Promise<{tokenMint:string|null,poolId:string} | null> {
  try {
    const transactionDetails: VersionedTransactionResponse | null = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transactionDetails) {
      console.error(`No transaction found for signature: ${signature}`);
      return null;
    }

    const poolId = transactionDetails.transaction.message.staticAccountKeys[2];
    const postTokenBalances = transactionDetails.meta?.postTokenBalances;
    if (!postTokenBalances) return null;
    const accountBalance = postTokenBalances.find((balance) => balance.accountIndex === 6);
    return {tokenMint:accountBalance?.mint || null,poolId:poolId.toString()};
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}