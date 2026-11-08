// ============================================================
// js/36-relic-breakthrough.js — 👑 亞丁城遺物突破
//   武器類遺物 → 固定傷害%加成（一星+25%／二星+50%／三星+100%），沒有詞綴、沒有重置。
//   防具／飾品類遺物 → 隨機詞綴綁定制：首次突破從詞綴池隨機抽 1 種綁定，之後星級只針對同一條加值；可花費材料重置(100%成功)重骰。
//   全系統風險最高的機制：武器突破失敗直接摧毀裝備（不是降階，是消失）；防具失敗打回未突破；飾品失敗只清詞綴。
//   保底：角色全域累計失敗計數，滿 10 次時下一次挑戰必定成功（不分星級/不分裝備/不分突破或重置）。
//         ⚠️ 一般天然成功不會清空計數——只有保底本身觸發的那次成功才歸零，失敗次數會持續累計、不因中途賭贏而被洗掉。
// ============================================================
'use strict';

const RELIC_STAR_LABELS = ['未突破', '★☆☆', '★★☆', '★★★'];
const RELIC_STAR_COLORS = ['#9ca3af', '#4ade80', '#60a5fa', '#fbbf24'];

// 武器類遺物：固定傷害%加成（不走詞綴系統），index = relicStar
const RELIC_WEAPON_STAR_BONUS = [0, 0.25, 0.50, 1.00];

// 詞綴池：僅供防具(12 選 1)與飾品(4 選 1，限爆擊向)使用，武器不使用詞綴系統。val 陣列 index 0~2 對應一星~三星的數值。
const RELIC_AFFIX_POOLS = {
  armor: [   // 防具遺物
    { key: 'physAtk', name: '⚔️ 物理攻擊', apply: 'physAtk', val: [15, 35, 60], text: v => `物理攻擊 +${v}` },
    { key: 'magicAtk', name: '🔮 魔法攻擊', apply: 'magicAtk', val: [8, 18, 30], text: v => `魔法攻擊 +${v}` },
    { key: 'str', name: '👑 力量', apply: 'str', val: [3, 7, 12], text: v => `力量 +${v}` },
    { key: 'dex', name: '🎯 敏捷', apply: 'dex', val: [3, 7, 12], text: v => `敏捷 +${v}` },
    { key: 'con', name: '🛡️ 體質', apply: 'con', val: [3, 7, 12], text: v => `體質 +${v}` },
    { key: 'int', name: '📘 智力', apply: 'int', val: [3, 7, 12], text: v => `智力 +${v}` },
    { key: 'wis', name: '✨ 精神', apply: 'wis', val: [3, 7, 12], text: v => `精神 +${v}` },
    { key: 'cha', name: '💫 魅力', apply: 'cha', val: [3, 7, 12], text: v => `魅力 +${v}` },
    { key: 'mpR', name: '🔷 回魔', apply: 'mpR', val: [5, 12, 20], text: v => `回魔 +${v}%` },
    { key: 'hpR', name: '❤️ 回血', apply: 'hpR', val: [5, 12, 20], text: v => `回血 +${v}%` },
    { key: 'resNone', name: '🛡️ 抗魔', apply: 'resNone', val: [5, 12, 20], text: v => `抗魔 +${v}%` },
    { key: 'atkSpdPct', name: '💨 攻擊速度', apply: 'atkSpdPct', val: [5, 12, 20], text: v => `攻擊速度 +${v}%` }
  ],
  accessory: [   // 飾品遺物（限爆擊向 4 選 1）
    { key: 'meleeCrit', name: '💥 物理爆率', apply: 'meleeCrit', val: [5, 12, 20], text: v => `物理爆擊率 +${v}%` },
    { key: 'magicCrit', name: '🔥 魔法爆率', apply: 'magicCrit', val: [5, 12, 20], text: v => `魔法爆擊率 +${v}%` },
    { key: 'meleeCritDmg', name: '🩸 物理爆傷', apply: 'meleeCritDmg', val: [30, 70, 120], text: v => `物理爆擊傷害 +${v}%` },
    { key: 'magicCritDmg', name: '🌋 魔法爆傷', apply: 'magicCritDmg', val: [30, 70, 120], text: v => `魔法爆擊傷害 +${v}%` }
  ]
};

const RELIC_BREAKTHROUGH_STEPS = [
  {   // 未突破(0) → 一星(1)
    successRate: 0.50, gold: 5000000,
    materials: [
      { id: 'sherine_crystal_relic', name: '遺物席琳結晶', count: 5 },
      { id: 'sherine_crystal', name: '席琳結晶', count: 20 },
      { id: 'aden_holy_emblem', name: '亞丁聖徽', count: 3 }
    ]
  },
  {   // 一星(1) → 二星(2)
    successRate: 0.25, gold: 20000000,
    materials: [
      { id: 'sherine_crystal_relic', name: '遺物席琳結晶', count: 15 },
      { id: 'sherine_crystal', name: '席琳結晶', count: 60 },
      { id: 'aden_holy_emblem', name: '亞丁聖徽', count: 10 }
    ]
  },
  {   // 二星(2) → 三星(3)
    successRate: 0.05, gold: 80000000,
    materials: [
      { id: 'sherine_crystal_relic', name: '遺物席琳結晶', count: 40 },
      { id: 'sherine_crystal', name: '席琳結晶', count: 150 },
      { id: 'aden_holy_emblem', name: '亞丁聖徽', count: 30 }
    ]
  }
];

const RELIC_RESET_COST = { gold: 500000, materials: [{ id: 'sherine_crystal_relic', name: '遺物席琳結晶', count: 3 }] };
const RELIC_RESET_SUCCESS_RATE = 1.00;   // 🔒 用戶定案：防具/飾品重置固定 100% 成功（武器完全沒有重置功能，見 getRelicPoolType 呼叫端的 wpn 排除）
const RELIC_PITY_THRESHOLD = 10;   // 累計失敗滿此數，下一次(突破或重置皆算)必定成功

// ---------- 一、可突破裝備清單（僅已裝備·武器/防具/飾品類遺物皆可）----------
function getRelicTargetItem() {
  if (!_relicSelectedUid || typeof player === 'undefined' || !player || !player.eq) return null;
  for (let k in player.eq) {
    let item = player.eq[k];
    if (item && (item.uid === _relicSelectedUid || item.id === _relicSelectedUid)) return item;
  }
  return null;
}
let _relicSelectedUid = null;


// 傳回 'weapon'(固定傷害%，無詞綴)／'armor'(12選1詞綴)／'accessory'(4選1詞綴)／null(不支援)
function getRelicPoolType(it) {
  if (!it || !it.id || typeof DB === 'undefined' || !DB.items) return null;
  let d = DB.items[it.id];
  if (!d || d.relic !== true) return null;
  if (d.type === 'wpn') return 'weapon';
  if (d.type === 'arm') return 'armor';
  if (d.type === 'acc') return 'accessory';
  return null;
}
function isRelicWeaponEligible(it) { return !!getRelicPoolType(it); }   // 沿用舊函式名稱供其他檔案呼叫，語意已擴大為「任何支援的遺物類型」
// 🔒 用戶定案：武器類遺物沒有重置功能，只有防具／飾品可以重置（且固定 100% 成功）
function isRelicResetEligible(it) {
  let pt = getRelicPoolType(it);
  return pt === 'armor' || pt === 'accessory';
}

function getRelicEligibleItems() {
  if (typeof player === 'undefined' || !player || !player.eq) return [];
  let out = [];
  for (let k in player.eq) {
    let it = player.eq[k];
    if (!it || !getRelicPoolType(it)) continue;
    out.push(Object.assign({ slotKey: k }, it));
  }
  return out;
}

function selectRelicItem(uid) {
  _relicSelectedUid = uid;
  renderRelicBreakthroughUI();
}

// 從對應詞綴池隨機挑 1 種，回傳 key（不含數值，數值依星級即時查表，見 applyRelicAffix）
function rollRelicAffixKey(poolType) {
  let pool = RELIC_AFFIX_POOLS[poolType] || [];
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].key;
}
function findRelicAffixDef(poolType, key) {
  return (RELIC_AFFIX_POOLS[poolType] || []).find(a => a.key === key) || null;
}

// ---------- 二、執行突破 ----------
function executeRelicBreakthrough() {
  let item = getRelicTargetItem();
  if (!item) { if (typeof alertSysMsg === 'function') alertSysMsg('請先選擇要突破的遺物！'); return; }
  let poolType = getRelicPoolType(item);
  if (!poolType) { if (typeof alertSysMsg === 'function') alertSysMsg('此裝備無法突破！僅武器、防具、飾品類遺物可進行遺物突破。'); return; }
  let star = item.relicStar || 0;
  if (star >= RELIC_BREAKTHROUGH_STEPS.length) { if (typeof alertSysMsg === 'function') alertSysMsg('此遺物已達最高星級「★★★」，無法再突破！'); return; }
  let step = RELIC_BREAKTHROUGH_STEPS[star];

  if ((player.gold || 0) < step.gold) { if (typeof alertSysMsg === 'function') alertSysMsg('金幣不足！需要 ' + step.gold.toLocaleString() + ' 金幣。'); return; }
  for (let mat of step.materials) {
    let have = (typeof countPlayerItem === 'function') ? countPlayerItem(mat.id) : 0;
    if (have < mat.count) { if (typeof alertSysMsg === 'function') alertSysMsg('材料不足！缺少 ' + mat.name + ' ×' + mat.count + '（目前持有：' + have + '）。'); return; }
  }

  // 扣費（不論成功失敗，材料金幣一律照扣不退還）
  player.gold -= step.gold;
  for (let mat of step.materials) { if (typeof consumePlayerItem === 'function') consumePlayerItem(mat.id, mat.count); }

  if (!player.relicPityCounter) player.relicPityCounter = 0;
  let forcedSuccess = player.relicPityCounter >= RELIC_PITY_THRESHOLD;
  let itemName = (typeof DB !== 'undefined' && DB.items[item.id] && DB.items[item.id].n) || item.id;

  if (forcedSuccess || Math.random() < step.successRate) {
    item.relicStar = star + 1;
    if (forcedSuccess) player.relicPityCounter = 0;   // 🔒 只有保底本身觸發的成功才歸零；一般天然成功不清空計數(失敗次數持續累計，不會被中途賭贏一次洗掉)
    let bonusText;
    if (poolType === 'weapon') {
      bonusText = `武器傷害 +${Math.round(RELIC_WEAPON_STAR_BONUS[star + 1] * 100)}%`;
    } else {
      if (star === 0) item.relicAffixKey = rollRelicAffixKey(poolType);   // 🎲 首次突破(未突破→一星)才隨機綁定詞綴，之後二/三星沿用同一條只加值
      let affDef = findRelicAffixDef(poolType, item.relicAffixKey);
      bonusText = `綁定詞綴：${affDef ? affDef.name : '（詞綴解析失敗）'}`;
    }
    let msg = forcedSuccess
      ? `👑 保底發動！${itemName} 必定突破成功，晉升為【${RELIC_STAR_LABELS[star + 1]}】！${bonusText}`
      : `👑 突破成功！${itemName} 晉升為【${RELIC_STAR_LABELS[star + 1]}】！${bonusText}`;
    if (typeof logSys === 'function') logSys(`<span style="color:${RELIC_STAR_COLORS[star + 1]};font-weight:bold;">${msg}</span>`);
  } else {
    player.relicPityCounter += 1;
    if (poolType === 'weapon') {
      // 🔒 用戶定案：武器類遺物失敗會直接消失（不是降星，是徹底損毀）
      let slotKey = null;
      for (let k in player.eq) { if (player.eq[k] === item) { slotKey = k; break; } }
      if (slotKey) delete player.eq[slotKey];
      _relicSelectedUid = null;
      if (typeof logSys === 'function') logSys(`<span class="text-red-500 font-bold">💥 突破失敗……${itemName} 在儀式中徹底粉碎，永遠消失了。（累計失敗 ${player.relicPityCounter}/${RELIC_PITY_THRESHOLD}，滿 ${RELIC_PITY_THRESHOLD} 次保底必成功）</span>`);
    } else if (poolType === 'armor') {
      // 🔒 用戶定案：防具類遺物失敗不會摧毀裝備，但星級與綁定詞綴都會消失，打回未突破(0星)
      item.relicStar = 0;
      item.relicAffixKey = null;
      if (typeof logSys === 'function') logSys(`<span class="text-red-500 font-bold">💥 突破失敗……${itemName} 沒有損毀，但星級與綁定詞綴全部消散，打回【未突破】。（累計失敗 ${player.relicPityCounter}/${RELIC_PITY_THRESHOLD}，滿 ${RELIC_PITY_THRESHOLD} 次保底必成功）</span>`);
    } else {
      // 🔒 用戶定案：飾品類遺物失敗不會摧毀裝備，只有綁定詞綴消失，星級保留（跟重置失敗同一套懲罰邏輯）
      item.relicAffixKey = null;
      if (typeof logSys === 'function') logSys(`<span class="text-red-500 font-bold">💥 突破失敗……${itemName} 沒有損毀，但綁定的詞綴消散了，變回未綁定狀態（星級維持【${RELIC_STAR_LABELS[star]}】，可用重置 100% 保證重新綁定）。（累計失敗 ${player.relicPityCounter}/${RELIC_PITY_THRESHOLD}，滿 ${RELIC_PITY_THRESHOLD} 次保底必成功）</span>`);
    }
  }
  if (typeof saveGame === 'function') saveGame();
  if (typeof calcStats === 'function') calcStats();
  if (typeof renderTabs === 'function') renderTabs();
  if (typeof updateUI === 'function') updateUI();
  renderRelicBreakthroughUI();
}

// ---------- 二之二、執行重置（重骰詞綴種類，星級/數值不受影響·僅限防具/飾品）----------
function executeRelicReset() {
  let item = getRelicTargetItem();
  if (!item) { if (typeof alertSysMsg === 'function') alertSysMsg('請先選擇要重置的遺物！'); return; }
  if (!isRelicResetEligible(item)) { if (typeof alertSysMsg === 'function') alertSysMsg('武器類遺物沒有重置功能！僅防具、飾品類遺物可以重置詞綴。'); return; }
  let poolType = getRelicPoolType(item);
  if (!item.relicStar) { if (typeof alertSysMsg === 'function') alertSysMsg('此遺物尚未突破，沒有詞綴可以重置！'); return; }

  if ((player.gold || 0) < RELIC_RESET_COST.gold) { if (typeof alertSysMsg === 'function') alertSysMsg('金幣不足！需要 ' + RELIC_RESET_COST.gold.toLocaleString() + ' 金幣。'); return; }
  for (let mat of RELIC_RESET_COST.materials) {
    let have = (typeof countPlayerItem === 'function') ? countPlayerItem(mat.id) : 0;
    if (have < mat.count) { if (typeof alertSysMsg === 'function') alertSysMsg('材料不足！缺少 ' + mat.name + ' ×' + mat.count + '（目前持有：' + have + '）。'); return; }
  }

  player.gold -= RELIC_RESET_COST.gold;
  for (let mat of RELIC_RESET_COST.materials) { if (typeof consumePlayerItem === 'function') consumePlayerItem(mat.id, mat.count); }

  if (!player.relicPityCounter) player.relicPityCounter = 0;
  let forcedSuccess = player.relicPityCounter >= RELIC_PITY_THRESHOLD;
  let itemName = (typeof DB !== 'undefined' && DB.items[item.id] && DB.items[item.id].n) || item.id;

  if (forcedSuccess || Math.random() < RELIC_RESET_SUCCESS_RATE) {
    item.relicAffixKey = rollRelicAffixKey(poolType);
    if (forcedSuccess) player.relicPityCounter = 0;   // 🔒 只有保底本身觸發的成功才歸零；一般天然成功不清空計數
    let affDef = findRelicAffixDef(poolType, item.relicAffixKey);
    let msg = forcedSuccess
      ? `🔄 保底發動！${itemName} 重置成功，新詞綴：${affDef ? affDef.name : '（解析失敗）'}`
      : `🔄 重置成功！${itemName} 新詞綴：${affDef ? affDef.name : '（解析失敗）'}`;
    if (typeof logSys === 'function') logSys(`<span style="color:${RELIC_STAR_COLORS[item.relicStar]};font-weight:bold;">${msg}</span>`);
  } else {
    player.relicPityCounter += 1;
    item.relicAffixKey = null;   // 🔒 重置失敗＝詞綴清空（裝備本身與星級保留，不會消失，需要再重置一次才能重新綁定）
    if (typeof logSys === 'function') logSys(`<span class="text-red-500 font-bold">💫 重置失敗……${itemName} 的詞綴消散了，變回未綁定狀態。（累計失敗 ${player.relicPityCounter}/${RELIC_PITY_THRESHOLD}，滿 ${RELIC_PITY_THRESHOLD} 次保底必成功）</span>`);
  }
  if (typeof saveGame === 'function') saveGame();
  if (typeof calcStats === 'function') calcStats();
  if (typeof renderTabs === 'function') renderTabs();
  if (typeof updateUI === 'function') updateUI();
  renderRelicBreakthroughUI();
}

// ---------- 三、渲染 UI ----------
function renderRelicBreakthroughUI(targetContainer) {
  let cont = targetContainer || document.getElementById('interaction-content') || document.getElementById('town-interaction-container');
  if (!cont) return;
  if (typeof player === 'undefined' || !player) return;
  if (!player.relicPityCounter) player.relicPityCounter = 0;

  let items = getRelicEligibleItems();
  if (!_relicSelectedUid && items.length > 0) _relicSelectedUid = items[0].uid || items[0].id;
  let selectedItem = getRelicTargetItem();

  let itemListHtml = items.length ? items.map(it => {
    let d = (typeof DB !== 'undefined' && DB.items[it.id]) || {};
    let star = it.relicStar || 0;
    let isSel = (it.uid === _relicSelectedUid || it.id === _relicSelectedUid);
    return `
      <div onclick="selectRelicItem('${it.uid || it.id}')" style="padding:6px 8px;border-radius:4px;cursor:pointer;border:1px solid ${isSel ? '#f59e0b' : '#374151'};background:${isSel ? 'rgba(245,158,11,0.18)' : 'rgba(31,41,55,0.5)'};margin-bottom:4px;">
        <div style="font-size:13px;color:#d1d5db;">${d.n || it.id}</div>
        <div style="font-size:11px;color:${RELIC_STAR_COLORS[star]};font-weight:bold;">${RELIC_STAR_LABELS[star]}</div>
      </div>
    `;
  }).join('') : '<div style="color:#6b7280;font-size:13px;padding:12px;text-align:center;">身上沒有裝備武器、防具或飾品類遺物。</div>';

  let detailHtml;
  if (selectedItem && getRelicPoolType(selectedItem)) {
    let poolType = getRelicPoolType(selectedItem);
    let sd = (typeof DB !== 'undefined' && DB.items[selectedItem.id]) || {};
    let star = selectedItem.relicStar || 0;
    let isMax = star >= RELIC_BREAKTHROUGH_STEPS.length;
    let isWeaponSel = (poolType === 'weapon');
    let isArmorSel = (poolType === 'armor');
    let affLine;
    if (isWeaponSel) {
      affLine = star === 0
        ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">尚未突破，突破成功時固定獲得對應星級的武器傷害加成。</div>`
        : `<div style="font-size:13px;color:#4ade80;margin-top:4px;">武器傷害加成：<b>+${Math.round(RELIC_WEAPON_STAR_BONUS[star] * 100)}%</b></div>`;
    } else {
      let affDef = star > 0 ? findRelicAffixDef(poolType, selectedItem.relicAffixKey) : null;
      affLine = star === 0
        ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">尚未突破，突破成功時將從詞綴池隨機綁定 1 種效果。</div>`
        : (affDef
            ? `<div style="font-size:13px;color:#4ade80;margin-top:4px;">綁定詞綴：<b>${affDef.name}</b>（${affDef.text(affDef.val[star - 1])}）</div>`
            : `<div style="font-size:13px;color:#f87171;margin-top:4px;">⚠️ 尚未綁定詞綴，請使用下方重置按鈕重新綁定。</div>`);
    }
    let riskLine = isWeaponSel
      ? `⚠️ 突破失敗，此遺物將<b>直接消失</b>。材料與金幣一律不退還。`
      : isArmorSel
        ? `突破失敗<b>不會</b>損毀此裝備，但星級與綁定的詞綴會全部消失，打回未突破，材料金幣照樣消耗。`
        : `突破失敗<b>不會</b>損毀此裝備，但綁定的詞綴會消失(星級維持不變)，材料金幣照樣消耗。`;
    detailHtml = `
      <div style="font-size:15px;font-weight:bold;color:#fde047;border-bottom:1px solid #4b5563;padding-bottom:6px;margin-bottom:8px;">
        ${sd.n || selectedItem.id}
      </div>
      <div style="margin-bottom:6px;">
        <span style="font-size:13px;color:#9ca3af;">目前星級：</span>
        <span style="font-size:16px;font-weight:bold;color:${RELIC_STAR_COLORS[star]};">${RELIC_STAR_LABELS[star]}</span>
        ${!isMax ? `<span style="font-size:13px;color:#6b7280;"> → </span><span style="font-size:16px;font-weight:bold;color:${RELIC_STAR_COLORS[star + 1]};">${RELIC_STAR_LABELS[star + 1]}</span>` : ''}
      </div>
      ${affLine}
      <div style="background:rgba(127,29,29,0.25);border:1px solid #dc2626;border-radius:6px;padding:8px;margin:8px 0;font-size:12px;color:#fca5a5;">
        ${riskLine}${!isWeaponSel ? '重置固定 100% 成功。' : ''}目前保底進度：累計失敗 <b>${player.relicPityCounter}/${RELIC_PITY_THRESHOLD}</b> 次${player.relicPityCounter >= RELIC_PITY_THRESHOLD ? '（下一次必定成功！）' : ''}
      </div>
    `;
    if (isMax) {
      detailHtml += `<div style="color:#fbbf24;font-size:13px;padding:10px;background:rgba(251,191,36,0.1);border-radius:6px;">✨ 此遺物已達最高星級「★★★」，無法再突破。</div>`;
    } else {
      let step = RELIC_BREAKTHROUGH_STEPS[star];
      let matHtml = step.materials.map(mat => {
        let have = (typeof countPlayerItem === 'function') ? countPlayerItem(mat.id) : 0;
        let ok = have >= mat.count;
        return `<span style="color:${ok ? '#34d399' : '#f87171'};margin-right:10px;display:inline-block;margin-bottom:2px;">${mat.name} ${have}/${mat.count}</span>`;
      }).join('');
      detailHtml += `
        <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;">
          <div style="font-size:12px;color:#d1d5db;margin-bottom:4px;">成功率：<span style="color:#fbbf24;font-weight:bold;">${(step.successRate * 100).toFixed(0)}%</span></div>
          <div style="font-size:12px;color:#d1d5db;margin-bottom:4px;">金幣消耗：<span style="color:#fde047;font-weight:bold;">${step.gold.toLocaleString()}</span>（持有：${(player.gold || 0).toLocaleString()}）</div>
          <div style="font-size:12px;margin-top:6px;">${matHtml}</div>
        </div>
        <button onclick="executeRelicBreakthrough()" style="width:100%;margin-top:10px;padding:10px;border-radius:6px;cursor:pointer;background:linear-gradient(135deg, #7c2d12, #450a0a);border:1px solid #fca5a5;color:#fff;font-weight:bold;font-size:14px;">
          👑 賭上一切，開始突破
        </button>
      `;
    }
    if (star > 0 && isRelicResetEligible(selectedItem)) {
      let rMatHtml = RELIC_RESET_COST.materials.map(mat => {
        let have = (typeof countPlayerItem === 'function') ? countPlayerItem(mat.id) : 0;
        let ok = have >= mat.count;
        return `<span style="color:${ok ? '#34d399' : '#f87171'};margin-right:10px;">${mat.name} ${have}/${mat.count}</span>`;
      }).join('');
      detailHtml += `
        <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;margin-top:10px;">
          <div style="font-size:12px;font-weight:bold;color:#93c5fd;margin-bottom:4px;">🔄 重置詞綴（星級不變，只重骰種類·固定 100% 成功）</div>
          <div style="font-size:12px;color:#d1d5db;margin-bottom:4px;">金幣：<span style="color:#fde047;">${RELIC_RESET_COST.gold.toLocaleString()}</span></div>
          <div style="font-size:12px;margin-bottom:8px;">${rMatHtml}</div>
          <button onclick="executeRelicReset()" style="width:100%;padding:8px;border-radius:6px;cursor:pointer;background:#1e3a8a;border:1px solid #93c5fd;color:#fff;font-weight:bold;font-size:13px;">
            🔄 重置詞綴
          </button>
        </div>
      `;
    } else if (star > 0 && isWeaponSel) {
      detailHtml += `<div style="font-size:11px;color:#6b7280;margin-top:10px;padding:8px;background:rgba(31,41,55,0.5);border-radius:6px;">⚠️ 武器類遺物沒有重置功能，傷害加成為固定值，請謹慎突破。</div>`;
    }
  } else {
    detailHtml = `<div style="color:#9ca3af;font-size:13px;">請從左側列表選擇欲突破的武器、防具或飾品類遺物。</div>`;
  }

  let html = `
  <div style="max-width:900px;margin:0 auto;font-family:inherit;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div>
        <div style="font-size:20px;font-weight:bold;color:#fbbf24;">👑 亞丁遺物祭壇</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">遺物突破：★☆☆→★★☆→★★★ · 武器固定傷害加成(+25%/+50%/+100%)／防具飾品隨機綁定 1 種詞綴 · 武器失敗裝備消失／防具失敗打回未突破／飾品失敗只清詞綴 · 累計失敗10次保底必成功</div>
      </div>
      <button onclick="closeNpcInteraction()" style="background:#374151;border:none;color:#d1d5db;padding:4px 10px;border-radius:4px;cursor:pointer;">✕ 關閉</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px;">
      <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;">
        <div style="font-size:13px;font-weight:bold;color:#fbbf24;margin-bottom:8px;">選擇要突破的遺物 (${items.length})</div>
        <div style="max-height:400px;overflow-y:auto;">${itemListHtml}</div>
      </div>
      <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:12px;">
        ${detailHtml}
      </div>
    </div>
  </div>
  `;

  cont.innerHTML = html;
  cont.classList.remove('hidden');
}

// Global expose
if (typeof window !== 'undefined') {
  window.renderRelicBreakthroughUI = renderRelicBreakthroughUI;
  window.executeRelicBreakthrough = executeRelicBreakthrough;
  window.executeRelicReset = executeRelicReset;
  window.selectRelicItem = selectRelicItem;
  window.getRelicTargetItem = getRelicTargetItem;
  window.getRelicPoolType = getRelicPoolType;
  window.findRelicAffixDef = findRelicAffixDef;
  window.RELIC_AFFIX_POOLS = RELIC_AFFIX_POOLS;
  window.RELIC_STAR_LABELS = RELIC_STAR_LABELS;
  window.RELIC_STAR_COLORS = RELIC_STAR_COLORS;
}


// ============================================================
// 🏰 亞丁城攻城戰 (Aden Castle Siege) 地圖資料與出怪池 (DB.maps & DB.mobs 注入)
// ============================================================
(function initAdenCastleSiegeData() {
  function ensureAdenCastleData() {
    if (typeof DB === 'undefined') return;
    if (!DB.maps) DB.maps = {};
    if (!DB.mobs) DB.mobs = {};
    if (!DB.towns) DB.towns = {};

    // 1. 亞丁城攻城守軍與建築 (完整 siege 結構，比照前幾座城的規格)
    if (!DB.mobs['aden_gate']) {
      DB.mobs['aden_gate'] = {
        n: '亞丁城門', lv: 1, s: 'L', hp: 75000, curHp: 75000,
        ac: 15, mr: 0, dr: 10, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hp: 75000, ac: 15, mr: 0, dr: 10 },
        spr: '241', exp: 13000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['aden_tower']) {
      DB.mobs['aden_tower'] = {
        n: '亞丁守護塔', lv: 1, s: 'L', hp: 65000, curHp: 65000,
        ac: 15, mr: 0, dr: 14, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hpPerLv: 650, hp: 65000, ac: 15, mr: 0, dr: 14 },
        spr: '240', exp: 65000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['aden_guard']) {
      DB.mobs['aden_guard'] = {
        n: '亞丁城守衛', lv: 65, s: 'S', hp: 4600, curHp: 4600,
        ac: -28, mr: 34, atkSpd: 1.0, dmg: [1, 13], db: 62, hit: 40,
        beh: '主動', race: '人形', siegeEnemy: true,
        siege: { hpC: 62, acBase: -28, mrBase: 34, dmgSides: 13, hitBase: 13 },
        spr: '1254', exp: 4400, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['aden_knight']) {
      DB.mobs['aden_knight'] = {
        n: '亞丁聖騎士', lv: 65, s: 'S', hp: 4000, curHp: 4000,
        ac: -24, mr: 30, atkSpd: 0.85, dmg: [1, 17], db: 64, hit: 38,
        beh: '主動', race: '人形', siegeEnemy: true,
        siege: { hpC: 56, acBase: -24, mrBase: 30, dmgSides: 17, hitBase: 15 },
        spr: '1256', exp: 4300, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['aden_mage']) {
      DB.mobs['aden_mage'] = {
        n: '亞丁宮廷法師', lv: 65, s: 'S', hp: 2900, curHp: 2900,
        ac: -16, mr: 48, atkSpd: 1.3, dmg: [1, 15], db: 58, hit: 34,
        beh: '主動', magic: true, race: '人形', siegeEnemy: true,
        siege: { hpC: 40, acBase: -16, mrBase: 48, dmgSides: 15, hitBase: 12 },
        spr: '1278', exp: 4600, goldMin: 0, goldMax: 0
      };
    }

    // 2. 出怪池注入 (強制寫入)
    DB.maps['aden_outer'] = ['aden_guard', 'aden_knight', 'aden_mage', 'aden_gate'];
    DB.maps['aden_inner'] = ['aden_guard', 'aden_knight', 'aden_mage', 'aden_tower'];

    // 3. 亞丁城堡內殿城鎮資料 (攻城獲勝後開放)
    if (!DB.towns['town_aden_castle']) {
      DB.towns['town_aden_castle'] = {
        id: 'town_aden_castle',
        n: '亞丁城',
        title: '亞丁城內殿',
        npcs: [
          { id: 'npc_relic_master', n: '突破大師 · 賽菈', title: '遺物突破祭壇', type: 'craft', spr: '3227' },
          { id: 'npc_wh_aden_castle', n: '巴血', title: '倉庫', type: 'warehouse', spr: '1307' },
          { id: 'npc_aden_guard_captain', n: '亞丁城守衛隊長', title: '城堡護衛', type: 'castleguard', spr: '3858' },
          { id: 'npc_esti', n: '依詩蒂', title: '血盟管理', type: 'pledge', spr: '3227' },
          { id: 'npc_hert', n: '赫特', title: '魔物追蹤', type: 'quest', spr: '1049' }
        ]
      };
    }

    // 4. 動畫別名支援
    if (typeof MOB_ANIM_NAMES !== 'undefined') {
      ['亞丁城守衛', '亞丁聖騎士', '亞丁宮廷法師', '亞丁城門', '亞丁守護塔'].forEach(n => MOB_ANIM_NAMES.add(n));
    }
    if (typeof MOB_ANIM_ALIAS !== 'undefined') {
      MOB_ANIM_ALIAS['亞丁城守衛'] = '玩家男騎士';
      MOB_ANIM_ALIAS['亞丁聖騎士'] = '玩家男戰士';
      MOB_ANIM_ALIAS['亞丁宮廷法師'] = '玩家男法師';
      MOB_ANIM_ALIAS['亞丁城門'] = '肯特城門';
      MOB_ANIM_ALIAS['亞丁守護塔'] = '肯特守護塔';
    }
    if (typeof MOB_ANIM_BAKED_SHADOW !== 'undefined') {
      MOB_ANIM_BAKED_SHADOW.add('亞丁城門');
    }

    // 5. 背景備份
    if (typeof SPECIAL_AREA_BG !== 'undefined') {
      SPECIAL_AREA_BG['aden_outer'] = 'assets/area/1920x1080/肯特外門區.jpg';
      SPECIAL_AREA_BG['aden_inner'] = 'assets/area/1920x1080/肯特內城.jpg';
      SPECIAL_AREA_BG['town_aden_castle'] = 'assets/area/1920x1080/風木內城.jpg';
    }
  }

  // 立即執行 (同步)，不等待 DOMContentLoaded
  ensureAdenCastleData();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAdenCastleData);
  }
  window.ensureAdenCastleData = ensureAdenCastleData;
})();
