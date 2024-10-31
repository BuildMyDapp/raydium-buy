import { LIQUIDITY_STATE_LAYOUT_V4, MAINNET_PROGRAM_ID, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import bs58 from 'bs58';
import {connection} from "./connection"
import { JitoTransactionExecutor } from './jeto';
import { logger } from './logger';
import { retrieveEnvVariable } from './env';
import { Keypair, ProgramAccountSubscriptionConfig } from '@solana/web3.js';
import {  getAssociatedTokenAddressSync } from '@solana/spl-token';
import { MarketCache } from './marketcache';
import { Bot } from './bot';




function getWallet(pk: string): Keypair {
  // assuming  private key to be base58 encoded
  return Keypair.fromSecretKey(bs58.decode(pk));
}

const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
const CUSTOM_FEE = retrieveEnvVariable('CUSTOM_FEE', logger);
const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', logger);
const MAX_BUY_RETRIES = retrieveEnvVariable('MAX_BUY_RETRIES', logger);
const BUY_SLIPPAGE = retrieveEnvVariable('BUY_SLIPPAGE', logger);
const wallet = getWallet(PRIVATE_KEY.trim());
const quoteToken = Token.WSOL //buy using wrapped solana

const botConfig = {
  wallet,
  quoteAta: getAssociatedTokenAddressSync(quoteToken.mint, wallet.publicKey),
  quoteToken,
  quoteAmount: new TokenAmount(quoteToken, QUOTE_AMOUNT, false),
  maxBuyRetries: Number(MAX_BUY_RETRIES),
  buySlippage: Number(BUY_SLIPPAGE),
  oneTokenAtATime: true,
  
};
const txExecutor = new JitoTransactionExecutor(CUSTOM_FEE, connection);

const marketCache = new MarketCache(connection);
const bot = new Bot(connection,txExecutor, botConfig,marketCache);

const subscriptionConfig:ProgramAccountSubscriptionConfig = {
  commitment:connection.commitment,
filters:[
  { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
  {
    memcmp: {
      offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
      bytes: quoteToken.mint.toBase58(),
    },
  },
  {
    memcmp: {
      offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
      bytes: MAINNET_PROGRAM_ID.OPENBOOK_MARKET.toBase58(),
    },
  },
  {
    memcmp: {
      offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('status'),
      bytes: bs58.encode([6, 0, 0, 0, 0, 0, 0, 0]),
    },
  },
],
}

async function  subscribeToRaydiumPools() {
    return connection.onProgramAccountChange(
      MAINNET_PROGRAM_ID.AmmV4,
      async (updatedAccountInfo) => {
        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
        // Check if the token is a pump fun graduated token and print the pool details and the token address.
        if(poolState.baseMint.toString().includes("pump")){
            console.log({
                "token_address":poolState.baseMint.toString(),
                "pool_address":updatedAccountInfo.accountId.toString()
            })
            await bot.buy(updatedAccountInfo.accountId, poolState);

        }

      },
      subscriptionConfig
    );
}



async function main(){
  await subscribeToRaydiumPools();
}
  
main()