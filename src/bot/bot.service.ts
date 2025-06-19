import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { Context, Markup, Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotService {
  private hadis: any[] = [];
  private users: any[] = [];

  constructor(private configService: ConfigService) {
    try {
      const hadithsPath = path.resolve(__dirname, '..', 'data', 'data', 'hadis.json');
      this.hadis = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
      console.log(`✅ ${this.hadis.length} ta hadis yuklandi.`);
    } catch (error) {
      console.error('❌ Hadis faylini yuklashda xatolik:', error);
    }

    try {
      const usersPath = path.resolve(__dirname, '..', 'data', 'data', 'users.json');
      if (fs.existsSync(usersPath)) {
        this.users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      } else {
        this.users = [];
      }
    } catch (error) {
      console.log('Users.json faylini yuklab bo`lmadi');
    }
  }

  private isAdmin(ctx: Context): boolean {
    const adminID = Number(this.configService.get('ADMIN_ID'));
    return ctx.from?.id === adminID;
  }

  init(bot: Telegraf<Context>) {
    bot.start((ctx: Context) => {
      ctx.reply('🤖 Assalomu alaykum!\n\n📖 Qurʼon va Hadis botga xush kelibsiz.\n\nMisollar:\n/hadis 1\n/hadis random');
    });

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

    bot.command('testhadis', (ctx: Context) => {
      const hadis3 = this.hadis.find(h => h.id === 3);
      if (!hadis3) return ctx.reply("3-hadis topilmadi.");
      ctx.reply(`✅ Test hadis #3:\n\n${hadis3.text}`);
    });

    bot.command('admin', (ctx: Context) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply('Siz admin emassiz');
      }
      return ctx.reply(
        "👤 Admin paneliga xush kelibsiz. Quyidagilardan birini tanlang:",
        Markup.inlineKeyboard([
          [Markup.button.callback("📜 Hadislar ro`yxati", "admin_list")],
          [Markup.button.callback("➕ Hadis qo`shish", "admin_add")],
          [Markup.button.callback("❌ Hadis o`chirish", "admin_delete")],
          [Markup.button.callback("📊 Statistika", "admin_stat")]
        ])
      );
    });

    bot.action('admin_list', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply("❌ Ruxsat yo`q.");
      const list = this.hadis.slice(-10).map(h => `#${h.id}: ${h.text}`).join('\n\n');
      ctx.reply(`📝 Oxirgi 10 hadis:\n\n${list}`);
    });

    bot.action('admin_add', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply("❌ Ruxsat yo`q.");
      ctx.reply("✏️ Iltimos, yangi hadisni quyidagicha yuboring:\n`/hadis_add Yangi hadis matni`");
    });

    bot.action('admin_delete', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply("❌ Ruxsat yo`q.");
      ctx.reply("🗑 O`chirmoqchi bo`lgan hadis ID sini yuboring:\n`/hadis_del 3`");
    });

    bot.action('admin_stat', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply("❌ Ruxsat yo`q.");
      ctx.reply(`📊 Hadislar soni: ${this.hadis.length}\n👤 Foydalanuvchilar: ${this.users.length}`);
    });
  }
}
