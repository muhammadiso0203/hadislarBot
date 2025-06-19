import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { Context, Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotService {
  private hadis: any[] = [];
  private user: any[] = [];

  constructor(private configService: ConfigService) {
    try {
      const hadithsPath = path.resolve(__dirname, '..', 'data','data', 'hadis.json');
      this.hadis = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
      console.log(`✅ ${this.hadis.length} ta hadis yuklandi.`);
    } catch (error) {
      console.error('❌ Hadis faylini yuklashda xatolik:', error);
    }

    try {
      const userPath = path.resolve(__dirname, '..', 'data', 'data', 'hadis.json');
      if(fs.existsSync(userPath)){
        this.user = JSON.parse(fs.readFileSync(userPath, 'utf-8'));
      } else{
        this.user = [];
      }

    } catch (error) {
      console.log('Users.json faylini yuklab bo`lmadi');
      
    }
  }

  private IsAdmin = (ctx: Context): boolean{
    const adminID = Number(this.configService.get('ADMIN_ID'));
    return ctx.from?.id === adminID;
  }

  init(bot: Telegraf) {
    // Boshlanish
    bot.start((ctx: Context) => {
      ctx.reply('🤖 Assalomu alaykum!\n\n📖 Qurʼon va Hadis botga xush kelibsiz.\n\nMisollar:\n/hadis 1\n/hadis random');
    });

    // Hadis komandasi
    bot.command('hadis', (ctx) => {
      const input = ctx.message.text.split(' ')[1];

      if (!input) {
        return ctx.reply('❗ Misol: /hadis 1 yoki /hadis random');
      }

      if (['random', 'tasodifiy'].includes(input.toLowerCase())) {
        const rand = this.hadis[Math.floor(Math.random() * this.hadis.length)];
        return ctx.reply(`📜 Tasodifiy hadis:\n\n${rand.text}`);
      }

      const id = Number(input);
      const result = this.hadis.find((item) => item.id === id);

      if (result) {
        return ctx.reply(`📜 Hadis #${id}:\n\n${result.text}`);
      } else {
        return ctx.reply('❌ Bunday raqamdagi hadis topilmadi.');
      }
    });

    // Test komandasi (3-hadisni tekshirish uchun)
    bot.command('testhadis', (ctx: Context) => {
      const hadis3 = this.hadis.find(h => h.id === 3);
      if (!hadis3) return ctx.reply("3-hadis topilmadi.");
      ctx.reply(`✅ Test hadis #3:\n\n${hadis3.text}`);
    });
  }
}
