import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { Logger } from '../src/utils/logger';

/**
 * Test Telegram bot connection
 * Usage: ts-node scripts/test-telegram.ts
 */

async function testTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set in environment');
    process.exit(1);
  }

  if (!chatId) {
    console.error('❌ TELEGRAM_CHAT_ID not set in environment');
    process.exit(1);
  }

  console.log('🤖 Testing Telegram bot connection...');
  console.log(`Bot Token: ${token.slice(0, 10)}...${token.slice(-5)}`);
  console.log(`Chat ID: ${chatId}`);

  try {
    const bot = new TelegramBot(token);

    // Test bot info
    const botInfo = await bot.getMe();
    console.log(`\n✅ Bot connected successfully!`);
    console.log(`Bot Username: @${botInfo.username}`);
    console.log(`Bot Name: ${botInfo.first_name}`);

    // Test sending message
    console.log(`\n📤 Sending test message...`);
    await bot.sendMessage(chatId, '✅ Telegram bot is working! This is a test message from Cetus Optimizer.');
    console.log(`✅ Test message sent successfully to chat ${chatId}`);

    // Test receiving updates
    console.log(`\n📥 Testing message reception...`);
    console.log(`Send a message to @${botInfo.username} to test...`);
    
    bot.on('message', (msg) => {
      console.log(`\n📨 Received message: ${msg.text}`);
      console.log(`From: ${msg.from?.first_name} (${msg.from?.id})`);
    });

    // Wait for messages
    console.log(`\n⏳ Waiting for messages (press Ctrl+C to exit)...`);
    
    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n\n👋 Exiting...');
      process.exit(0);
    });

  } catch (error: any) {
    console.error('\n❌ Telegram bot test failed:');
    console.error(`Error: ${error.message}`);
    
    if (error.response) {
      console.error(`Response: ${JSON.stringify(error.response, null, 2)}`);
    }

    if (error.message.includes('Unauthorized')) {
      console.error('\n💡 Possible issues:');
      console.error('1. Bot token is incorrect');
      console.error('2. Bot has been deleted or revoked');
      console.error('3. Check token at https://t.me/BotFather');
    }

    if (error.message.includes('chat not found')) {
      console.error('\n💡 Possible issues:');
      console.error('1. Chat ID is incorrect');
      console.error('2. Bot has not been started - send /start to the bot');
      console.error('3. Get your chat ID using @userinfobot');
    }

    process.exit(1);
  }
}

testTelegramBot();

