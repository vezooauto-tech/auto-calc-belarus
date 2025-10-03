# Калькулятор авто из Китая и Кореи (физлицо, Беларусь)

## Что делает
- Считает себестоимость (авто + доставка + пошлина) в USD и EUR
- Учитывает льготы и освобождение гибридов/электро до 31.12.2025
- Позволяет вручную задать цену клиента (USD) и видеть маржу
- Отправляет данные в **разные Google Sheets** (Китай / Корея)

## Быстрый старт (без терминала)
1. Создай репо на GitHub и залейте туда 3 файла (`index.html`, `calc.js`, `README.md`)
2. Импортируй репо в Netlify — получишь живой сайт
3. Создай 2 Google-таблицы и 2 Apps Script (инструкция ниже)
4. Вставь URLs скриптов в `calc.js` (строки 89-90)

## Настройка Google Sheets
### 1. Создай таблицы
- «Расчёты Китай»
- «Расчёты Корея»

### 2. Открой Apps Script (Extensions → Apps Script)
Скопируй код:

```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sh.appendRow([
    new Date(),
    data.name,
    data.year,
    data.priceLocal,
    data.currency,
    data.volume,
    data.engineType,
    data.privilege,
    data.route,
    data.totalCostUSD,
    data.clientPrice,
    data.margin,
    data.autoURL
  ]);
  return ContentService.createTextOutput("OK");
}
