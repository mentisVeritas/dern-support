# 🚀 Dern Support Service Platform

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js&style=for-the-badge)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb&style=for-the-badge)](https://www.mongodb.com/)
[![EJS](https://img.shields.io/badge/EJS-Templates-yellow?logo=ejs&style=for-the-badge)](https://ejs.co/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/anadirov-9990s-projects/v0-dernsupportnodejsmain2)

---

## 📚 Описание

**Dern Support** — современная платформа для управления заявками на техническую поддержку с ролями: мастер, админ, клиент и гость. Поддерживает фильтрацию, назначение, смену статусов, отзывы, email-уведомления и многое другое.

---

## 🌐 Демо

▶️ [Онлайн-деплой (Vercel)](https://vercel.com/anadirov-9990s-projects/v0-dernsupportnodejsmain2)
▶️ [GitHub](https://github.com/mentisVeritas/dern-support)

---

## ⚡ Быстрый старт

```bash
# 1. Клонируйте репозиторий
 git clone https://github.com/mentisVeritas/dern-support.git
 cd dern-support

# 2. Установите зависимости
 npm install

# 3. Настройте .env (пример в .env)

# 4. Запустите MongoDB (локально или используйте Mongo Atlas)

# 5. Запустите проект
 npm run dev
# или
 npm start
```

---

## 👤 Демо-аккаунты (seed)

- **Мастер:** master@dern-support.com / master123
- **Админ:** admin@dern-support.com / admin123
- **Клиент:** customer@example.com / customer123

---

## 🛠️ Основные возможности

- Мастер: полный контроль, назначение, одобрение, выставление цены, аналитика
- Админ: просмотр и смена статуса заявок, управление пользователями
- Клиент: создание и отслеживание заявок, профиль, отзывы
- Гость: быстрая заявка без регистрации, автоматическое создание аккаунта
- Email-уведомления, фильтры, аналитика, современный UI

---

## 📂 Структура проекта

- `app.js` — основной сервер
- `routes/` — роуты для master, admin, customer, guest
- `models/` — модели MongoDB (User, SupportRequest, и др.)
- `views/` — EJS-шаблоны (admin, master, customer, partials)
- `public/` — статика (css, js)
- `seed/seed.js` — генерация тестовых данных

---

## 📝 Лицензия

MIT

---

> Разработано с ❤️ для поддержки и автоматизации сервисных процессов.

---

### 📸 Скриншоты

| Главная | Админ-панель | Мастер-панель |
|---|---|---|
| ![](public/screenshots/main.png) | ![](public/screenshots/admin.png) | ![](public/screenshots/master.png) |

---

### ❓ FAQ

- **Как добавить нового пользователя?**  — Через seed или регистрацию.
- **Как сменить роль?** — Только мастер или админ через панель управления.
- **Как развернуть на сервере?** — Настройте .env, MongoDB и запустите через `npm start`.

---

### 📬 Контакты

- [GitHub Issues](https://github.com/mentisVeritas/dern-support/issues)
- Email: mentisveritas@gmail.com
