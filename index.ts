import { getPdaMetadataKey, LIQUIDITY_STATE_LAYOUT_V4, MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import bs58 from 'bs58';
import { connection } from "./connection"
import { JitoTransactionExecutor } from './jeto';
import { logger } from './logger';
import { retrieveEnvVariable } from './env';
import { KeyedAccountInfo, Keypair, PublicKey } from '@solana/web3.js';
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Bot } from './bot';
import { MarketCache } from "./marketcache"
import { PoolCache } from './poolcache';
import "./helper"
import { startTokenListener } from './listener';
import { isTokenEligible } from './utils/topHolders'; // Import eligibility check

// import { createPoolKeys } from './helper';
// import { BN } from 'bn.js';
// import { Raydium } from '@raydium-io/raydium-sdk-v2'
import { init } from "./server"
import { getNotForSaleList } from './db';
import { getTokenHoldersInfo } from './utils/token-holders';
import { runTgCommands } from './telegram/tg-bot';
import { connectDB } from './db/database';
// init();
connectDB()
// runTgCommands()

let notforSaleList: string[] = [];
// (async function () {
//   const list = await getNotForSaleList()
//   notforSaleList = list!.map(row => row.mint_address);
// })()
function getWallet(pk: string): Keypair {
  // assuming  private key to be base58 encoded
  return Keypair.fromSecretKey(bs58.decode(pk));
}
// get env varibles 
const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
const CUSTOM_FEE = retrieveEnvVariable('CUSTOM_FEE', logger);
const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', logger);
const MAX_BUY_RETRIES = retrieveEnvVariable('MAX_BUY_RETRIES', logger);
const MAX_SELL_RETRIES = retrieveEnvVariable('MAX_SELL_RETRIES', logger);
const BUY_SLIPPAGE = retrieveEnvVariable('BUY_SLIPPAGE', logger);
const SELL_SLIPPAGE = retrieveEnvVariable('SELL_SLIPPAGE', logger);
const MARKET_CAP_CHECK_INTERVAL = retrieveEnvVariable('MARKET_CAP_CHECK_INTERVAL', logger);
const MARKET_CAP_CHECK_DURATION = retrieveEnvVariable('MARKET_CAP_CHECK_DURATION', logger);


const wallet = getWallet(PRIVATE_KEY.trim());
const quoteToken = Token.WSOL //buy using wrapped solana
const botConfig = {
  wallet,
  quoteAta: getAssociatedTokenAddressSync(quoteToken.mint, wallet.publicKey),
  quoteToken,
  quoteAmount: new TokenAmount(quoteToken, QUOTE_AMOUNT, false),
  maxBuyRetries: Number(MAX_BUY_RETRIES),
  buySlippage: Number(BUY_SLIPPAGE),
  sellSlippage: Number(SELL_SLIPPAGE),
  maxSellRetries: Number(MAX_SELL_RETRIES),
  oneTokenAtATime: true,
  marketCapCheckInterval: Number(MARKET_CAP_CHECK_INTERVAL),
  marketCapCheckDuration: Number(MARKET_CAP_CHECK_DURATION)


};
const txExecutor = new JitoTransactionExecutor(CUSTOM_FEE, connection);

const marketCache = new MarketCache(connection);
const poolCache = new PoolCache();

const bot = new Bot(connection, txExecutor, botConfig, marketCache, poolCache);

// Function to handle detected tokens
async function handleNewToken(poolId: PublicKey,tokenMintAddress:string) {
  try {
    console.log(`Detected new token migrated to Raydium: ${tokenMintAddress}`);

    const metadataPDA = getPdaMetadataKey(new PublicKey(tokenMintAddress));
    const metadataAccount = await connection.getAccountInfo(metadataPDA.publicKey);

    // if (!metadataAccount) {
    //   console.warn(`Metadata not found for token: ${tokenMintAddress}`);
    //   return;
    // }

    // Check if token is eligible based on top holders' percentage
    const isEligible = await isTokenEligible(connection, tokenMintAddress);
    // if (!isEligible) {
    //   console.log(`Top holders hold more than 15% of the total supply. Skipping token: ${tokenMintAddress}`);
    //   return;
    // }

    // Fetch the pool account information
    const poolAccountInfo = await connection.getAccountInfo(poolId);
    if (!poolAccountInfo) {
      throw new Error(`Pool with ID ${poolId} not found`);
    }

    // Decode the pool state using Raydium's LIQUIDITY_STATE_LAYOUT_V4
    let poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(poolAccountInfo.data);
    if(poolState.baseMint.toString() == quoteToken.mint.toString()){
      poolState.baseMint = poolState.quoteMint
      poolState.quoteMint = quoteToken.mint
    }
      console.log({
        token_address: poolState.baseMint.toString(),
        pool_address: poolId,
      });
      // save pool info for later to retrieve for sell order
      poolCache.save(poolId.toString(), poolState);
      // Perform the buy transaction for each wallet
      await bot.buy(poolId, poolState);



  } catch (error) {
    console.log(`Failed to buy from pool: ${error}`);
  }
}


async function subscribeToOpenBookMarkets() {
  return connection.onProgramAccountChange(
    MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
    async (updatedAccountInfo: KeyedAccountInfo) => {

      const marketState = MARKET_STATE_LAYOUT_V3.decode(updatedAccountInfo.accountInfo.data);
      marketCache.save(updatedAccountInfo.accountId.toString(), marketState);
    },
    {
      commitment: connection.commitment,
      filters: [
        { dataSize: MARKET_STATE_LAYOUT_V3.span },
        {
          memcmp: {
            offset: MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint'),
            bytes: quoteToken.mint.toBase58(),
          },
        },
      ],
    }
  );
}


async function subscribeToWalletChanges(walletPublicKey: PublicKey) {
  return connection.onProgramAccountChange(
    TOKEN_PROGRAM_ID,
    async (updatedAccountInfo) => {
      const accountData = AccountLayout.decode(updatedAccountInfo.accountInfo.data);
      if (accountData.mint.equals(quoteToken.mint)) {
        return;
      }
      logger.info(
        { mint: accountData.mint.toString() },
        `Send sell transaction attempt`,
      );
      // if (!notforSaleList?.includes(accountData.mint.toString())) {

        await bot.sell(updatedAccountInfo.accountId, accountData);
      // }
    },
    {
      commitment: connection.commitment,
      filters: [
        {
          dataSize: 165,
        },
        {
          memcmp: {
            offset: 32,
            bytes: walletPublicKey.toBase58(),
          },
        },
      ],
    }
  );
}

async function main() {
  console.log('Starting token listener...');
  startTokenListener(handleNewToken); // Use listener logic to detect new tokens
  await subscribeToOpenBookMarkets();
  await subscribeToWalletChanges(wallet.publicKey);
}

main()



