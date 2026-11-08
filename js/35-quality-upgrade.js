// ============================================================
// js/35-quality-upgrade.js — ⚒️ 侏儒城品質升階（裝備品質升階系統，方案A定案）
//   核心：裝備本身固定數值（力量/敏捷/命中/傷害加成/AC/MR等）套用品質倍率，
//   倍率計算集中於 js/02 的 qualityScaledDef()／QUALITY_TIER_BONUS，本檔只負責「升階流程」本身。
//   風險設計：成功率隨階級遞減，失敗會「降一階」（不是打回原點），材料金幣一律照扣不退還。
// ============================================================
'use strict';

const QUALITY_TIER_NAMES = ['普通', '優良', '精良', '完美', '大師'];
const QUALITY_TIER_COLORS = ['#9ca3af', '#4ade80', '#60a5fa', '#c084fc', '#fbbf24'];

// 升階步驟：index = 目前階級（0~3），升到 index+1。材料為「累加制」——完美/大師需要的圖騰/水晶數量已包含前面所有階段的份量。
const QUALITY_UPGRADE_STEPS = [
  {   // 普通(0) → 優良(1)
    successRate: 0.50, gold: 2000000,
    materials: [
      { id: 'new_item_145', name: '阿吐巴圖騰', count: 15 },
      { id: 'new_item_146', name: '那魯加圖騰', count: 15 },
      { id: 'new_item_147', name: '都達瑪拉圖騰', count: 15 },
      { id: 'new_item_148', name: '甘地圖騰', count: 15 },
      { id: 'new_item_149', name: '羅孚圖騰', count: 15 }
    ]
  },
  {   // 優良(1) → 精良(2)
    successRate: 0.45, gold: 8000000,
    materials: [
      { id: 'new_item_145', name: '阿吐巴圖騰', count: 25 },
      { id: 'new_item_146', name: '那魯加圖騰', count: 25 },
      { id: 'new_item_147', name: '都達瑪拉圖騰', count: 25 },
      { id: 'new_item_148', name: '甘地圖騰', count: 25 },
      { id: 'new_item_149', name: '羅孚圖騰', count: 25 },
      { id: 'new_item_228', name: '污染的精靈水晶(水)', count: 10 },
      { id: 'new_item_229', name: '污染的精靈水晶(火)', count: 10 },
      { id: 'new_item_230', name: '污染的精靈水晶(地)', count: 10 },
      { id: 'new_item_231', name: '污染的精靈水晶(風)', count: 10 }
    ]
  },
  {   // 精良(2) → 完美(3)
    successRate: 0.35, gold: 30000000,
    materials: [
      { id: 'new_item_145', name: '阿吐巴圖騰', count: 40 },
      { id: 'new_item_146', name: '那魯加圖騰', count: 40 },
      { id: 'new_item_147', name: '都達瑪拉圖騰', count: 40 },
      { id: 'new_item_148', name: '甘地圖騰', count: 40 },
      { id: 'new_item_149', name: '羅孚圖騰', count: 40 },
      { id: 'new_item_228', name: '污染的精靈水晶(水)', count: 20 },
      { id: 'new_item_229', name: '污染的精靈水晶(火)', count: 20 },
      { id: 'new_item_230', name: '污染的精靈水晶(地)', count: 20 },
      { id: 'new_item_231', name: '污染的精靈水晶(風)', count: 20 },
      { id: 'new_item_232', name: '邪惡蜥蜴之鱗', count: 25 },
      { id: 'sherine_crystal', name: '席琳結晶', count: 25 }
    ]
  },
  {   // 完美(3) → 大師(4)
    successRate: 0.25, gold: 100000000,
    materials: [
      { id: 'new_item_145', name: '阿吐巴圖騰', count: 60 },
      { id: 'new_item_146', name: '那魯加圖騰', count: 60 },
      { id: 'new_item_147', name: '都達瑪拉圖騰', count: 60 },
      { id: 'new_item_148', name: '甘地圖騰', count: 60 },
      { id: 'new_item_149', name: '羅孚圖騰', count: 60 },
      { id: 'new_item_228', name: '污染的精靈水晶(水)', count: 30 },
      { id: 'new_item_229', name: '污染的精靈水晶(火)', count: 30 },
      { id: 'new_item_230', name: '污染的精靈水晶(地)', count: 30 },
      { id: 'new_item_231', name: '污染的精靈水晶(風)', count: 30 },
      { id: 'new_item_232', name: '邪惡蜥蜴之鱗', count: 50 },
      { id: 'sherine_crystal', name: '席琳結晶', count: 75 },
      { id: 'new_item_218', name: '神秘水晶球', count: 15 },
      { id: 'sherine_crystal_relic', name: '遺物席琳結晶', count: 25 }
    ]
  }
];

// ---------- 一、可升階裝備清單（僅已裝備·比照奇岩重鑄「限已裝備」的規則）----------
function getQualityTargetItem() {
  if (!_qualitySelectedUid || typeof player === 'undefined' || !player || !player.eq) return null;
  for (let k in player.eq) {
    let item = player.eq[k];
    if (item && (item.uid === _qualitySelectedUid || item.id === _qualitySelectedUid)) return item;
  }
  return null;
}
let _qualitySelectedUid = null;

function getQualityEligibleItems() {
  if (typeof player === 'undefined' || !player || !player.eq) return [];
  let out = [];
  for (let k in player.eq) {
    let it = player.eq[k];
    if (!it || !it.id) continue;
    if (typeof getItemReforgeType === 'function' && !getItemReforgeType(it)) continue;   // 🔒 沿用奇岩重鑄同一份合法性判斷（武器/防具/飾品，排除箭矢/娃娃/魔眼/寵物裝備/席琳遺骸）
    out.push(Object.assign({ slotKey: k }, it));
  }
  return out;
}

function selectQualityItem(uid) {
  _qualitySelectedUid = uid;
  renderQualityUpgradeUI();
}

// ---------- 二、執行升階 ----------
function executeQualityUpgrade() {
  let item = getQualityTargetItem();
  if (!item) { if (typeof alertSysMsg === 'function') alertSysMsg('請先選擇要升階的裝備！'); return; }
  if (typeof getItemReforgeType === 'function' && !getItemReforgeType(item)) { if (typeof alertSysMsg === 'function') alertSysMsg('此裝備無法升階！僅武器、防具、飾品可進行品質升階。'); return; }
  let tier = item.qualityTier || 0;
  if (tier >= QUALITY_UPGRADE_STEPS.length) { if (typeof alertSysMsg === 'function') alertSysMsg('此裝備已是「大師」品質，無法再升階！'); return; }
  let step = QUALITY_UPGRADE_STEPS[tier];

  if ((player.gold || 0) < step.gold) { if (typeof alertSysMsg === 'function') alertSysMsg('金幣不足！需要 ' + step.gold.toLocaleString() + ' 金幣。'); return; }
  for (let mat of step.materials) {
    let have = (typeof countPlayerItem === 'function') ? countPlayerItem(mat.id) : 0;
    if (have < mat.count) { if (typeof alertSysMsg === 'function') alertSysMsg('材料不足！缺少 ' + mat.name + ' ×' + mat.count + '（目前持有：' + have + '）。'); return; }
  }

  // 扣費（不論成功失敗，材料金幣一律照扣不退還）
  player.gold -= step.gold;
  for (let mat of step.materials) { if (typeof consumePlayerItem === 'function') consumePlayerItem(mat.id, mat.count); }

  let itemName = (typeof DB !== 'undefined' && DB.items[item.id] && DB.items[item.id].n) || item.id;
  if (Math.random() < step.successRate) {
    item.qualityTier = tier + 1;
    if (typeof logSys === 'function') logSys(`<span style="color:${QUALITY_TIER_COLORS[tier + 1]};font-weight:bold;">⚒️ 升階成功！${itemName} 品質提升為【${QUALITY_TIER_NAMES[tier + 1]}】！</span>`);
  } else {
    let newTier = Math.max(0, tier - 1);   // 🔒 失敗降一階，普通(0)是地板
    item.qualityTier = newTier;
    if (typeof logSys === 'function') logSys(`<span class="text-red-400 font-bold">⚒️ 升階失敗……${itemName} 的品質從【${QUALITY_TIER_NAMES[tier]}】跌落為【${QUALITY_TIER_NAMES[newTier]}】。材料與金幣已消耗。</span>`);
  }
  if (typeof saveGame === 'function') saveGame();
  if (typeof calcStats === 'function') calcStats();
  if (typeof renderTabs === 'function') renderTabs();
  if (typeof updateUI === 'function') updateUI();
  renderQualityUpgradeUI();
}

// ---------- 三、渲染 UI ----------
function renderQualityUpgradeUI(targetContainer) {
  let cont = targetContainer || document.getElementById('interaction-content') || document.getElementById('town-interaction-container');
  if (!cont) return;
  if (typeof player === 'undefined' || !player) return;

  let items = getQualityEligibleItems();
  if (!_qualitySelectedUid && items.length > 0) _qualitySelectedUid = items[0].uid || items[0].id;
  let selectedItem = getQualityTargetItem();

  let itemListHtml = items.length ? items.map(it => {
    let d = (typeof DB !== 'undefined' && DB.items[it.id]) || {};
    let tier = it.qualityTier || 0;
    let isSel = (it.uid === _qualitySelectedUid || it.id === _qualitySelectedUid);
    return `
      <div onclick="selectQualityItem('${it.uid || it.id}')" style="padding:6px 8px;border-radius:4px;cursor:pointer;border:1px solid ${isSel ? '#f59e0b' : '#374151'};background:${isSel ? 'rgba(245,158,11,0.18)' : 'rgba(31,41,55,0.5)'};margin-bottom:4px;">
        <div style="font-size:13px;color:#d1d5db;">${it.en ? '+' + it.en + ' ' : ''}${d.n || it.id}</div>
        <div style="font-size:11px;color:${QUALITY_TIER_COLORS[tier]};font-weight:bold;">【${QUALITY_TIER_NAMES[tier]}】</div>
      </div>
    `;
  }).join('') : '<div style="color:#6b7280;font-size:13px;padding:12px;text-align:center;">身上沒有可升階的武器／防具／飾品。</div>';

  let detailHtml;
  if (selectedItem && getItemReforgeType(selectedItem)) {
    let sd = (typeof DB !== 'undefined' && DB.items[selectedItem.id]) || {};
    let tier = selectedItem.qualityTier || 0;
    let isMax = tier >= QUALITY_UPGRADE_STEPS.length;
    detailHtml = `
      <div style="font-size:15px;font-weight:bold;color:#fde047;border-bottom:1px solid #4b5563;padding-bottom:6px;margin-bottom:8px;">
        ${selectedItem.en ? '+' + selectedItem.en + ' ' : ''}${sd.n || selectedItem.id}
      </div>
      <div style="margin-bottom:10px;">
        <span style="font-size:13px;color:#9ca3af;">目前品質：</span>
        <span style="font-size:16px;font-weight:bold;color:${QUALITY_TIER_COLORS[tier]};">【${QUALITY_TIER_NAMES[tier]}】</span>
        ${!isMax ? `<span style="font-size:13px;color:#6b7280;"> → </span><span style="font-size:16px;font-weight:bold;color:${QUALITY_TIER_COLORS[tier + 1]};">【${QUALITY_TIER_NAMES[tier + 1]}】</span>` : ''}
      </div>
    `;
    if (isMax) {
      detailHtml += `<div style="color:#fbbf24;font-size:13px;padding:10px;background:rgba(251,191,36,0.1);border-radius:6px;">✨ 此裝備已達最高品質「大師」，無法再升階。</div>`;
    } else {
      let step = QUALITY_UPGRADE_STEPS[tier];
      let matHtml = step.materials.map(mat => {
        let have = (typeof countPlayerItem === 'function') ? countPlayerItem(mat.id) : 0;
        let ok = have >= mat.count;
        return `<span style="color:${ok ? '#34d399' : '#f87171'};margin-right:10px;display:inline-block;margin-bottom:2px;">${mat.name} ${have}/${mat.count}</span>`;
      }).join('');
      detailHtml += `
        <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;margin-top:8px;">
          <div style="font-size:12px;color:#d1d5db;margin-bottom:4px;">成功率：<span style="color:#fbbf24;font-weight:bold;">${(step.successRate * 100).toFixed(0)}%</span>
            <span style="color:#f87171;margin-left:10px;">失敗降回【${QUALITY_TIER_NAMES[Math.max(0, tier - 1)]}】，材料金幣不退還</span>
          </div>
          <div style="font-size:12px;color:#d1d5db;margin-bottom:4px;">金幣消耗：<span style="color:#fde047;font-weight:bold;">${step.gold.toLocaleString()}</span>（持有：${(player.gold || 0).toLocaleString()}）</div>
          <div style="font-size:12px;margin-top:6px;">${matHtml}</div>
        </div>
        <button onclick="executeQualityUpgrade()" style="width:100%;margin-top:10px;padding:10px;border-radius:6px;cursor:pointer;background:linear-gradient(135deg, #b45309, #78350f);border:1px solid #fde68a;color:#fff;font-weight:bold;font-size:14px;">
          ⚒️ 開始升階
        </button>
      `;
    }
  } else {
    detailHtml = `<div style="color:#9ca3af;font-size:13px;">請從左側列表選擇欲升階的武器、防具或飾品。</div>`;
  }

  let html = `
  <div style="max-width:900px;margin:0 auto;font-family:inherit;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div>
        <div style="font-size:20px;font-weight:bold;color:#fbbf24;">⚒️ 侏儒鍛造壇</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">品質升階：普通→優良→精良→完美→大師，裝備自身數值全面倍率放大 · 高風險高報酬，失敗會降階</div>
      </div>
      <button onclick="closeNpcInteraction()" style="background:#374151;border:none;color:#d1d5db;padding:4px 10px;border-radius:4px;cursor:pointer;">✕ 關閉</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px;">
      <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;">
        <div style="font-size:13px;font-weight:bold;color:#fbbf24;margin-bottom:8px;">選擇要升階的裝備 (${items.length})</div>
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
  window.renderQualityUpgradeUI = renderQualityUpgradeUI;
  window.executeQualityUpgrade = executeQualityUpgrade;
  window.selectQualityItem = selectQualityItem;
  window.getQualityTargetItem = getQualityTargetItem;
  window.QUALITY_TIER_NAMES = QUALITY_TIER_NAMES;
  window.QUALITY_TIER_COLORS = QUALITY_TIER_COLORS;
}


// ============================================================
// 🏰 侏儒城攻城戰 (Dwarf Castle Siege) 地圖資料與出怪池 (DB.maps & DB.mobs 注入)
// ============================================================
(function initDwarfCastleSiegeData() {
  function ensureDwarfCastleData() {
    if (typeof DB === 'undefined') return;
    if (!DB.maps) DB.maps = {};
    if (!DB.mobs) DB.mobs = {};
    if (!DB.towns) DB.towns = {};

    // 1. 侏儒城攻城守軍與建築 (完整 siege 結構，比照前幾座城的規格)
    if (!DB.mobs['dwarf_gate']) {
      DB.mobs['dwarf_gate'] = {
        n: '侏儒城門', lv: 1, s: 'L', hp: 70000, curHp: 70000,
        ac: 14, mr: 0, dr: 9, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hp: 70000, ac: 14, mr: 0, dr: 9 },
        spr: '241', exp: 12000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['dwarf_tower']) {
      DB.mobs['dwarf_tower'] = {
        n: '侏儒城守護塔', lv: 1, s: 'L', hp: 60000, curHp: 60000,
        ac: 14, mr: 0, dr: 13, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hpPerLv: 600, hp: 60000, ac: 14, mr: 0, dr: 13 },
        spr: '240', exp: 60000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['dwarf_guard']) {
      DB.mobs['dwarf_guard'] = {
        n: '侏儒城守衛', lv: 62, s: 'S', hp: 4200, curHp: 4200,
        ac: -26, mr: 30, atkSpd: 1.1, dmg: [1, 12], db: 58, hit: 36,
        beh: '主動', race: '人形', siegeEnemy: true,
        siege: { hpC: 58, acBase: -26, mrBase: 30, dmgSides: 12, hitBase: 11 },
        spr: '1254', exp: 4000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['dwarf_hammer']) {
      DB.mobs['dwarf_hammer'] = {
        n: '侏儒重錘兵', lv: 62, s: 'S', hp: 3600, curHp: 3600,
        ac: -22, mr: 26, atkSpd: 0.9, dmg: [1, 16], db: 60, hit: 34,
        beh: '主動', race: '人形', siegeEnemy: true,
        siege: { hpC: 52, acBase: -22, mrBase: 26, dmgSides: 16, hitBase: 13 },
        spr: '1256', exp: 3900, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['dwarf_engineer']) {
      DB.mobs['dwarf_engineer'] = {
        n: '侏儒工程師', lv: 62, s: 'S', hp: 2600, curHp: 2600,
        ac: -14, mr: 45, atkSpd: 1.3, dmg: [1, 14], db: 54, hit: 30,
        beh: '主動', magic: true, race: '人形', siegeEnemy: true,
        siege: { hpC: 38, acBase: -14, mrBase: 45, dmgSides: 14, hitBase: 11 },
        spr: '1278', exp: 4200, goldMin: 0, goldMax: 0
      };
    }

    // 2. 出怪池注入 (強制寫入)
    DB.maps['dwarf_outer'] = ['dwarf_guard', 'dwarf_hammer', 'dwarf_engineer', 'dwarf_gate'];
    DB.maps['dwarf_inner'] = ['dwarf_guard', 'dwarf_hammer', 'dwarf_engineer', 'dwarf_tower'];

    // 3. 侏儒城堡內殿城鎮資料 (攻城獲勝後開放)
    if (!DB.towns['town_dwarf_castle']) {
      DB.towns['town_dwarf_castle'] = {
        id: 'town_dwarf_castle',
        n: '侏儒城',
        title: '侏儒城內殿',
        npcs: [
          { id: 'npc_quality_master', n: '鍛造大師 · 布倫', title: '侏儒鍛造壇', type: 'craft', spr: '3227' },
          { id: 'npc_wh_dwarf_castle', n: '巴血', title: '倉庫', type: 'warehouse', spr: '1307' },
          { id: 'npc_dwarf_guard_captain', n: '侏儒城守衛隊長', title: '城堡護衛', type: 'castleguard', spr: '3858' },
          { id: 'npc_esti', n: '依詩蒂', title: '血盟管理', type: 'pledge', spr: '3227' },
          { id: 'npc_hert', n: '赫特', title: '魔物追蹤', type: 'quest', spr: '1049' }
        ]
      };
    }

    // 4. 動畫別名支援
    if (typeof MOB_ANIM_NAMES !== 'undefined') {
      ['侏儒城守衛', '侏儒重錘兵', '侏儒工程師', '侏儒城門', '侏儒城守護塔'].forEach(n => MOB_ANIM_NAMES.add(n));
    }
    if (typeof MOB_ANIM_ALIAS !== 'undefined') {
      MOB_ANIM_ALIAS['侏儒城守衛'] = '玩家男騎士';
      MOB_ANIM_ALIAS['侏儒重錘兵'] = '玩家男戰士';
      MOB_ANIM_ALIAS['侏儒工程師'] = '玩家男法師';
      MOB_ANIM_ALIAS['侏儒城門'] = '肯特城門';
      MOB_ANIM_ALIAS['侏儒城守護塔'] = '肯特守護塔';
    }
    if (typeof MOB_ANIM_BAKED_SHADOW !== 'undefined') {
      MOB_ANIM_BAKED_SHADOW.add('侏儒城門');
    }

    // 5. 背景備份
    if (typeof SPECIAL_AREA_BG !== 'undefined') {
      SPECIAL_AREA_BG['dwarf_outer'] = 'assets/area/1920x1080/海音外門區.jpg';
      SPECIAL_AREA_BG['dwarf_inner'] = 'assets/area/1920x1080/海音內城.jpg';
      SPECIAL_AREA_BG['town_dwarf_castle'] = 'assets/area/1920x1080/海音內城.jpg';
    }
  }

  // 立即執行 (同步)，不等待 DOMContentLoaded
  ensureDwarfCastleData();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureDwarfCastleData);
  }
  window.ensureDwarfCastleData = ensureDwarfCastleData;
})();
