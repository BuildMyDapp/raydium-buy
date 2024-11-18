import { Liquidity, LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeysV4, MAINNET_PROGRAM_ID, MARKET_STATE_LAYOUT_V3, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import bs58 from 'bs58';
import { connection } from "./connection"
import { JitoTransactionExecutor } from './jeto';
import { logger } from './logger';
import { retrieveEnvVariable } from './env';
import { KeyedAccountInfo, Keypair, ProgramAccountSubscriptionConfig, PublicKey } from '@solana/web3.js';
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Bot } from './bot';
import { MarketCache } from "./marketcache"
import { PoolCache } from './poolcache';
import "./helper"
import { createPoolKeys } from './helper';
// import { BN } from 'bn.js';
import { Raydium } from '@raydium-io/raydium-sdk-v2'
import {init} from "./server"
import { getNotForSaleList, saveBuyTx, saveSellTx } from './db';
import { connectDB } from './db/database';
import { runTgCommands } from './telegram/tgBot';
connectDB();
init();

runTgCommands()
// let notforSaleList:string[]= [];
// (async function(){

// const list = await getNotForSaleList()
// notforSaleList = list!.map(row => row.mint_address);
// })()
// function getWallet(pk: string): Keypair {
//   // assuming  private key to be base58 encoded
//   return Keypair.fromSecretKey(bs58.decode(pk));
// }
// // get env varibles 
// const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY', logger);
// const CUSTOM_FEE = retrieveEnvVariable('CUSTOM_FEE', logger);
// const QUOTE_AMOUNT = retrieveEnvVariable('QUOTE_AMOUNT', logger);
// const MAX_BUY_RETRIES = retrieveEnvVariable('MAX_BUY_RETRIES', logger);
// const MAX_SELL_RETRIES = retrieveEnvVariable('MAX_SELL_RETRIES', logger);
// const BUY_SLIPPAGE = retrieveEnvVariable('BUY_SLIPPAGE', logger);
// const SELL_SLIPPAGE = retrieveEnvVariable('SELL_SLIPPAGE', logger);
// const FLOOR_BUY_MARKET_CAP = retrieveEnvVariable('FLOOR_BUY_MARKET_CAP', logger);
// const CEIL_BUY_MARKET_CAP = retrieveEnvVariable('CEIL_BUY_MARKET_CAP', logger);
// const TARGET_SELL_MARKET_CAP = retrieveEnvVariable('TARGET_SELL_MARKET_CAP', logger);


// const wallet = getWallet(PRIVATE_KEY.trim());
// const quoteToken = Token.WSOL //buy using wrapped solana
// const botConfig = {
//   wallet,
//   quoteAta: getAssociatedTokenAddressSync(quoteToken.mint, wallet.publicKey),
//   quoteToken,
//   quoteAmount: new TokenAmount(quoteToken, QUOTE_AMOUNT, false),
//   maxBuyRetries: Number(MAX_BUY_RETRIES),
//   buySlippage: Number(BUY_SLIPPAGE),
//   sellSlippage: Number(SELL_SLIPPAGE),
//   maxSellRetries: Number(MAX_SELL_RETRIES),
//   oneTokenAtATime: true,

// };
// const txExecutor = new JitoTransactionExecutor(CUSTOM_FEE, connection);

// const marketCache = new MarketCache(connection);
// const poolCache = new PoolCache();

// const bot = new Bot(connection, txExecutor, botConfig, marketCache, poolCache);

// const subscriptionConfig: ProgramAccountSubscriptionConfig = {
//   commitment: connection.commitment,
//   filters: [
//     { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
//     {
//       memcmp: {
//         offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
//         bytes: quoteToken.mint.toBase58(),
//       },
//     },
//     {
//       memcmp: {
//         offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
//         bytes: MAINNET_PROGRAM_ID.OPENBOOK_MARKET.toBase58(),
//       },
//     },
//     {
//       memcmp: {
//         offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('status'),
//         bytes: bs58.encode([6, 0, 0, 0, 0, 0, 0, 0]),
//       },
//     },
//   ],
// }
// const now = Math.floor(new Date().getTime() / 1000); 

// async function subscribeToRaydiumPools() {
//   return connection.onProgramAccountChange(
//     MAINNET_PROGRAM_ID.AmmV4,
//     async (updatedAccountInfo: KeyedAccountInfo) => {
//       const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
//       if (poolState.baseMint.toString().endsWith("pump")) {
//         const exists = await poolCache.get(poolState.baseMint.toString());
//         const poolOpenTime = parseInt(poolState.poolOpenTime.toString());
      
//         if (!exists && poolOpenTime > now) {
//           poolCache.save(updatedAccountInfo.accountId.toString(), poolState);
         
           
//             const marketCap = await getTokenMarketCap(updatedAccountInfo.accountId)
      
//             if(marketCap >= Number(FLOOR_BUY_MARKET_CAP) && marketCap <= Number(CEIL_BUY_MARKET_CAP)){
//                 console.log({
//                   "token_address": poolState.baseMint.toString(),
//                   "pool_address": updatedAccountInfo.accountId.toString()
//                 })
//                 await bot.buy(updatedAccountInfo.accountId, poolState);
//               }
//             // Check if the token is a pump fun graduated token and print the pool details and the token address.
         

//         }


//       }

//     },
//     subscriptionConfig
//   );
// }

// async function subscribeToOpenBookMarkets() {
//   return connection.onProgramAccountChange(
//     MAINNET_PROGRAM_ID.OPENBOOK_MARKET,
//     async (updatedAccountInfo: KeyedAccountInfo) => {

//       const marketState = MARKET_STATE_LAYOUT_V3.decode(updatedAccountInfo.accountInfo.data);
//       marketCache.save(updatedAccountInfo.accountId.toString(), marketState);
//     },
//     {
//       commitment: connection.commitment,
//       filters: [
//         { dataSize: MARKET_STATE_LAYOUT_V3.span },
//         {
//           memcmp: {
//             offset: MARKET_STATE_LAYOUT_V3.offsetOf('quoteMint'),
//             bytes: quoteToken.mint.toBase58(),
//           },
//         },
//       ],
//     }
//   );
// }


// async function subscribeToWalletChanges(walletPublicKey: PublicKey) {
//   return connection.onProgramAccountChange(
//     TOKEN_PROGRAM_ID,
//     async (updatedAccountInfo) => {
//       const accountData = AccountLayout.decode(updatedAccountInfo.accountInfo.data);
      
//       const marketCap = await getTokenMarketCap(updatedAccountInfo.accountId)
//       if(!notforSaleList?.includes(accountData.mint.toString())){
//         console.log({
//           "token_address": accountData.mint.toString(),
//           "pool_address": updatedAccountInfo.accountId.toString()
//         })
//         if(marketCap >= Number(TARGET_SELL_MARKET_CAP)){
//           await bot.sell(updatedAccountInfo.accountId, accountData);
//         }
//       }
//     },
//     {
//       commitment: connection.commitment,
//       filters: [
//         {
//           dataSize: 165,
//         },
//         {
//           memcmp: {
//             offset: 32,
//             bytes: walletPublicKey.toBase58(),
//           },
//         },
//       ],
//     }
//   );
// }

// async function main() {
//   await subscribeToRaydiumPools();
//   await subscribeToOpenBookMarkets();
//   await subscribeToWalletChanges(wallet.publicKey);
// }

// main()

// async function getTokenMarketCap(poolId: PublicKey): Promise<number> {
// try{


//   const poolAccountInfo = await connection.getAccountInfo(poolId);
//   const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(poolAccountInfo?.data as Buffer);

//   const [market] = await Promise.all([
//     marketCache.get(poolState.marketId.toString()),
//   ]);
//   const poolKeys: LiquidityPoolKeysV4 = createPoolKeys(poolId, poolState, market);
//   const poolInfo = await Liquidity.fetchInfo({
//     connection: connection,
//     poolKeys,
//   });
//   const solPrice = await getUsdPrice()
//   const tokenPrice = (Number(poolInfo.quoteReserve) / Number(poolInfo.baseReserve)) * solPrice
//   const totalSupply = await connection.getTokenSupply(new PublicKey(poolState.baseMint))
//   return Number(totalSupply.value.uiAmount) * tokenPrice
// }catch (e) {
// return 0
// }
// }
// let requestCount = 0
// let solPriceCached = 0
// async function getUsdPrice(): Promise<number> {
//   try{
//   if(requestCount == 5){

//     return solPriceCached
//   }else{
//     requestCount++
//   const raydium = await Raydium.load({
//     connection,
//   })
//   const poolId = "8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj" // sol/usdc  pool id
//   const pool = await raydium.api.fetchPoolById({
//     ids: poolId
//   })
//   solPriceCached = pool[0].price
  
//   return solPriceCached
// }
//   } catch(e){
// console.log("error ---->",e)
// return solPriceCached
//   }
// }

// setInterval(()=>{
//   requestCount=0
// },60000)





// saveBuyTx("dsada","dsaddsa","dsadsad",22)

// saveSellTx("dsada","dsaddsa","dsadsad",22)