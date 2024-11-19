import axios, { AxiosResponse } from 'axios';

const SOLANA_RPC_ENDPOINT = process.env.RPC_ENDPOINT;
if (!SOLANA_RPC_ENDPOINT) {
    throw new Error("SOLANA_RPC_ENDPOINT environment variable is not defined.");
}

// Define types for responses
interface TokenAccount {
    address: string;
    amount: string;
}

interface TokenLargestAccountsResponse {
    jsonrpc: string;
    id: number;
    result: {
        value: TokenAccount[];
    };
}

interface AccountInfoResponse {
    jsonrpc: string;
    id: number;
    result: {
        value: {
            data: {
                parsed: {
                    info: {
                        owner: string;
                    };
                };
            };
        };
    };
}

// Function to get the largest token accounts of a token
async function getTokenLargestAccounts(tokenMintAddress: string): Promise<TokenAccount[] | null> {
    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenLargestAccounts",
        params: [tokenMintAddress, { commitment: "finalized" }],
    };

    const response = await makeRequestWithBackoff<TokenLargestAccountsResponse>(payload);
    const accounts = response?.data?.result.value;
    return accounts || null; // Returns the top 20 holders or null if none found
}

// Function to get the owner of a token account
async function getAccountOwner(tokenAccount: string): Promise<string | null> {
    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [tokenAccount, { encoding: "jsonParsed" }],
    };

    const response = await makeRequestWithBackoff<AccountInfoResponse>(payload);
    const owner = response?.data?.result.value.data.parsed.info.owner;
    return owner || null;
}

// Generic function to make a request with exponential backoff
async function makeRequestWithBackoff<T>(
    payload: Record<string, unknown>,
    maxRetries = 5,
    initialDelay = 1000
): Promise<AxiosResponse<T> | null> {
    let attempt = 0;
    let delay = initialDelay;

    while (attempt < maxRetries) {
        try {
            const response = await axios.post<T>(SOLANA_RPC_ENDPOINT!, payload, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            return response;
        } catch (error: any) {
            if (error.response && error.response.status === 429) {
                // Rate limit hit, wait and retry
                console.warn(`Rate limited, retrying in ${delay / 1000} seconds...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                attempt++;
            } else {
                console.error("Error in makeRequestWithBackoff:", error.message || error);
                return null; // Return null for other errors
            }
        }
    }
    console.error("Max retries reached. Request failed.");
    return null;
}

// Function to process the top holders of a token
async function processTopHolders(tokenAccounts: TokenAccount[]) {
    console.log("Processing top holders:");
    let result = []
    for (const tokenAccount of tokenAccounts) {
        console.log("-------------------");
        try {
            const accountOwner = await getAccountOwner(tokenAccount.address);
            console.log("Account Owner:", accountOwner || "Unknown");
            console.log("Token Balance:", tokenAccount.amount);

            result.push(tokenAccount.amount)

            // Additional processing can go here:
            // Example: Fetch SOL or other token balances for the owner
        }
        catch (error) {
            console.error("Error processing token account:", error);
        }
    }
    console.log("result", result)
    return result
}

// Main function to fetch and process token holders
export async function getTokenHoldersInfo(tokenAddress: string) {
    const topTokenAccounts = await getTokenLargestAccounts(tokenAddress);

    if (topTokenAccounts && topTokenAccounts.length > 0) {
        const result = await processTopHolders(topTokenAccounts);
        let total: any = result.reduce((sum, value) => sum + BigInt(value), BigInt(0));
        total = total.toString()

        return total
    } else {
        console.error("No token accounts found.");
    }
}

