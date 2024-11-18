const TelegramBot = require("node-telegram-bot-api");
const {
  setCustomCommands,
  getTotalLpDistributed,
  getTotalEtthlinqBurned,
  getLpTokenPrice,
  getPendingRewards,
  totalLPStaked,
  totalSigmaStaked,
  currentEthReward,
  distributedEthReward,
  lpTokenPrice,
  sigma33Price,
  sigma33LpDistributed,
  sigma33TokenDistributed,
} = require("./app/helper");
const { env } = require("./environment");
const bot = new TelegramBot(env.BOT_TOKEN, { polling: true });

setCustomCommands(bot);

const commandsRecheck = (command) => {
  if (command?.startsWith("/s33lpstaked")) {
    return "/s33lpstaked";
  } else if (command?.startsWith("/s33staked")) {
    return "/s33staked";
  } else if (command?.startsWith("/s33lp_price")) {
    return "/s33lp_price";
  } else if (command?.startsWith("/s33price")) {
    return "/s33price";
  } else if (command?.startsWith("/s33price")) {
    return "/s33price";
  } else if (command?.startsWith("/s33lp_distributed")) {
    return "/s33lp_distributed";
  } else if (command?.startsWith("/s33_distributed")) {
    return "/s33_distributed";
  }
};

bot.on("message", async (msg) => {
  const chatId = msg?.chat?.id;
  const forumTopic = msg?.message_thread_id;

  console.log("chatId", msg);

  const messageText = msg?.text;

  if (messageText?.startsWith("/")) {
    let command = messageText.split(" ")[0];
    command = commandsRecheck(command);

    // Handle commands as usual
    switch (command) {
      case "/s33lpstaked":
        totalLPStaked(chatId, bot, forumTopic);
        break;
      case "/s33staked":
        totalSigmaStaked(chatId, bot, forumTopic);
        break;
      case "/s33lp_price":
        lpTokenPrice(chatId, bot, forumTopic);
        break;
      case "/s33price":
        sigma33Price(chatId, bot, forumTopic);
        break;
      case "/s33lp_distributed":
        sigma33LpDistributed(chatId, bot, forumTopic);
        break;
      case "/s33_distributed":
        sigma33TokenDistributed(chatId, bot, forumTopic);
        break;
      default:
        console.log("messageText.startsWith");
        break;
    }
  }
});

const runTgCommands = () => {};
module.exports = { runTgCommands };
