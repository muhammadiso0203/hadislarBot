import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot/bot.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const configService = app.get(ConfigService);
  const botToken = configService.get<string>('BOT_TOKEN');

  if (!botToken) {
    throw new Error('BOT_TOKEN not found in environment variables');
  }

  const bot = new Telegraf(botToken);
  const botService = app.get(BotService);

  botService.init(bot);

  await bot.launch();
  console.log('✅ Qur\'on va Hadis bot ishga tushdi!');

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
bootstrap();
