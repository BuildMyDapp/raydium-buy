import axios from "axios";
import { IBotFunction } from "../types/tg";

namespace CommonUtils {
    export const formatValue = (num: number | string): string => {
        const decimalPlaces: number = 4;
        const numValue: number = typeof num === "string" ? parseFloat(num) : num;
        const formattedNum: string = numValue.toFixed(decimalPlaces);
        return formattedNum.replace(/\.?0+$/, "");
    };

    export const objectToParams = (obj: { [key: string]: any }): string => {
        let str = "";
        for (const key in obj) {
            if (obj[key] !== undefined && obj[key] !== null) {
                if (str !== "") {
                    str += "&";
                }
                str += key + "=" + encodeURIComponent(obj[key]);
            }
        }
        return str;
    };

    export const getOrdinal = (number: number): string => {
        if (number === 0) {
            return "0th"; // Handle 0 separately
        }
        const lastDigit = number % 10;
        const lastTwoDigits = number % 100;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            return number + "th"; // Special case for 11th, 12th, and 13th
        }

        switch (lastDigit) {
            case 1:
                return number + "st";
            case 2:
                return number + "nd";
            case 3:
                return number + "rd";
            default:
                return number + "th";
        }
    };

    export const axiosRequests = async (
        endpoint: string,
        method: string,
        data?: any,
        params?: object,
        header?: any
    ) => {
        try {
            const config = {
                method: method,
                url: `${endpoint}`,
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...header,
                },
            };

            if (params) {
                (config as any).params = params;
            }

            if (["POST", "PUT"].includes(method)) {
                (config as any).data = data;
            }

            const response = await axios(config);

            return response;
        } catch (error) {
            console.error("Error making request:", error);
            throw error;
        }
    };

    const commands = [
        {
            command: "/info",
            description: "List of all available commands",
        },
        // {
        //     command: "/add_not_sell_token",
        //     description: "/add Not To Sell Token",
        // },
        {
            command: "/list_not_sell_token",
            description: "List Not To Sell Tokens",
        },
        // {
        //     command: "/delete_not_sell_token",
        //     description: "Delete Not To Sell Token",
        // },
        {
            command: "/list_of_bought_tokens",
            description: "List Of All Bought Tokens",
        },
    ];

    export const setCustomCommands = (bot: IBotFunction) => {
        bot
            .setMyCommands(commands)
            .then(() => {
                console.log("Custom commands set successfully!");
            })
            .catch((error: any) => {
                console.error("Error setting custom commands:", error.message);
            });
    };
}

export default CommonUtils;
