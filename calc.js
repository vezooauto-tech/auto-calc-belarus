// Курсы по умолчанию
const defRates = {
  USDCNY: 7.27,
  USDKRW: 1975,
  USDEUR: 0.852
};

let currentCountry = 'china';
let lastTotalCostUSD = 0;
let lastFullCostUSD = 0;
let lastData = {}; // для отправки

// ---------- localStorage ----------
function saveRates() {
    localStorage.setItem('rates', JSON.stringify({
        USDCNY: document.getElementById('rateUSDCNY').value,
        USDKRW: document.getElementById('rateUSDKRW').value,
        USDEUR: document.getElementById('rateUSDEUR').value
    }));
}
function loadRates() {
    const r = JSON.parse(localStorage.getItem('rates') || '{}');
    if (r.USDCNY) document.getElementById('rateUSDCNY').value = r.USDCNY;
    if (r.USDKRW) document.getElementById('rateUSDKRW').value = r.USDKRW;
    if (r.USDEUR) document.getElementById('rateUSDEUR').value = r.USDEUR;
}
window.addEventListener('DOMContentLoaded', loadRates);
document.getElementById('rateUSDCNY').addEventListener('change', saveRates);
document.getElementById('rateUSDKRW').addEventListener('change', saveRates);
document.getElementById('rateUSDEUR').addEventListener('change', saveRates);

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
    if (engine === 'electro' || engine === 'gibrid') return 0;
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

// ---------- основной расчёт + скролл ----------
document.getElementById('calcForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));

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

    // прогноз полной цены = цена клиента + ВСЕ доп расходы (если введена)
    const clientUSD = Number(document.getElementById('clientPriceInput').value) || 0;
    const extraTotalUSD = utilUSD + customsFeeUSD + extraUSD; // все допы
    const fullCostUSD = clientUSD > 0 ? clientUSD + extraTotalUSD : totalCostUSD + extraTotalUSD;
    const fullCostEUR = fullCostUSD * USDEUR;

    lastTotalCostUSD = totalCostUSD;
    lastFullCostUSD = fullCostUSD;

    // заполняем блоки
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
      <div class="text-xl font-bold">$${totalCostUSD.toFixed(2)} / €${totalCostEUR.toFixed(2)}</div>
    `;

    // обновляем строки чек-боксов
    const checks = document.getElementById('expenseChecks');
    checks.innerHTML = `
      <label class="flex items-center gap-2"><input type="checkbox" checked disabled> Утилизационный сбор: $${utilUSD.toFixed(2)}</label>
      <label class="flex items-center gap-2"><input type="checkbox" checked disabled> Таможенный сбор: $${customsFeeUSD.toFixed(2)}</label>
      <label class="flex items-center gap-2"><input type="checkbox" checked disabled> Брокер: $${broker.toFixed(2)}</label>
      <label class="flex items-center gap-2"><input type="checkbox" checked disabled> СВХ: $${storage.toFixed(2)}</label>
      <label class="flex items-center gap-2"><input type="checkbox" checked disabled> Страховка: $${(insurance / USDEUR).toFixed(2)}</label>
    `;

    // прогноз полной цены
    const fullBlock = document.getElementById('fullPriceBlock');
    fullBlock.innerHTML = `<div class="text-xl font-bold">$${fullCostUSD.toFixed(2)} / €${fullCostEUR.toFixed(2)}</div>`;

    // показать блок и скролл
    const box = document.getElementById('resultBox');
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // сохраняем данные для отправки
    lastData = { ...d, totalCostUSD, fullCostUSD, totalCostEUR, fullCostEUR };
});

// ---------- маржа ----------
document.getElementById('calcMarginBtn').addEventListener('click', function () {
    const clientUSD = Number(document.getElementById('clientPriceInput').value);
    const margin = clientUSD - lastTotalCostUSD;
    document.getElementById('marginResult').textContent = `Маржа: $${margin.toFixed(2)}`;
    lastData.clientPrice = clientUSD;
    lastData.margin = margin;
    // обновляем прогноз полной цены
    const USDEUR = parseFloat(document.getElementById('rateUSDEUR')?.value || defRates.USDEUR);
    const extraTotalUSD = (357 / USDEUR) + (120 / USDEUR) + (300 / USDEUR) + (200 / USDEUR) + (lastData.priceEUR * 0.003 / USDEUR);
    const fullCostUSD = clientUSD > 0 ? clientUSD + extraTotalUSD : lastFullCostUSD;
    const fullCostEUR = fullCostUSD * USDEUR;
    document.getElementById('fullPriceBlock').innerHTML = `<div class="text-xl font-bold">$${fullCostUSD.toFixed(2)} / €${fullCostEUR.toFixed(2)}</div>`;
});

// ---------- ОТПРАВКА в таблицу (только по кнопке) ----------
document.getElementById('sendSheetBtn').addEventListener('click', function () {
    if (!lastData.totalCostUSD) { alert('Сначала рассчитайте стоимость'); return; }

    const sheetURL = lastData.route === 'china'
        ? 'https://script.google.com/macros/s/AKfycb.../exec' // ← вставь свой Китай
        : 'https://script.google.com/macros/s/AKfycb.../exec'; // ← вставь свой Корея

    fetch(sheetURL, {
        method: 'POST',
        body: JSON.stringify(lastData),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(() => {
            document.getElementById('sendResult').classList.remove('hidden');
            document.getElementById('sendSheetBtn').disabled = true;
        })
        .catch(() => alert('Ошибка отправки'));
});
