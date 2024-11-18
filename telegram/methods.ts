import BuyModel from "../db/buy-schema";
import NotForSaleModel from "../db/not-for-sale";

export const addNotSellToken = async (chainId: string, bot: any, messageText: string) => {
    try {
        const match = messageText.toLowerCase().match(/^\/add_not_sell_token\s+(.+)$/);
        const extractedText = match ? match[1] : null;
        console.log("messageText", extractedText)

        await NotForSaleModel.create({
            mint_address: extractedText
        })

        bot.sendMessage(
            chainId,
            `Token Added`
        )
    }
    catch (error) {
        console.log("error", error)
    }
}

export const getNotSellToken = async (chainId: string, bot: any) => {
    try {
        const result = await NotForSaleModel.find();

        // Map tokens with formatting
        const tokens = result.map((item, index) => `token${index + 1} = ${item.mint_address}`).join("\n");

        console.log("Tokens:", tokens);

        // Send message to Telegram
        await bot.sendMessage(chainId, `Here are the tokens:\n\n${tokens}`);
    } catch (error) {
        console.error("Error fetching or sending tokens:", error);
        bot.sendMessage(chainId, "An error occurred while fetching tokens.");
    }
};

export const deleteNotSellToken = async (chainId: string, bot: any, messageText: string) => {
    try {
        const match = messageText.toLowerCase().match(/^\/delete_not_sell_token\s+(.+)$/);
        const extractedText = match ? match[1] : null;
        console.log("messageText", extractedText)

        await NotForSaleModel.deleteOne({ mint_address: extractedText });
        bot.sendMessage(
            chainId,
            `Token deleted`
        )
    }
    catch (error) {
        console.log("error", error)
    }
}

export const listOfBoughtToken = async (chainId: string, bot: any,) => {
    try {
        const result = await BuyModel.find()
        const tokens = result.map((item, index) => `token${index + 1} = ${item.mint_address}`).join("\n");


        await bot.sendMessage(chainId, `Here are the tokens you bought:\n\n${tokens}`);

    }
    catch (error) {
        console.log("error", error)
    }
}
