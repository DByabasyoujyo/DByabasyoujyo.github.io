// あなたの設定
const paymentMasterSheetId = '1hKqWc-_WouU3jR-Wy_-ZbUc9AMlOLz19d9sxYlk45bU';
const itemMasterSheetId = '1L5viaDV32nFQVkIJWPYD_jL3ec5qwlcUKTMZYfTD7ok';
const shopDBSheetId = '1w915GAUC8xBumD6KQPmCX25PlghKi78V2TouDyfCMPA';

// スプレッドシートからデータを読み込む関数
async function loadSheet(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  return json.table.rows.map(row => row.c.map(c => c?.v ?? ""));
}

// 初期化処理
async function init() {
  const paymentMaster = await loadSheet(paymentMasterSheetId);
  const itemMaster = await loadSheet(itemMasterSheetId);
  const shopDataRaw = await loadSheet(shopDBSheetId);

  const paySelects = [document.getElementById('payItem'), document.getElementById('formPayItem')];
  const receiveSelects = [document.getElementById('receiveItem'), document.getElementById('formReceiveItem')];

  paymentMaster.forEach(([item]) => {
    paySelects.forEach(select => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    });
  });

  itemMaster.forEach(([item]) => {
    receiveSelects.forEach(select => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    });
  });

  window.shopItems = shopDataRaw.map(row => {
    const [receiveItemName, receiveQuantity, payItemName, payQuantityDiscounted, discountRate, location] = row;
    const discountRateNum = parseFloat(discountRate) || 0;
    const discountedPay = parseFloat(payQuantityDiscounted);
    const normalPay = (discountRateNum > 0) ? (discountedPay / (1 - discountRateNum / 100)) : discountedPay;
    return {
      receiveItemName,
      receiveQuantity: parseFloat(receiveQuantity),
      payItemName,
      payQuantityDiscounted: discountedPay,
      payQuantityNormal: normalPay,
      discountRate: discountRateNum,
      location
    };
  });
}

// レート計算関数
function calcRate(payAmount, receiveAmount) {
  return receiveAmount / payAmount;
}

// 比較ボタンの処理
document.getElementById('compareButton').addEventListener('click', function() {
  const payItem = document.getElementById('payItem').value;
  const payAmount = parseFloat(document.getElementById('payAmount').value);
  const receiveItem = document.getElementById('receiveItem').value;
  const receiveAmount = parseFloat(document.getElementById('receiveAmount').value);

  if (!payItem || !receiveItem || isNaN(payAmount) || isNaN(receiveAmount)) {
    document.getElementById('compareResult').innerHTML = 'すべての項目を正しく入力してください！';
    return;
  }

  const userRate = calcRate(payAmount, receiveAmount);

  let results = `<p>あなたの交換レート：<strong>1 ${payItem} あたり ${userRate.toFixed(2)} ${receiveItem}</strong></p>`;

  let shopComparisons = [];

  window.shopItems.forEach(shop => {
    if (shop.payItemName === payItem && shop.receiveItemName.includes(receiveItem)) {
      const shopRate = calcRate(shop.payQuantityDiscounted, shop.receiveQuantity);
      shopComparisons.push({
        location: shop.location,
        shopRate,
        shopName: `${shop.payQuantityDiscounted} ${shop.payItemName}（割引${shop.discountRate}%） → ${shop.receiveQuantity} ${shop.receiveItemName}`
      });
    }
  });

  if (shopComparisons.length === 0) {
    results += `<p>比較対象が見つかりませんでした。</p>`;
  } else {
    results += `<table><thead><tr><th>ショップ交換</th><th>交換レート (1 ${payItem} あたり)</th><th>結果</th></tr></thead><tbody>`;
    shopComparisons.forEach(sc => {
      const better = (userRate > sc.shopRate) ? "あなたの方がお得！" : "ショップの方がお得！";
      results += `<tr>
                    <td>${sc.shopName} @ ${sc.location}</td>
                    <td>${sc.shopRate.toFixed(2)} ${receiveItem}</td>
                    <td><strong>${better}</strong></td>
                  </tr>`;
    });
    results += `</tbody></table>`;
  }

  document.getElementById('compareResult').innerHTML = results;
});

// ショップDB登録ボタンの処理（ローカルDBにpush）
document.getElementById('addShopItemButton').addEventListener('click', function() {
  const receiveItem = document.getElementById('formReceiveItem').value;
  const receiveAmount = parseFloat(document.getElementById('formReceiveAmount').value);
  const payItem = document.getElementById('formPayItem').value;
  const payAmount = parseFloat(document.getElementById('formPayAmount').value);
  const discountRate = parseFloat(document.getElementById('formDiscountRate').value) || 0;
  const location = document.getElementById('formLocation').value;

  if (!receiveItem || isNaN(receiveAmount) || !payItem || isNaN(payAmount) || !location) {
    document.getElementById('addResult').innerText = 'すべての項目を正しく入力してください！';
    return;
  }

  const normalPay = (discountRate > 0) ? (payAmount / (1 - discountRate / 100)) : payAmount;

  const newItem = {
    receiveItemName: receiveItem,
    receiveQuantity: receiveAmount,
    payItemName: payItem,
    payQuantityDiscounted: payAmount,
    payQuantityNormal: normalPay,
    discountRate: discountRate,
    location: location
  };

  window.shopItems.push(newItem); // ローカルDBに追加！！！

  document.getElementById('addResult').innerText = '登録成功！🎉';
  console.log('新しいショップデータが追加されました', newItem);
});

// ページ起動時にデータ読み込み
init();