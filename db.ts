import { neon } from '@neondatabase/serverless';
import { logger } from './logger';
import { retrieveEnvVariable } from './env';
const db_url = retrieveEnvVariable('DB_URL', logger);

const sql = neon(db_url);
export async function saveBuyTx( mint_address: string, pool_address:string,tx_hash: string | undefined,sol_amount:number,amount: number) {
    try {
      
        const tx = await sql(`
        INSERT INTO buys (mint_address, pool_address,tx_hash, sol_amount,amount)
      VALUES (
   '${mint_address}',
   '${pool_address}',
   '${tx_hash}',
   ${sol_amount}, 
   ${amount}
);`
    );
        console.log("db save ", tx);
    } catch (err) {
        console.log(err);
    }
}

export async function saveSellTx( mint_address: string,pool_address:string,  tx_hash: string|undefined,sol_amount:number,amount: number) {
    try {
        const tx = await sql(`
        INSERT INTO sells (mint_address, pool_address,tx_hash, sol_amount,amount, timestamp)
        VALUES (
         '${mint_address}',
           '${pool_address}',
           '${tx_hash}',
       ${sol_amount},
       ${amount}
        );`);
        console.log("db save ", tx);
    } catch (err) {
        console.log(err);
    }
}


 async function createBuyTable() {
    try {
        const tx = await sql(`CREATE TABLE buys (
    buy_id SERIAL PRIMARY KEY,
    mint_address VARCHAR(100) NOT NULL,
    pool_address VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(100) UNIQUE NOT NULL,
    sol_amount DECIMAL(20, 8) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
        timestamp DATE NOT NULL DEFAULT CURRENT_DATE
);`);
        console.log("table created", tx);
    } catch (err) {
        console.log(err);
    }
}
 async function createSellTable() {
    try {
        const tx = await sql(`CREATE TABLE sells (
    sell_id SERIAL PRIMARY KEY,
    mint_address VARCHAR(100) NOT NULL,
    pool_address VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(100) UNIQUE NOT NULL,
    sol_amount DECIMAL(20, 8) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
        timestamp DATE NOT NULL DEFAULT CURRENT_DATE);`);
        console.log("table created", tx);
    } catch (err) {
        console.log(err);
    }
}
async function deleteSellTable() {
    try {
        const tx = await sql(`drop TABLE sells`);
        console.log("table dropped ", tx);
    } catch (err) {
        console.log(err);
    }
}



async function deleteBuyTable() {
    try {
        const tx = await sql(`drop TABLE buys`);
        console.log("table dropped ", tx);
    } catch (err) {
        console.log(err);
    }
}





async function createNotForSaleTable() {
    try {
        const tx = await sql(`CREATE TABLE NotForSale (
    id SERIAL PRIMARY KEY,
    mint_address VARCHAR(100) NOT NULL
);`);
        console.log("table created", tx);
    } catch (err) {
        console.log(err);
    }
}


export async function getNotForSaleList() {
    try {
        const result = await sql(`SELECT * from NotForSale`)
        return result
    } catch (err) {
        console.log(err);
    }
}