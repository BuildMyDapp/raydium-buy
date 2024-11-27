import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Get the token account for a given token address owned by Raydium V4.
 * @param connection - Solana connection instance
 * @param tokenAddress - Token mint address (Base58 string)
 * @returns The token account address if found, or null if not found
 */
export async function getRaydiumV4TokenAccount(
  connection: Connection,
  tokenAddress: string
): Promise<string | null> {
  try {
    const tokenMint = new PublicKey(tokenAddress);
    const raydiumV4Authority = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1');

    // Fetch all token accounts owned by Raydium V4
    const tokenAccounts = await connection.getTokenAccountsByOwner(raydiumV4Authority, {
      mint: tokenMint,
    });

    if (tokenAccounts.value.length === 0) {
      console.warn(`No token accounts found for token ${tokenAddress} under Raydium V4 authority.`);
      return null;
    }

    // Return the first token account found
    const tokenAccountAddress = tokenAccounts.value[0].pubkey.toBase58();
    console.log(`Raydium V4 Token Account for token ${tokenAddress}: ${tokenAccountAddress}`);
    return tokenAccountAddress;
  } catch (error) {
    console.error(`Error fetching token account for token ${tokenAddress}:`, error);
    return null;
  }
}
