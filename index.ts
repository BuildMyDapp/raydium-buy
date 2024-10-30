import { Connection } from '@solana/web3.js';
import dotenv from "dotenv"
dotenv.config()

import { LIQUIDITY_STATE_LAYOUT_V4, MAINNET_PROGRAM_ID, Token } from '@raydium-io/raydium-sdk';
import bs58 from 'bs58';
import { retrieveEnvVariable } from './env';
import { logger } from './logger';

const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT', logger);


const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT', logger);


const connection = new Connection(RPC_ENDPOINT, {
  wsEndpoint: RPC_WEBSOCKET_ENDPOINT,
  commitment: "confirmed",
});

async function  subscribeToRaydiumPools(config: { quoteToken: Token }) {
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
        }

      },
      connection.commitment,
      [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
            bytes: config.quoteToken.mint.toBase58(),
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
    );
  }



async function main(){
  await subscribeToRaydiumPools({
    quoteToken:Token.WSOL,
  });
}
  
main()