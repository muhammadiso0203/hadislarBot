import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { Context, Markup, Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BotService {
  private hadis: any[] = [];
  private users: any[] = [];
  private books: any[] = [];
  private admins: string[] = [];
  private ism: { id: number; ism: string; manosi: string }[] = [];
  private addHadisSession = new Map<number, boolean>();
  private deleteHadisSession = new Map<number, boolean>();
  private addBookSession = new Map<number, boolean>();
  private deleteBookSession = new Map<number, boolean>();
  private addAdminSession = new Map<number, boolean>();
  private ismPageSession = new Map<number, number>();

  private sendIsmPage(ctx: Context, page: number) {
    const itemsPerPage = 10;
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const slice = this.ism.slice(start, end);

    if (slice.length === 0) {
      return ctx.reply('✅ Barcha ismlar ko‘rsatildi.');
    }

    let msg = `<b>🕌 Allohning 99 go‘zal ismlari</b>\n\n`;

    slice.forEach((item) => {
      msg += `<b>${item.id}. ${item.ism}</b> – ${item.manosi}\n`;
    });

    const keyboard: Array<ReturnType<typeof Markup.button.callback>[]> = [];
    if (end < this.ism.length) {
      keyboard.push([
        Markup.button.callback('➡️ Davomi', `ism_next_${page + 1}`),
      ]);
    }

    ctx.replyWithHTML(msg, Markup.inlineKeyboard(keyboard));
  }

  constructor(private configService: ConfigService) {
    try {
      const hadithsPath = path.resolve('public', 'hadis.json');
      this.hadis = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
      console.log(`✅ ${this.hadis.length} ta hadis yuklandi.`);
    } catch (error) {
      console.error('❌ Hadis faylini yuklashda xatolik:', error);
    }
    try {
      const usersPath = path.resolve('public', 'users.json');

      this.users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      console.log(usersPath);
      console.log('User fayl yuklandi');
      console.log(usersPath);
    } catch (error) {
      console.log('Users.json faylini yuklab bo`lmadi');
    }

    try {
      const booksPath = path.resolve('public', 'books', 'books.json');
      console.log('📁 Kitoblar yo‘li:', booksPath);

      this.books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
      console.log(`📚 ${this.books.length} ta kitob yuklandi`);
    } catch (error) {
      console.log('❌ Kitob yuklashda xatolik:', error);
    }

    try {
      const adminsPath = path.resolve('public', 'admins.json');
      this.admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8'));
      console.log(`👑 ${this.admins.length} ta admin yuklandi`);
    } catch (error) {
      console.log('❌ Adminlar faylini yuklab bo‘lmadi:', error);
    }

    try {
      const adminsPath = path.resolve('public', 'admins.json');
      if (fs.existsSync(adminsPath)) {
        const raw = fs.readFileSync(adminsPath, 'utf8');
        this.admins = raw ? JSON.parse(raw) : [];
      } else {
        this.admins = [];
      }
    } catch (error) {
      console.log('❌ Adminlar faylini yuklab bo‘lmadi:', error);
      this.admins = [];
    }

    try {
      const ismlar = path.resolve('public', '99_ism.json');
      this.ism = JSON.parse(fs.readFileSync(ismlar, 'utf-8'));
      console.log(`${this.ism.length}-ism yuklandi`);
    } catch (error) {
      console.log('Ismlar yuklanmadi');
    }
  }

  private isAdmin(ctx: Context): boolean {
    const username = ctx.from?.username;
    return username ? this.admins.includes(username) : false;
  }

  init(bot: Telegraf<Context>) {
    bot.start((ctx) => {
      const fullName =
        `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim();
      ctx.reply(
        `🤖 Assalomu alaykum, ${fullName}!\n\nQuyidagilardan birini tanlang:`,
        Markup.keyboard([
          ['📜 Hadislar', '📚 Kitoblar'],
          ['🧿 Allohning 99 ismi'],
        ])
          .resize()
          .oneTime(),
      );
    });

    bot.hears('🧿 Allohning 99 ismi', (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      this.ismPageSession.set(userId, 0); // 0-dan boshlaymiz
      this.sendIsmPage(ctx, 0); // sahifani yuboramiz
    });

    // 1) 📜 Hadislar tugmasi bosilganda — foydalanuvchiga yo‘riqnoma chiqariladi
    bot.hears('📜 Hadislar', (ctx) => {
      ctx.reply(
        '📜 <b>Hadislar bo‘limi</b>\n\nQuyidagicha foydalanishingiz mumkin:\n\n' +
          '✍️ <code>hadis 1</code> — 1-raqamli hadis\n' +
          '🎲 <code>hadis random</code> — tasodifiy hadis\n\n' +
          'Masalan:\n<code>hadis 3</code> yoki <code>hadis random</code>',
        { parse_mode: 'HTML' },
      );
    });

    bot.hears(/^hadis(.*)/i, (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const messageText = ctx.message?.text || '';
      const parts = messageText.split(' ');

      const input = parts[1];

      if (!input) {
        return ctx.reply('❗ Misol: hadis 1 yoki hadis random');
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

    bot.hears('📚 Kitoblar', (ctx) => {
  if (!this.books.length) {
    return ctx.reply('📚 Hech qanday kitob mavjud emas.');
  }

  const buttons = this.books.map((book) => [
    Markup.button.callback(book.title, `book_${book.id}`),
  ]);

  ctx.reply('📚 Quyidagi kitoblardan birini tanlang:', Markup.inlineKeyboard(buttons));
});


    // PDF yuborish
    this.books.forEach((book) => {
  bot.action(`book_${book.id}`, (ctx) => {
    const filePath = path.resolve('public', 'books', book.file); // ✅ kitob fayli shu joyda
    if (!fs.existsSync(filePath)) {
      return ctx.reply('❌ Kitob topilmadi.');
    }

    return ctx.replyWithDocument({
      source: filePath,
      filename: book.title + '.pdf',
    });
  });
});


    bot.command('testhadis', (ctx: Context) => {
      const hadis3 = this.hadis.find((h) => h.id === 3);
      if (!hadis3) return ctx.reply('3-hadis topilmadi.');
      ctx.reply(`✅ Test hadis #3:\n\n${hadis3.text}`);
    });

    bot.command('admin', (ctx) => {
      if (!this.isAdmin(ctx)) {
        return ctx.reply('Siz admin emassiz');
      }

      return ctx.reply(
        '👤 Admin paneliga xush kelibsiz. Quyidagilardan birini tanlang:',
        Markup.inlineKeyboard([
          [
            Markup.button.callback('📜 Hadislar ro`yxati', 'hadis_list'),
            Markup.button.callback('➕ Hadis qo‘shish', 'hadis_add'),
          ],
          [
            Markup.button.callback('❌ Hadis o‘chirish', 'hadis_delete'),
            Markup.button.callback('➕ Admin qo‘shish', 'admin_add'),
          ],
          [
            Markup.button.callback('📚 Kitoblar ro‘yxati', 'book_list'),
            Markup.button.callback('📤 Kitob qo‘shish', 'book_add'),
          ],
          [
            Markup.button.callback('🗑 Kitob o‘chirish', 'book_delete'),
            Markup.button.callback('👥 Adminlar ro‘yxati', 'admin_list'),
          ],
          [
            Markup.button.callback('📊 Statistika', 'stat'),
            Markup.button.callback('🚪 Paneldan chiqish', 'exit'),
          ],
        ]),
      );
    });

    bot.action('exit', async (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      await ctx.editMessageReplyMarkup(undefined);
      return ctx.reply('✅ Admin paneldan chiqdingiz.');
    });

    bot.action('hadis_add', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      this.addHadisSession.set(ctx.from.id, true);
      ctx.reply('✍️ Yangi hadisni matn sifatida yuboring:');
    });

    bot.action('book_add', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      this.addBookSession.set(ctx.from.id, true);
      ctx.reply(
        '📚 Iltimos, kitob faylini (PDF formatda) jo‘nating. Fayl nomi kitob nomi bo‘ladi.',
      );
    });

    bot.action('book_delete', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q');

      this.deleteBookSession.set(ctx.from.id, true);
      ctx.reply('🗑 O‘chirmoqchi bo‘lgan kitob ID sini kiriting. Masalan: `2`');
    });

    bot.action('hadis_delete', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      this.deleteHadisSession.set(ctx.from.id, true); // delete rejimi
      ctx.reply('🗑 O‘chirmoqchi bo`lgan hadis ID sini yozing. Masalan: `3`');
    });

    bot.action('hadis_list', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      if (!this.hadis.length) {
        return ctx.reply('📜 Hadislar ro‘yxati bo‘sh.');
      }

      const list = this.hadis
        .map((h) => `#${h.id}: ${h.text.slice(0, 50)}...`)
        .join('\n');

      return ctx.reply(`📜 Hadislar ro‘yxati:\n\n${list}`);
    });

    bot.action('admin_add', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      this.addAdminSession.set(ctx.from.id, true);
      ctx.reply('👤 Yangi adminning Telegram ID sini yuboring:');
    });

    bot.action('stat', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo`q.');

      const totalHadis = this.hadis.length;
      const totalUsers = this.users.length;
      const adminId = process.env.ADMIN_ID || 'Nomaʼlum';

      const lastHadis =
        totalHadis > 0
          ? `#${this.hadis[this.hadis.length - 1].id}: ${this.hadis[this.hadis.length - 1].text.slice(0, 50)}...`
          : 'Hadislar mavjud emas.';

      // Bugungi qo`shilgan userlar soni (ixtiyoriy)
      const today = new Date().toISOString().split('T')[0];
      const newUsersToday = this.users.filter((u) =>
        u.joinedAt?.startsWith(today),
      ).length;

      const msg = `📊 <b>Statistika</b>:\n
      📜 Hadislar soni: <b>${totalHadis}</b>
      👥 Foydalanuvchilar soni: <b>${totalUsers}</b>
      🆕 Bugun qo‘shilganlar: <b>${newUsersToday}</b>
      📌 Oxirgi hadis: <i>${lastHadis}</i>
      👑 Admin ID: <code>${adminId}</code>`;

      ctx.replyWithHTML(msg);
    });

    bot.action(/ism_next_(\d+)/, (ctx) => {
      const match = ctx.match;
      if (!match) return;

      const nextPage = parseInt(match[1]);
      const userId = ctx.from?.id;
      if (!userId) return;

      this.ismPageSession.set(userId, nextPage);
      this.sendIsmPage(ctx, nextPage);
    });

    bot.action('book_list', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      if (!this.books.length) {
        return ctx.reply('📚 Kitoblar ro‘yxati bo‘sh.');
      }

      const list = this.books
        .map((b) => `#${b.id}: ${b.title} (${b.filename})`)
        .join('\n');

      return ctx.reply(`📚 Kitoblar ro‘yxati:\n\n${list}`);
    });

    bot.action('admin_list', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      if (!this.admins.length) {
        return ctx.reply('❌ Adminlar ro‘yxati bo‘sh.');
      }

      const list = this.admins
        .map((username, index) => `👤 ${index + 1}. ${username}`)
        .join('\n');

      return ctx.reply(`👥 Adminlar ro‘yxati:\n\n${list}`);
    });

    bot.on('text', (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const text = ctx.message?.text;
      if (!text) return;

      // ✅ Hadis qo‘shish rejimi
      if (this.addHadisSession.has(userId)) {
        const newId =
          this.hadis.length > 0 ? this.hadis[this.hadis.length - 1].id + 1 : 1;
        this.hadis.push({ id: newId, text });

        const filePath = path.resolve('public', 'hadis.json');

        fs.writeFileSync(filePath, JSON.stringify(this.hadis, null, 2));

        ctx.reply(`✅ Yangi hadis qo‘shildi (#${newId})`);
        this.addHadisSession.delete(userId);
        return;
      }

      // 🗑 Hadis o‘chirish rejimi
      if (this.deleteHadisSession.has(userId)) {
        const id = Number(text);
        if (isNaN(id)) {
          return ctx.reply('❌ Noto‘g‘ri ID kiritildi. Masalan: `3`');
        }

        const index = this.hadis.findIndex((h) => h.id === id);
        if (index === -1) {
          this.deleteHadisSession.delete(userId);
          return ctx.reply(`❌ #${id} raqamli hadis topilmadi.`);
        }

        this.hadis.splice(index, 1);
        const filePath = path.resolve('public', 'hadis.json');
        fs.writeFileSync(filePath, JSON.stringify(this.hadis, null, 2));

        this.deleteHadisSession.delete(userId);
        return ctx.reply(`✅ #${id} raqamli hadis muvaffaqiyatli o‘chirildi.`);
      }

      // 🗑 Kitob o‘chirish rejimi
      if (this.deleteBookSession.has(userId)) {
        const id = Number(text);
        if (isNaN(id)) {
          return ctx.reply('❌ Noto‘g‘ri ID kiritildi. Masalan: `2`');
        }

        const index = this.books.findIndex((b) => b.id === id);
        if (index === -1) {
          this.deleteBookSession.delete(userId);
          return ctx.reply(`❌ #${id} raqamli kitob topilmadi.`);
        }

        const removed = this.books.splice(index, 1)[0];

        const filePath = path.resolve('public', 'books', 'books.json');
        fs.writeFileSync(filePath, JSON.stringify(this.books, null, 2));

        this.deleteBookSession.delete(userId);
        return ctx.reply(`✅ "${removed.title}" kitobi (#${id}) o‘chirildi.`);
      }

      // ➕ Admin qo‘shish rejimi
      if (this.addAdminSession.has(userId)) {
        const username = text.replace('@', '').trim();

        if (!username) {
          return ctx.reply(
            '❌ Username topilmadi. Iltimos, qaytadan kiriting.',
          );
        }

        if (this.admins.includes(username)) {
          this.addAdminSession.delete(userId);
          return ctx.reply('❗ Bu foydalanuvchi allaqachon admin.');
        }

        this.admins.push(username);

        const filePath = path.resolve('public', 'admins.json');
        fs.writeFileSync(filePath, JSON.stringify(this.admins, null, 2));

        this.addAdminSession.delete(userId);
        return ctx.reply(
          `✅ Yangi admin qo‘shildi: <code>@${username}</code>`,
          { parse_mode: 'HTML' },
        );
      }
    });

    bot.on('document', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId || !this.addBookSession.has(userId)) return;

      const file = ctx.message.document;
      if (!file || !file.file_name || !file.file_name.endsWith('.pdf')) {
        return ctx.reply('❗ Faqat PDF fayl jo‘nating.');
      }

      const fileUrl = await ctx.telegram.getFileLink(file.file_id);
      const filePath = path.resolve('public', 'books', file.file_name);

      const response = await fetch(fileUrl.href);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));

      const newId =
        this.books.length > 0 ? this.books[this.books.length - 1].id + 1 : 1;
      this.books.push({
        id: newId,
        title: file.file_name.replace('.pdf', ''),
        file: file.file_name,
      });

      const booksJsonPath = path.resolve('public', 'books', 'books.json');
      fs.writeFileSync(booksJsonPath, JSON.stringify(this.books, null, 2));

      this.addBookSession.delete(userId);
      ctx.reply(`✅ Kitob "${file.file_name}" muvaffaqiyatli saqlandi.`);
    });
  }
}
