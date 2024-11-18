import { retrieveEnvVariable } from "../env";
import { logger } from "../logger";
import CommonUtils from "../utils/common";
import { addNotSellToken, deleteNotSellToken, getNotSellToken, listOfBoughtToken } from "./methods";
const TelegramBot = require("node-telegram-bot-api");

// Environment configuration
const botToken: string = retrieveEnvVariable("BOT_TOKEN", logger);
const bot = new TelegramBot(botToken, { polling: true });

// Set custom commands
CommonUtils.setCustomCommands(bot);

// Recheck commands function
const commandsRecheck = (command: string): string | undefined => {
  if (command?.toLowerCase().startsWith("/add_not_sell_token")) {
    return "/add_not_sell_token";
  } else if (command?.startsWith("/list_not_sell_token")) {
    return "/list_not_sell_token";
  } else if (command?.startsWith("/delete_not_sell_token")) {
    return "/delete_not_sell_token";
  } else if (command?.startsWith("/list_of_bought_tokens")) {
    return "/list_of_bought_tokens";
  } 
  return undefined; // Return undefined if no match is found
};

// Handle incoming messages
bot.on("message", async (msg:any) => {
  const chatId = msg?.chat?.id;
  const forumTopic = msg?.message_thread_id;
  const messageText = msg?.text;

  console.log("chatId", msg,messageText);

  if (messageText?.startsWith("/")) {
    let command = messageText.split(" ")[0];
    command = commandsRecheck(command);

    if (command) {
      // Handle commands as usual
      switch (command) {
        case "/add_not_sell_token":
           addNotSellToken(chatId, bot,messageText);
          break;
        case "/list_not_sell_token":
          await getNotSellToken(chatId, bot);
          break;
        case "/delete_not_sell_token":
          await deleteNotSellToken(chatId, bot, messageText);
          break;
        case "/list_of_bought_tokens":
          await listOfBoughtToken(chatId, bot);
          break;
        default:
          console.log("Unknown command:", command);
          break;
      }
    }
  }
});

// Define and export `runTgCommands`
const runTgCommands = (): void => {
  console.log("Telegram commands handler is running.");
};

export { runTgCommands };
