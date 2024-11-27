import { Connection, PublicKey } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { getRaydiumV4TokenAccount } from '../raydiumV4TokenAccount';

dotenv.config();

// Load total supply from `.env`
const TOTAL_SUPPLY = parseFloat(process.env.TOKEN_TOTAL_SUPPLY || '1000000000'); // Default to 1 billion
if (!TOTAL_SUPPLY) {
  throw new Error('TOKEN_TOTAL_SUPPLY is not defined in .env');
}

/**
 * Check if the top 10 holders (excluding Raydium V4 Token Account) own less than 15% of the total token supply.
 * @param connection - Solana connection instance
 * @param tokenMintAddress - Token mint address
 * @returns `true` if top holders own less than 15%, `false` otherwise
 */
export async function isTokenEligible(connection: Connection, tokenMintAddress: string): Promise<boolean> {
  try {
    const mintAddress = new PublicKey(tokenMintAddress);

    // Fetch the Raydium V4 token account for this token
    const raydiumV4TokenAccount = await getRaydiumV4TokenAccount(connection, tokenMintAddress);

    let raydiumV4PublicKey: PublicKey | null = null;
    if (raydiumV4TokenAccount) {
      raydiumV4PublicKey = new PublicKey(raydiumV4TokenAccount);
    }

    const largestAccounts = await connection.getTokenLargestAccounts(mintAddress);

    // Explicitly exclude the Raydium V4 Token Account and adjust top 10 holders
    const filteredAccounts = largestAccounts.value.filter((account) => {
      return !raydiumV4PublicKey || !account.address.equals(raydiumV4PublicKey);
    });

    // Adjust top 10 holders by including the 11th if Raydium V4 was excluded
    const adjustedTopHolders = filteredAccounts.slice(0, 10);

    adjustedTopHolders.forEach((holder, index) => {
      const holderAddress = holder.address.toBase58(); // Convert PublicKey to Base58 format
      const holderAmount = parseFloat(holder.uiAmountString); // Convert amount to a readable float

      console.log(`Top Holder ${index + 1}:`);
      console.log(`  Address: ${holderAddress}`);
      console.log(`  Amount: ${holderAmount.toLocaleString()} tokens`);
    });

    // Calculate total tokens held by the top holders excluding Raydium V4
    const totalHeldByTopHolders = adjustedTopHolders.reduce((sum, account) => sum + (account.uiAmount || 0), 0);
    const percentageHeld = (totalHeldByTopHolders / TOTAL_SUPPLY) * 100;

    console.log(
      `Top 10 holders (excluding Raydium V4 Token Account) hold ${percentageHeld.toFixed(2)}% of the total supply.`
    );

    return percentageHeld < 15; // Token is eligible if top holders own less than 15%
  } catch (error) {
    console.error(`Error checking eligibility for token ${tokenMintAddress}:`, error);
    return false;
  }
}
