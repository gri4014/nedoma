const { Telegraf } = require('telegraf');

// Use the bot token provided by the user
const BOT_TOKEN = '7545765283:AAEu4H1jcoA1UHFGtflC5nSoMOOW3dgRIEM';

// Use local IP for development
const os = require('os');
const networks = os.networkInterfaces();
const localIp = Object.values(networks)
  .flat()
  .find(ip => ip.family === 'IPv4' && !ip.internal)?.address || 'localhost';

const WEB_APP_URL = `http://${localIp}:3004/telegram.html`;

console.log(`Telegram Mini App URL: ${WEB_APP_URL}`);

const bot = new Telegraf(BOT_TOKEN);

// Set up the bot's menu button to launch the mini app
bot.telegram.setMyCommands([
  { command: 'start', description: 'Запустить бота' },
  { command: 'help', description: 'Получить помощь' },
]);

// Handle /start command
bot.command('start', async (ctx) => {
  await ctx.reply('Добро пожаловать в NEDOMA!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть приложение', web_app: { url: WEB_APP_URL } }]
      ]
    }
  });
  
  // Set the menu button to open the web app
  await ctx.setChatMenuButton({
    type: 'web_app',
    text: 'Открыть NEDOMA',
    web_app: { url: WEB_APP_URL }
  });
});

// Handle /help command
bot.command('help', (ctx) => {
  ctx.reply('NEDOMA - приложение для поиска интересных событий в вашем городе.');
});

// Launch the bot
bot.launch().then(() => {
  console.log('Bot started');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = bot;
