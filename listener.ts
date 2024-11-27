import { Connection, PublicKey, VersionedTransactionResponse } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

const CONNECTION_URL = process.env.CONNECTION_URL as string;
const PUMP_FUN_MIGRATION_ACCOUNT = process.env.PUMP_FUN_MIGRATION_ACCOUNT as string;

if (!CONNECTION_URL || !PUMP_FUN_MIGRATION_ACCOUNT) {
  throw new Error('Environment variables CONNECTION_URL or PUMP_FUN_MIGRATION_ACCOUNT are not set.');
}

const connection = new Connection(CONNECTION_URL, {
  commitment: 'confirmed'
});

export function startTokenListener(onNewToken: (tokenMintAddress: string) => void) {
  connection.onLogs(
    new PublicKey(PUMP_FUN_MIGRATION_ACCOUNT),
    async (log) => {
      const signature = log.signature;
      if (!signature) {
        console.warn('No transaction signature found in log.');
        return;
      }

      const mintAddress = await getMintAddressFromAccountIndex6(signature);
      if (mintAddress) {
        console.log(`New token detected: ${mintAddress}`);
        onNewToken(mintAddress);
      }
    },
    'processed'
  );
}

async function getMintAddressFromAccountIndex6(signature: string): Promise<string | null> {
  try {
    const transactionDetails: VersionedTransactionResponse | null = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transactionDetails) {
      console.error(`No transaction found for signature: ${signature}`);
      return null;
    }

    const postTokenBalances = transactionDetails.meta?.postTokenBalances;
    if (!postTokenBalances) return null;

    const accountBalance = postTokenBalances.find((balance) => balance.accountIndex === 6);
    return accountBalance?.mint || null;
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}
