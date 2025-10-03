// Курсы по умолчанию (можно менять в браузере)
const defRates = {
  USDCNY: 7.27,
  USDKRW: 1975,
  USDEUR: 0.852
};

let currentCountry = 'china';
let lastTotalCostUSD = 0;

// ---------- страна ----------
function updateCountryUI(country) {
  currentCountry = country;
  document.getElementById('btnChina').classList.toggle('active', country === 'china');
  document.getElementById('btnKorea').classList.toggle('active', country === 'korea');
  document.getElementById('currencyLabel').textContent = country === 'china' ? 'юань' : 'вона';
  document.getElementById('calcForm').currency.value = country === 'china' ? 'CNY' : 'KRW';
}
document.getElementById('btnChina').onclick = () => updateCountryUI('china');
document.getElementById('btnKorea').onclick = () => updateCountryUI('korea');

// ---------- пошлина ----------
function calcDutyEUR(age, volume, engine, privilege) {
  if (engine === 'electro' || engine === 'gibrid') return 0; // до 31.12.2025
  let rate;
  if (age < 3) rate = 2.5;
  else if (age <= 5) {
    if (volume <= 1000) rate = 1.5;
    else if (volume <= 1500) rate = 1.7;
    else if (volume <= 1800) rate = 2.5;
    else if (volume <= 2300) rate = 2.7;
    else if (volume <= 3000) rate = 3.0;
    else rate = 3.6;
  } else {
    if (volume <= 1500) rate = 2.7;
    else if (volume <= 2500) rate = 4.0;
    else rate = 5.8;
  }
  const duty = volume * rate;
  return privilege === 'yes' ? duty / 2 : duty;
}

// ---------- основной расчёт ----------
document.getElementById('calcForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));

  // курсы (безопасное чтение)
  const USDCNY = parseFloat(document.getElementById('rateUSDCNY')?.value || defRates.USDCNY);
  const USDKRW = parseFloat(document.getElementById('rateUSDKRW')?.value || defRates.USDKRW);
  const USDEUR = parseFloat(document.getElementById('rateUSDEUR')?.value || defRates.USDEUR);

  const age = 2025 - Number(d.year);
  const volume = Number(d.volume);
  const priceLocal = Number(d.priceLocal);
  const currency = d.currency;
  const engine = d.engineType;
  const privilege = d.privilege;

  // цена авто → USD
  const priceUSD = currency === 'CNY' ? priceLocal / USDCNY : priceLocal / USDKRW;
  const priceEUR = priceUSD * USDEUR;

  // доставка
  const deliveryUSD = currentCountry === 'china' ? 4460 : 4350;
  const deliveryEUR = deliveryUSD * USDEUR;

  // пошлина
  const dutyEUR = calcDutyEUR(age, volume, engine, privilege);
  const dutyUSD = dutyEUR / USDEUR;

  // утилизация и сборы
  const utilEUR = age <= 3 ? 178 : 357;
  const utilUSD = utilEUR / USDEUR;
  const customsFeeEUR = 120;
  const customsFeeUSD = customsFeeEUR / USDEUR;

  // итоговая стоимость (авто + доставка + пошлина)
  const totalCostUSD = priceUSD + deliveryUSD + dutyUSD;
  const totalCostEUR = totalCostUSD * USDEUR;

  // доп расходы
  const broker = 300;
  const storage = 200;
  const insurance = priceEUR * 0.003;
  const extraUSD = (broker + storage + insurance) / USDEUR;

  // прогноз полной цены
  const fullCostUSD = totalCostUSD + utilUSD + customsFeeUSD + extraUSD;
  const fullCostEUR = fullCostUSD * USDEUR;

  window.lastTotalCostUSD = totalCostUSD;

  const box = document.getElementById('resultBox');
  const res = document.getElementById('result');
  res.innerHTML = `
    <div><strong>Название и цвет:</strong> ${d.name}</div>
    <div><strong>Ссылка:</strong> <a href="${d.autoURL}" target="_blank" class="text-blue-600 underline">открыть</a></div>
    <div><strong>Комментарий:</strong> ${d.comment || '—'}</div>
    <div><strong>Год:</strong> ${d.year} (возраст ${age} лет)</div>
    <div><strong>Объём:</strong> ${volume} см³</div>
    <div><strong>Тип:</strong> ${engine}</div>
    <div><strong>Маршрут:</strong> ${currentCountry === 'china' ? 'Китай' : 'Корея'}</div>
    <div><strong>Льгота:</strong> ${privilege === 'yes' ? 'да' : 'нет'}</div>

    <div class="mt-4"><strong>Итоговая стоимость</strong> (авто + доставка + пошлина)</div>
    <div>$${totalCostUSD.toFixed(2)} / €${totalCostEUR.toFixed(2)}</div>

    <div class="mt-4"><strong>Прогноз полной цены</strong> (включая все расходы)</div>
    <div>$${fullCostUSD.toFixed(2)} / €${fullCostEUR.toFixed(2)}</div>
    <details class="mt-2 text-xs">
      <summary class="cursor-pointer">Расшифровка расходов</summary>
      <ul class="list-disc ml-5 mt-1">
        <li>Утилизационный сбор: $${utilUSD.toFixed(2)}</li>
        <li>Таможенный сбор: $${customsFeeUSD.toFixed(2)}</li>
        <li>Брокер: $${broker.toFixed(2)}</li>
        <li>СВХ: $${storage.toFixed(2)}</li>
        <li>Страховка: $${(insurance / USDEUR).toFixed(2)}</li>
      </ul>
    </details>
  `;
  box.classList.remove('hidden');
});

document.getElementById('calcMarginBtn').addEventListener('click', function () {
  const clientUSD = Number(document.getElementById('clientPriceInput').value);
  const margin = clientUSD - window.lastTotalCostUSD;
  document.getElementById('marginResult').textContent = `Маржа: $${margin.toFixed(2)}`;
  sendToGoogleSheets({...Object.fromEntries(new FormData(document.getElementById('calcForm'))), totalCostUSD: window.lastTotalCostUSD, clientPrice: clientUSD, margin});
});

// ---------- Google Sheets ----------
function sendToGoogleSheets(data) {
  const sheetURL = currentCountry === 'china'
    ? 'https://script.google.com/macros/s/AKfycb.../exec' // ← вставь свой Китай
    : 'https://script.google.com/macros/s/AKfycb.../exec'; // ← вставь свой Корея
  fetch(sheetURL, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {'Content-Type': 'application/json'}
  });
}
