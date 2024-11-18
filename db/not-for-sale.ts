import { Schema, model } from "mongoose";

let notForSaleSchema = new Schema(
    {
        mint_address: {
            type: String,
            required: true,
        },

    },
    {
        timestamps: true,
    }
);

const NotForSaleModel = model(`solana-not-for-sale`, notForSaleSchema);

export default NotForSaleModel;
