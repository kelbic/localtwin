# LocalTwin — Gate-0 Validation Landing & Lead Collector

Статический лендинг для проверки спроса Gate-0 и скрипт приёма заявок в Google Sheets + Telegram.

## Состав проекта

- `index.html` — самодостаточный однофайловый лендинг (HTML + CSS + vanilla JS, без внешних зависимостей).
- `Code.gs` — Google Apps Script для записи событий в Google Sheets и отправки уведомлений в Telegram.
- `README.md` — инструкция по настройке и деплою.

---

## 1. Локальная проверка `index.html`

Откройте `index.html` напрямую в браузере или поднимите локальный HTTP-сервер из папки проекта:

```bash
python3 -m http.server 8000
```

После этого откройте в браузере:
`http://localhost:8000/?utm_source=local_test`

Пока в `CONFIG.APPS_SCRIPT_URL` стоит плейсхолдер `REPLACE_WITH_...`, все события (`tab_excel`, `tab_docx`, `demo_step_3`, `lead_submit`, `crypto_tx`, `invoice_intent`) безопасно выводятся в DevTools Console без ошибок.

---

## 2. Подключение Google Sheets + `Code.gs` + Telegram

1. Создайте новую таблицу в Google Sheets (например, `LocalTwin Gate-0 Leads`).
2. Откройте меню **Extensions → Apps Script**.
3. Удалите шаблонный код и вставьте содержимое файла `Code.gs`, затем сохраните проект.
4. Добавьте секреты Telegram (в коде они **не** хранятся):
   - Откройте **Project Settings** (иконка шестерёнки слева) → блок **Script Properties** → **Add script property**.
   - Добавьте два свойства:
     - `TG_BOT_TOKEN` — токен вашего бота от `@BotFather`.
     - `TG_CHAT_ID` — ваш Chat ID (или ID канала/группы, куда добавлен бот).
5. Опубликуйте скрипт как Web App:
   - Нажмите **Deploy → New deployment**.
   - Тип: **Web app**.
   - **Execute as**: `Me`.
   - **Who has access**: `Anyone`.
   - Нажмите **Deploy**, выдайте разрешения скрипту и скопируйте итоговый **Web app URL** (`https://script.google.com/macros/s/.../exec`).
6. При первом POST-запросе `Code.gs` сам создаст строку заголовков:
   `timestamp | event_type | utm_source | selected_format | email | payment_status | tx_hash_or_note`

> **Важно:** после любых правок `Code.gs` создавайте новую версию через **Deploy → Manage deployments → Edit → New version**.

---

## 3. Пропишите конфиг в `index.html`

В начале тега `<script>` в файле `index.html` замените плейсхолдеры в объекте `CONFIG`:

```js
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec",
  CRYPTO_WALLET_EVM: "0xYOUR_USDC_BASE_OR_ARBITRUM_ADDRESS",
  CRYPTO_WALLET_TRC20: "T_YOUR_USDT_TRC20_ADDRESS"
};
```

---

## 4. Деплой на GitHub Pages

1. Создайте публичный репозиторий на GitHub (например, `localtwin-gate0`).
2. Загрузите файлы из текущей папки:

```bash
git init
git add index.html Code.gs README.md
git commit -m "Initial Gate-0 landing and Apps Script collector"
git branch -M main
git remote add origin https://github.com/<USERNAME>/<REPO>.git
git push -u origin main
```

3. В репозитории на GitHub откройте **Settings → Pages**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`
   - Нажмите **Save**.
4. Через 1–2 минуты лендинг будет доступен по адресу `https://<USERNAME>.github.io/<REPO>/`.
5. Проверьте сквозной поток: откройте URL с `?utm_source=smoke_test`, переключите вкладки демо, отправьте тестовую заявку и убедитесь, что строки появились в Google Sheets, а в Telegram пришёл алерт.
