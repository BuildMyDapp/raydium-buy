import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  RawAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  GetStructureSchema,
  publicKey, struct, Liquidity,
  LiquidityPoolKeys, LiquidityPoolKeysV4,
  LiquidityStateV4, MAINNET_PROGRAM_ID,
  Market, Percent, Token, TokenAmount,
  LIQUIDITY_STATE_LAYOUT_V4,
  LiquidityPoolInfo
} from '@raydium-io/raydium-sdk';
import { JitoTransactionExecutor } from './jeto';
import { logger } from './logger';
import { retrieveEnvVariable } from './env';
import { MarketCache } from './marketcache';
import { PoolCache } from './poolcache';
import { Mutex } from 'async-mutex';
import { Raydium } from '@raydium-io/raydium-sdk-v2';
import { saveBuyTx, saveSellTx } from './db';


const NETWORK = retrieveEnvVariable('NETWORK', logger);
const MINIMAL_MARKET_STATE_LAYOUT_V3 = struct([publicKey('eventQueue'), publicKey('bids'), publicKey('asks')]);
type MinimalMarketStateLayoutV3 = typeof MINIMAL_MARKET_STATE_LAYOUT_V3;
type MinimalMarketLayoutV3 = GetStructureSchema<MinimalMarketStateLayoutV3>;

const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));



function createPoolKeys(
  id: PublicKey,
  accountData: LiquidityStateV4,
  minimalMarketLayoutV3: MinimalMarketLayoutV3,
): LiquidityPoolKeys {
  return {
    id,
    baseMint: accountData.baseMint,
    quoteMint: accountData.quoteMint,
    lpMint: accountData.lpMint,
    baseDecimals: accountData.baseDecimal.toNumber(),
    quoteDecimals: accountData.quoteDecimal.toNumber(),
    lpDecimals: 5,
    version: 4,
    programId: MAINNET_PROGRAM_ID.AmmV4,
    authority: Liquidity.getAssociatedAuthority({
      programId: MAINNET_PROGRAM_ID.AmmV4,
    }).publicKey,
    openOrders: accountData.openOrders,
    targetOrders: accountData.targetOrders,
    baseVault: accountData.baseVault,
    quoteVault: accountData.quoteVault,
    marketVersion: 3,
    marketProgramId: accountData.marketProgramId,
    marketId: accountData.marketId,
    marketAuthority: Market.getAssociatedAuthority({
      programId: accountData.marketProgramId,
      marketId: accountData.marketId,
    }).publicKey,
    marketBaseVault: accountData.baseVault,
    marketQuoteVault: accountData.quoteVault,
    marketBids: minimalMarketLayoutV3.bids,
    marketAsks: minimalMarketLayoutV3.asks,
    marketEventQueue: minimalMarketLayoutV3.eventQueue,
    withdrawQueue: accountData.withdrawQueue,
    lpVault: accountData.lpVault,
    lookupTableAccount: PublicKey.default,
  };
}

interface BotConfig {
  wallet: Keypair,
  quoteAta: PublicKey;
  quoteToken: Token;
  quoteAmount: TokenAmount;
  maxBuyRetries: number;
  maxSellRetries: number;
  buySlippage: number;
  sellSlippage: number;
  oneTokenAtATime: boolean;
  marketCapCheckInterval: number;
  marketCapCheckDuration: number;
}

const TARGET_SELL_MARKET_CAP = retrieveEnvVariable('TARGET_SELL_MARKET_CAP', logger);
const FLOOR_BUY_MARKET_CAP = retrieveEnvVariable('FLOOR_BUY_MARKET_CAP', logger);
const CEIL_BUY_MARKET_CAP = retrieveEnvVariable('CEIL_BUY_MARKET_CAP', logger);


export class Bot {
  private readonly mutex: Mutex;
  private sellExecutionCount = 0;
  private requestCount = 0
  private solPriceCached = 0

  constructor(
    private readonly connection: Connection,

    private readonly txExecutor: JitoTransactionExecutor,
    readonly config: BotConfig,
    private readonly marketStorage: MarketCache,
    private readonly poolStorage: PoolCache,


  ) {
    this.mutex = new Mutex();
    setInterval(() => {
      this.requestCount = 0
    }, 60_000) //60 sec
  }

  async validate() {
    try {
      await getAccount(this.connection, this.config.quoteAta, this.connection.commitment);
    } catch (error) {
      logger.error(
        `${this.config.quoteToken.symbol} token account not found in wallet: ${this.config.wallet.publicKey.toString()}`,
      );
      return false;
    }

    return true;
  }

  public async buy(accountId: PublicKey, poolState: LiquidityStateV4) {

    try {
      if (this.config.oneTokenAtATime) {
        if (this.mutex.isLocked() || this.sellExecutionCount > 0) {
          logger.debug(
            { mint: poolState.baseMint.toString() },
            `Skipping buy because one token at a time is turned on and token is already being processed`,
          );
          return;
        }

        await this.mutex.acquire();
      }
      const [market, mintAta] = await Promise.all([
        this.marketStorage.get(poolState.marketId.toString()),
        getAssociatedTokenAddress(poolState.baseMint, this.config.wallet.publicKey),
      ]);

      const poolKeys: LiquidityPoolKeysV4 = createPoolKeys(accountId, poolState, market);
      const marketCap = await this.getTokenMarketCap(poolKeys, poolKeys.baseMint)
      logger.info(
        { mint: poolState.baseMint.toString() },
        `Market cap : ${marketCap}`,
      );
      if (marketCap >= Number(FLOOR_BUY_MARKET_CAP) && marketCap <= Number(CEIL_BUY_MARKET_CAP)) {


        try {
          for (let i = 0; i < this.config.maxBuyRetries; i++) {
            try {
              logger.info(
                { mint: poolState.baseMint.toString() },
                `Send buy transaction attempt: ${i + 1}/${this.config.maxBuyRetries}`,
              );
              const tokenOut = new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals);

              const result = await this.swap(
                poolKeys,
                this.config.quoteAta,
                mintAta,
                this.config.quoteToken,
                tokenOut,
                this.config.quoteAmount,
                this.config.buySlippage,
                this.config.wallet,
                'buy'
              );

              if (result.confirmed) {
                await saveBuyTx(poolState.baseMint.toString(), accountId.toString(), result.signature?.toString(), Number(this.config.quoteAmount.numerator));

                logger.info(
                  {
                    mint: poolState.baseMint.toString(),
                    signature: result.signature,
                    url: `https://solscan.io/tx/${result.signature}?cluster=${NETWORK}`,
                  },
                  `Confirmed buy tx`,
                );

                break;
              }
              logger.info(
                {
                  mint: poolState.baseMint.toString(),
                  signature: result.signature,
                  error: result.error,
                },
                `Error confirming buy tx`,
              );
            } catch (error) {
              logger.debug({ mint: poolState.baseMint.toString(), error }, `Error confirming buy transaction`);
            }
          }
        } catch (error) {
          logger.error({ mint: poolState.baseMint.toString(), error }, `Failed to buy token`);
        } finally {
          if (this.config.oneTokenAtATime) {
            this.mutex.release();
          }
        }
      }
    } catch (e) {
      logger.error({error:e},'Error in buy function')
      return
    }
  }


  public async sell(accountId: PublicKey, rawAccount: RawAccount) {
    if (this.config.oneTokenAtATime) {
      this.sellExecutionCount++;
    }

    try {
      logger.debug({ mint: rawAccount.mint }, `Processing new token...`);

      const poolData = await this.poolStorage.get(rawAccount.mint.toString());

      if (!poolData) {
        logger.debug({ mint: rawAccount.mint.toString() }, `Token pool data is not found, can't sell`);
        return;
      }

      const tokenIn = new Token(TOKEN_PROGRAM_ID, poolData.state.quoteMint, poolData.state.quoteDecimal.toNumber());
      const tokenAmountIn = new TokenAmount(tokenIn, rawAccount.amount, true);

      if (tokenAmountIn.isZero()) {
        logger.debug({ mint: rawAccount.mint.toString() }, `Empty balance, can't sell`);
        return;
      }



      const market = await this.marketStorage.get(poolData.state.marketId.toString());
      const poolKeys: LiquidityPoolKeysV4 = createPoolKeys(new PublicKey(poolData.id), poolData.state, market);

      await this.marketCapMatch(rawAccount.mint, poolKeys);

      for (let i = 0; i < this.config.maxSellRetries; i++) {
        try {
          logger.debug(
            { mint: rawAccount.mint },
            `Send sell transaction attempt: ${i + 1}/${this.config.maxSellRetries}`,
          );

          const result = await this.swap(
            poolKeys,
            accountId, // ata
            this.config.quoteAta, // ata
            tokenIn, // token 
            this.config.quoteToken, // token
            tokenAmountIn,
            this.config.sellSlippage,
            this.config.wallet,
            'sell',
          );

          if (result.confirmed) {
            await saveSellTx(rawAccount.mint.toString(), accountId.toString(), result.signature?.toString(), Number(tokenAmountIn.numerator));

            logger.info(
              {
                dex: `https://dexscreener.com/solana/${rawAccount.mint.toString()}?maker=${this.config.wallet.publicKey}`,
                mint: rawAccount.mint.toString(),
                signature: result.signature,
                url: `https://solscan.io/tx/${result.signature}?cluster=${NETWORK}`,
              },
              `Confirmed sell tx`,
            );
            break;
          }

          logger.debug(
            {
              mint: rawAccount.mint.toString(),
              signature: result.signature,
              error: result.error,
            },
            `Error confirming sell tx`,
          );
        } catch (error) {
          logger.debug({ mint: rawAccount.mint.toString(), error }, `Error confirming sell transaction`);
        }
      }
    } catch (error) {
      logger.debug({ mint: rawAccount.mint.toString(), error }, `Failed to sell token`);
    } finally {
      if (this.config.oneTokenAtATime) {
        this.sellExecutionCount--;
      }
    }
  }

  private async marketCapMatch(mint: PublicKey, poolKeys: LiquidityPoolKeysV4) {
    if (this.config.marketCapCheckDuration === 0 || this.config.marketCapCheckInterval === 0) {
      return;
    }

    const timesToCheck = this.config.marketCapCheckDuration / this.config.marketCapCheckInterval;
    let timesChecked = 0;

    do {
      try {
        const marketCap = await this.getTokenMarketCap(poolKeys, mint)


        logger.debug(
          { mint: mint.toString() },
          `Current Market Cap: ${marketCap.toFixed()} | Target Market Cap: ${Number(TARGET_SELL_MARKET_CAP).toFixed()} `,
        );
        if (marketCap >= Number(TARGET_SELL_MARKET_CAP)) {
          break;
        }


        await sleep(this.config.marketCapCheckInterval);
      } catch (e) {
        logger.trace({ mint: mint.toString(), e }, `Failed to check token price`);
      } finally {
        timesChecked++;
      }
    } while (timesChecked < timesToCheck);
  }

  private async swap(
    poolKeys: LiquidityPoolKeysV4,
    ataIn: PublicKey,
    ataOut: PublicKey,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: TokenAmount,
    slippage: number,
    wallet: Keypair,
    direction: 'buy' | 'sell',
  ) {
    const slippagePercent = new Percent(slippage, 100);
    const poolInfo = await Liquidity.fetchInfo({
      connection: this.connection,
      poolKeys,
    });

    const computedAmountOut = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut: tokenOut,
      slippage: slippagePercent,
    });

    const latestBlockhash = await this.connection.getLatestBlockhash();
    const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
      {
        poolKeys: poolKeys,
        userKeys: {
          tokenAccountIn: ataIn,
          tokenAccountOut: ataOut,
          owner: wallet.publicKey,
        },
        amountIn: amountIn.raw,
        minAmountOut: computedAmountOut.minAmountOut.raw,
      },
      poolKeys.version,
    );

    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...(direction === 'buy'
          ? [
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey,
              ataOut,
              wallet.publicKey,
              tokenOut.mint,
            ),
          ]
          : []),
        ...innerTransaction.instructions,
        ...(direction === 'sell' ? [createCloseAccountInstruction(ataIn, wallet.publicKey, wallet.publicKey)] : []),
      ],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallet, ...innerTransaction.signers]);

    return this.txExecutor.executeAndConfirm(transaction, wallet, latestBlockhash);
  }
  private async getTokenMarketCap(poolKeys: LiquidityPoolKeysV4, mint: PublicKey): Promise<number> {
    try {
      const poolInfo = await Liquidity.fetchInfo({
        connection: this.connection,
        poolKeys,
      });
      const solPrice = await this.getUsdPrice()
      logger.debug(
        ` Solana Price: ${solPrice}`,
      );
      const tokenPrice = ((Number(poolInfo.baseReserve) / 1e9) / (Number(poolInfo.quoteReserve) / 1e6)) * solPrice
      const totalSupply = await this.connection.getTokenSupply(new PublicKey(mint))
      return Number(totalSupply.value.uiAmount) * tokenPrice
    } catch (e) {
      return 0
    }
  }

  private async getUsdPrice(): Promise<number> {
    try {
      if (this.requestCount == 5) {

        return this.solPriceCached
      } else {
        this.requestCount++
        const raydium = await Raydium.load({
          connection: this.connection,
        })
        const poolId = "8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj" // sol/usdc  pool id
        const pool = await raydium.api.fetchPoolById({
          ids: poolId
        })
        this.solPriceCached = pool[0].price

        return this.solPriceCached
      }
    } catch (e) {
      return this.solPriceCached
    }
  }
}
