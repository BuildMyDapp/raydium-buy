import BuyModel from './db/buy-schema';
import NotForSaleModel from './db/not-for-sale';
import SellModel from './db/sell-schema';

export async function saveBuyTx(mint_address: string, pool_address: string, tx_hash: string | undefined, sol_amount: number) {
    try {
        console.log(mint_address, pool_address, tx_hash, sol_amount)


        const tx = await BuyModel.create({
            mint_address,
            pool_address,
            tx_hash,
            sol_amount
        })
        console.log("db save ", tx);

    } catch (err) {
        console.log(err);
    }
}

export async function saveSellTx(mint_address: string, pool_address: string, tx_hash: string | undefined, amount: number) {
    try {
        console.log(mint_address, pool_address, tx_hash, amount)

        const tx = await SellModel.create({
            mint_address,
            pool_address,
            tx_hash,
            amount
        })

        console.log("db save ", tx);
    } catch (err) {
        console.log(err);
    }
}


//  async function createBuyTable() {
//     try {
//         const tx = await sql(`CREATE TABLE buys (
//     buy_id SERIAL PRIMARY KEY,
//     mint_address VARCHAR(100) NOT NULL,
//     pool_address VARCHAR(100) NOT NULL,
//     tx_hash VARCHAR(100) UNIQUE NOT NULL,
//     sol_amount DECIMAL(20, 8) NOT NULL,
//         timestamp DATE NOT NULL DEFAULT CURRENT_DATE
// );`);
//         console.log("table created", tx);
//     } catch (err) {
//         console.log(err);
//     }
// }

//  async function createSellTable() {
//     try {
//         const tx = await sql(`CREATE TABLE sells (
//     sell_id SERIAL PRIMARY KEY,
//     mint_address VARCHAR(100) NOT NULL,
//     pool_address VARCHAR(100) NOT NULL,
//     tx_hash VARCHAR(100) UNIQUE NOT NULL,
//     amount DECIMAL(20, 8) NOT NULL,
//         timestamp DATE NOT NULL DEFAULT CURRENT_DATE);`);
//         console.log("table created", tx);
//     } catch (err) {
//         console.log(err);
//     }
// }
// async function deleteSellTable() {
//     try {
//         const tx = await sql(`drop TABLE sells`);
//         console.log("table dropped ", tx);
//     } catch (err) {
//         console.log(err);
//     }
// }



// async function deleteBuyTable() {
//     try {
//         const tx = await sql(`drop TABLE buys`);
//         console.log("table dropped ", tx);
//     } catch (err) {
//         console.log(err);
//     }
// }





// async function createNotForSaleTable() {
//     try {
//         const tx = await sql(`CREATE TABLE NotForSale (
//     id SERIAL PRIMARY KEY,
//     mint_address VARCHAR(100) NOT NULL
// );`);
//         console.log("table created", tx);
//     } catch (err) {
//         console.log(err);
//     }
// }


export async function getNotForSaleList() {
    try {
        const result = await NotForSaleModel.find()
        return result
    } catch (err) {
        console.log(err);
    }
}