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
  private addHadisSession = new Map<number, boolean>();
  private deleteHadisSession = new Map<number, boolean>();
  private addBookSession = new Map<number, boolean>();
  private deleteBookSession = new Map<number, boolean>();

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
      const booksPath = path.resolve(
        'public',
        'books',
        'books.json',
      );
      console.log('📁 Kitoblar yo‘li:', booksPath);

      this.books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
      console.log(`📚 ${this.books.length} ta kitob yuklandi`);
    } catch (error) {
      console.log('❌ Kitob yuklashda xatolik:', error);
    }
  }

  private isAdmin(ctx: Context): boolean {
    const adminID = Number(process.env.ADMIN_ID);

    return ctx.from?.id === adminID;
  }

  init(bot: Telegraf<Context>) {
    bot.start((ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const username = ctx.from?.username || 'Nomaʼlum';
      const fullName =
        `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim();
      const joinedAt = new Date().toISOString();

      // Foydalanuvchi allaqachon ro'yxatda bormi?
      const alreadyExists = this.users.some((u) => u.id === userId);

      if (!alreadyExists) {
        const newUser = {
          id: userId,
          username,
          fullName,
          joinedAt,
        };

        this.users.push(newUser);

        // Faylga saqlash
        const usersPath = path.resolve('public', 'users.json');
        fs.writeFileSync(usersPath, JSON.stringify(this.users, null, 2));
        console.log(
          `✅ Yangi foydalanuvchi qo‘shildi: ${fullName} (${userId})`,
        );
      }

      ctx.reply(
        '🤖 Assalomu alaykum!\n\n📖 Qurʼon va Hadis botga xush kelibsiz.\n\nMisollar:\n/hadis 1\n/hadis random',
      );
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

    bot.command('books', (ctx) => {
      const buttons = this.books.map((book) => [
        Markup.button.callback(book.title, `book_${book.id}`),
      ]);
      ctx.reply('📚 Mavjud kitoblar:', Markup.inlineKeyboard(buttons));
    });

    // PDF yuborish
    this.books.forEach((book) => {
      bot.action(`book_${book.id}`, (ctx) => {
        const filePath = path.resolve(
          'public',
          'books',
          'books.json',
        );
        
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
          [Markup.button.callback('📜 Hadislar ro`yxati', 'admin_list')],
          [Markup.button.callback('➕ Hadis qo`shish', 'hadis_add')],
          [Markup.button.callback('📚 Kitob qo`shish', 'book_add')],
          [Markup.button.callback('🗑 Kitob o‘chirish', 'book_delete')],
          [Markup.button.callback('❌ Hadis o`chirish', 'admin_delete')],
          [Markup.button.callback('📊 Statistika', 'admin_stat')],
        ]),
      );
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

        const filePath = path.resolve(
          'public',
          'books',
          'books.json',
        );
        fs.writeFileSync(filePath, JSON.stringify(this.books, null, 2));

        this.deleteBookSession.delete(userId);
        return ctx.reply(`✅ "${removed.title}" kitobi (#${id}) o‘chirildi.`);
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
      const filePath = path.resolve(
        'public',
        'books',
        file.file_name,
      );

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

      const booksJsonPath = path.resolve(
        'public',
        'books',
        'books.json',
      );
      fs.writeFileSync(booksJsonPath, JSON.stringify(this.books, null, 2));

      this.addBookSession.delete(userId);
      ctx.reply(`✅ Kitob "${file.file_name}" muvaffaqiyatli saqlandi.`);
    });

    bot.action('admin_delete', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo‘q.');

      this.deleteHadisSession.set(ctx.from.id, true); // delete rejimi
      ctx.reply('🗑 O‘chirmoqchi bo`lgan hadis ID sini yozing. Masalan: `3`');
    });

    bot.action('admin_list', (ctx) => {
      if (!this.isAdmin(ctx)) return ctx.reply('❌ Ruxsat yo`q.');
      const list = this.hadis
        .slice(-10)
        .map((h) => `#${h.id}: ${h.text}`)
        .join('\n\n');
      ctx.reply(`📝 Oxirgi 10 hadis:\n\n${list}`);
    });

    bot.action('admin_stat', (ctx) => {
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
  }
}
