import { Schema, model } from "mongoose";

let sellSchema = new Schema(
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

        amount: {
            type: Number,
            required: true,
        },

    },
    {
        timestamps: true,
    }
);

const SellModel = model(`solana-sell-schema`, sellSchema);

export default SellModel;
