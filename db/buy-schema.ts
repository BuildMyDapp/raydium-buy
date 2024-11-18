import { Schema, model } from "mongoose";

let buySchema = new Schema(
    {
        mint_address: {
            type: String,
            required: true,
        },

        pool_address: {
            type: String,
            required: true,
        },

        tx_hash: {
            type: String,
            required: true,
        },

        sol_amount: {
            type: Number,
            required: true,
        },

    },
    {
        timestamps: true,
    }
);

const BuyModel = model(`solana-buy-schema`, buySchema);

export default BuyModel;
