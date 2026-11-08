// ============================================================
// js/34-blood-altar.js — 🩸 妖魔堡血祭祭壇（獻祭裝備→妖魔之血→兌換稀有素材）
//   方案C定案：解決「一堆用不到的裝備堆在背包」的痛點，跟奇岩重鑄形成資源循環。
//   ⚠️ 跟奇岩重鑄「僅限已裝備」剛好相反：血祭轉化的設計目的就是清倉庫，故僅列背包物品，不列已裝備。
// ============================================================
'use strict';

// ---------- 一、血祭轉化數值（基於既有 getSellPrice 的定價邏輯延伸，不憑空另立一套）----------
//   妖魔之血 = (定價÷500，最低1滴) + (強化值×0.5，無條件捨去)，再依屬性詞綴/祝福/遠古/重鑄過 各疊加50%~100%。
function calcBloodSacrificeValue(item) {
  if (!item || typeof DB === 'undefined' || !DB.items) return 0;
  let d = DB.items[item.id];
  if (!d) return 0;
  let base = Math.max(1, Math.floor((d.p || 0) / 500));
  let enBonus = Math.floor((item.en || 0) * 0.5);
  let mult = 1;
  if (typeof getAttrAffix === 'function' && getAttrAffix(item.attr)) mult += 0.5;
  if (item.bless === true) mult += 0.5;
  if (item.anc) mult += 1;
  if (item.reforgeAffixes && item.reforgeAffixes.length) mult += 0.5;   // 💰 洗過奇岩重鑄詞綴的裝備：即使品階不高，也代表玩家曾投入資源，額外加成
  return Math.max(1, Math.floor((base + enBonus) * mult));
}

// 妖魔之血兌換稀有素材匯率（用戶定案）
const BLOOD_EXCHANGE_RATES = [
  { id: 'mat_magic_gem', name: '魔法寶石', cost: 50 },
  { id: 'new_item_195', name: '精靈玉', cost: 50 },
  { id: 'mat_black_blood', name: '黑色血痕', cost: 100 },
  // ⚒️ v3.8.34 侏儒城品質升階材料一併納入兌換：定價依「現有掉落來源」與「用在升階第幾階」分級——
  //   5 圖騰本身有掉落來源(普通→優良首階用)＝最低價；4 種汙染水晶目前完全沒有掉落來源(優良→精良用)＝中價；
  //   邪惡蜥蜴之鱗有掉落來源但用在精良→完美(跟席琳結晶同階)＝比照席琳結晶；神秘水晶球無掉落來源且是完美→大師頂階材料＝僅次於遺物席琳結晶
  { id: 'new_item_145', name: '阿吐巴圖騰', cost: 80 },
  { id: 'new_item_146', name: '那魯加圖騰', cost: 80 },
  { id: 'new_item_147', name: '都達瑪拉圖騰', cost: 80 },
  { id: 'new_item_148', name: '甘地圖騰', cost: 80 },
  { id: 'new_item_149', name: '羅孚圖騰', cost: 80 },
  { id: 'new_item_228', name: '污染的精靈水晶(水)', cost: 150 },
  { id: 'new_item_229', name: '污染的精靈水晶(火)', cost: 150 },
  { id: 'new_item_230', name: '污染的精靈水晶(地)', cost: 150 },
  { id: 'new_item_231', name: '污染的精靈水晶(風)', cost: 150 },
  { id: 'new_item_232', name: '邪惡蜥蜴之鱗', cost: 500 },
  { id: 'sherine_crystal', name: '席琳結晶', cost: 500 },
  { id: 'mat_crack_core', name: '龜裂之核', cost: 500 },
  { id: 'new_item_218', name: '神秘水晶球', cost: 1500 },
  { id: 'sherine_crystal_relic', name: '遺物席琳結晶', cost: 2000 }
];

// ---------- 二、可獻祭裝備清單 ----------
let _bloodSelectedUids = {};

function getBloodSacrificeEligibleItems() {
  if (typeof player === 'undefined' || !player || !player.inv) return [];
  return player.inv.filter(it => {
    if (!it || !it.id) return false;
    if (it.lock) return false;   // 🔒 鎖定物品不可獻祭，防止手滑誤獻祭重要裝備
    let d = DB.items[it.id];
    if (!d || (d.type !== 'wpn' && d.type !== 'arm' && d.type !== 'acc')) return false;
    if (d.noJunk || d.relic) return false;   // 遺物與收藏冊禁售品：不可獻祭（比照廢品系統 noJunk 規則）
    return true;
  });
}

function toggleBloodSacrificeItem(uid) {
  if (_bloodSelectedUids[uid]) delete _bloodSelectedUids[uid];
  else _bloodSelectedUids[uid] = true;
  renderBloodAltarUI();
}

function bloodSacrificeSelectAll(checked) {
  _bloodSelectedUids = {};
  if (checked) getBloodSacrificeEligibleItems().forEach(it => { _bloodSelectedUids[it.uid] = true; });
  renderBloodAltarUI();
}

// ---------- 三、執行獻祭 ----------
function executeBloodSacrifice() {
  let items = getBloodSacrificeEligibleItems().filter(it => _bloodSelectedUids[it.uid]);
  if (!items.length) { if (typeof alertSysMsg === 'function') alertSysMsg('請先選擇要獻祭的裝備！'); return; }
  let totalBlood = 0;
  items.forEach(it => { totalBlood += calcBloodSacrificeValue(it) * (Number(it.cnt) || 1); });
  let sacrificedUids = new Set(items.map(it => it.uid));
  player.inv = player.inv.filter(it => !sacrificedUids.has(it.uid));
  _bloodSelectedUids = {};
  gainItem('demon_blood', totalBlood);
  if (typeof logSys === 'function') logSys(`<span class="text-red-400 font-bold">🩸 獻祭了 ${items.length} 件裝備，獲得 ${totalBlood} 滴妖魔之血。</span>`);
  if (typeof saveGame === 'function') saveGame();
  if (typeof renderTabs === 'function') renderTabs();
  if (typeof updateUI === 'function') updateUI();
  renderBloodAltarUI();
}

// ---------- 四、妖魔之血兌換 ----------
function executeBloodExchange(matId) {
  let rate = BLOOD_EXCHANGE_RATES.find(r => r.id === matId);
  if (!rate) return;
  let have = (typeof countPlayerItem === 'function') ? countPlayerItem('demon_blood') : 0;
  if (have < rate.cost) { if (typeof alertSysMsg === 'function') alertSysMsg('妖魔之血不足！需要 ' + rate.cost + ' 滴（目前持有：' + have + '）。'); return; }
  if (typeof consumePlayerItem === 'function') consumePlayerItem('demon_blood', rate.cost);
  gainItem(rate.id, 1);
  if (typeof logSys === 'function') logSys(`<span class="text-red-400">用 ${rate.cost} 滴妖魔之血兌換了 1 顆${rate.name}。</span>`);
  if (typeof saveGame === 'function') saveGame();
  renderBloodAltarUI();
}

// ---------- 五、渲染 UI ----------
function renderBloodAltarUI(targetContainer) {
  let cont = targetContainer || document.getElementById('interaction-content') || document.getElementById('town-interaction-container');
  if (!cont) return;
  if (typeof player === 'undefined' || !player) return;

  let items = getBloodSacrificeEligibleItems();
  let selectedItems = items.filter(it => _bloodSelectedUids[it.uid]);
  let previewBlood = selectedItems.reduce((s, it) => s + calcBloodSacrificeValue(it) * (Number(it.cnt) || 1), 0);
  let haveBlood = (typeof countPlayerItem === 'function') ? countPlayerItem('demon_blood') : 0;
  let allChecked = items.length > 0 && selectedItems.length === items.length;

  let itemListHtml = items.length ? items.map(it => {
    let d = DB.items[it.id] || {};
    let checked = !!_bloodSelectedUids[it.uid];
    let val = calcBloodSacrificeValue(it) * (Number(it.cnt) || 1);
    return `
      <div onclick="toggleBloodSacrificeItem('${it.uid}')" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:4px;cursor:pointer;border:1px solid ${checked ? '#dc2626' : '#374151'};background:${checked ? 'rgba(127,29,29,0.35)' : 'rgba(31,41,55,0.5)'};margin-bottom:4px;">
        <span style="font-size:13px;color:${checked ? '#fca5a5' : '#d1d5db'};">${checked ? '☑' : '☐'} ${it.en ? '+' + it.en + ' ' : ''}${d.n || it.id}${(it.cnt || 1) > 1 ? ' ×' + it.cnt : ''}</span>
        <span style="font-size:12px;color:#f87171;font-weight:bold;">🩸 ${val}</span>
      </div>
    `;
  }).join('') : '<div style="color:#6b7280;font-size:13px;padding:12px;text-align:center;">背包裡沒有可獻祭的武器／防具／飾品（鎖定與遺物不列入）。</div>';

  let exchangeHtml = BLOOD_EXCHANGE_RATES.map(r => {
    let ok = haveBlood >= r.cost;
    return `
      <button onclick="executeBloodExchange('${r.id}')" ${ok ? '' : 'disabled'} style="padding:8px;border-radius:6px;cursor:${ok ? 'pointer' : 'not-allowed'};border:1px solid ${ok ? '#dc2626' : '#4b5563'};background:${ok ? 'rgba(127,29,29,0.4)' : 'rgba(31,41,55,0.5)'};color:${ok ? '#fca5a5' : '#6b7280'};text-align:center;">
        <div style="font-size:12px;font-weight:bold;">${r.name}</div>
        <div style="font-size:11px;margin-top:2px;">🩸 ${r.cost}</div>
      </button>
    `;
  }).join('');

  let html = `
  <div style="max-width:900px;margin:0 auto;font-family:inherit;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div>
        <div style="font-size:20px;font-weight:bold;color:#f87171;">🩸 血祭祭壇</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">獻祭不需要的武器／防具／飾品，換取妖魔之血 · 妖魔之血可兌換稀有素材</div>
      </div>
      <button onclick="closeNpcInteraction()" style="background:#374151;border:none;color:#d1d5db;padding:4px 10px;border-radius:4px;cursor:pointer;">✕ 關閉</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:13px;font-weight:bold;color:#fca5a5;">選擇要獻祭的裝備 (${items.length})</span>
          <label style="font-size:12px;color:#9ca3af;cursor:pointer;">
            <input type="checkbox" ${allChecked ? 'checked' : ''} onchange="bloodSacrificeSelectAll(this.checked)"> 全選
          </label>
        </div>
        <div style="max-height:340px;overflow-y:auto;">${itemListHtml}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="background:rgba(20,18,25,0.8);border:1px solid #dc2626;border-radius:6px;padding:10px;">
          <div style="font-size:13px;color:#d1d5db;">已選 ${selectedItems.length} 件，可獲得：</div>
          <div style="font-size:22px;font-weight:bold;color:#f87171;margin:4px 0;">🩸 ${previewBlood}</div>
          <button onclick="executeBloodSacrifice()" ${selectedItems.length ? '' : 'disabled'} style="width:100%;padding:10px;border-radius:6px;cursor:${selectedItems.length ? 'pointer' : 'not-allowed'};background:${selectedItems.length ? 'linear-gradient(135deg, #b91c1c, #7f1d1d)' : '#374151'};border:1px solid ${selectedItems.length ? '#fca5a5' : '#4b5563'};color:#fff;font-weight:bold;font-size:14px;">
            ⚡ 獻祭
          </button>
          <div style="font-size:11px;color:#6b7280;margin-top:6px;">目前持有妖魔之血：🩸 ${haveBlood}</div>
        </div>

        <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;">
          <div style="font-size:13px;font-weight:bold;color:#fca5a5;margin-bottom:8px;">妖魔之血兌換</div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;max-height:280px;overflow-y:auto;">${exchangeHtml}</div>
        </div>
      </div>
    </div>
  </div>
  `;

  cont.innerHTML = html;
  cont.classList.remove('hidden');
}

// Global expose
if (typeof window !== 'undefined') {
  window.renderBloodAltarUI = renderBloodAltarUI;
  window.executeBloodSacrifice = executeBloodSacrifice;
  window.executeBloodExchange = executeBloodExchange;
  window.toggleBloodSacrificeItem = toggleBloodSacrificeItem;
  window.bloodSacrificeSelectAll = bloodSacrificeSelectAll;
  window.calcBloodSacrificeValue = calcBloodSacrificeValue;
}


// ============================================================
// 🏰 妖魔堡攻城戰 (Orc Fortress Siege) 地圖資料與出怪池 (DB.maps & DB.mobs 注入)
// ============================================================
(function initOrcFortressSiegeData() {
  function ensureOrcFortressData() {
    if (typeof DB === 'undefined') return;
    if (!DB.maps) DB.maps = {};
    if (!DB.mobs) DB.mobs = {};
    if (!DB.towns) DB.towns = {};

    // 1. 妖魔堡攻城守軍與建築 (完整 siege 結構，比照奇岩城的規格)
    if (!DB.mobs['orc_gate']) {
      DB.mobs['orc_gate'] = {
        n: '妖魔堡門', lv: 1, s: 'L', hp: 65000, curHp: 65000,
        ac: 12, mr: 0, dr: 7, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hp: 65000, ac: 12, mr: 0, dr: 7 },
        spr: '241', exp: 11000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['orc_tower']) {
      DB.mobs['orc_tower'] = {
        n: '妖魔堡守護塔', lv: 1, s: 'L', hp: 55000, curHp: 55000,
        ac: 12, mr: 0, dr: 11, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hpPerLv: 550, hp: 55000, ac: 12, mr: 0, dr: 11 },
        spr: '240', exp: 55000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['orc_guard']) {
      DB.mobs['orc_guard'] = {
        n: '妖魔堡守衛', lv: 60, s: 'S', hp: 3300, curHp: 3300,
        ac: -22, mr: 32, atkSpd: 1.0, dmg: [1, 14], db: 60, hit: 38,
        beh: '主動', race: '妖魔', siegeEnemy: true,
        siege: { hpC: 48, acBase: -22, mrBase: 32, dmgSides: 14, hitBase: 12 },
        spr: '1254', exp: 3800, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['orc_berserker']) {
      DB.mobs['orc_berserker'] = {
        n: '狂暴獸人', lv: 60, s: 'S', hp: 2600, curHp: 2600,
        ac: -18, mr: 28, atkSpd: 0.8, dmg: [1, 18], db: 65, hit: 42,
        beh: '主動', race: '妖魔', siegeEnemy: true,
        siege: { hpC: 38, acBase: -18, mrBase: 28, dmgSides: 18, hitBase: 17 },
        spr: '1256', exp: 3500, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['orc_shaman']) {
      DB.mobs['orc_shaman'] = {
        n: '妖魔堡薩滿', lv: 60, s: 'S', hp: 2100, curHp: 2100,
        ac: -12, mr: 52, atkSpd: 1.2, dmg: [1, 16], db: 58, hit: 32,
        beh: '主動', magic: true, race: '妖魔', siegeEnemy: true,
        siege: { hpC: 32, acBase: -12, mrBase: 52, dmgSides: 16, hitBase: 12 },
        spr: '1278', exp: 4000, goldMin: 0, goldMax: 0
      };
    }

    // 2. 出怪池注入 (強制寫入)
    DB.maps['orc_outer'] = ['orc_guard', 'orc_berserker', 'orc_shaman', 'orc_gate'];
    DB.maps['orc_inner'] = ['orc_guard', 'orc_berserker', 'orc_shaman', 'orc_tower'];

    // 3. 妖魔堡城堡內殿城鎮資料 (攻城獲勝後開放)
    if (!DB.towns['town_orc_castle']) {
      DB.towns['town_orc_castle'] = {
        id: 'town_orc_castle',
        n: '妖魔堡',
        title: '妖魔堡內殿',
        npcs: [
          { id: 'npc_blood_priestess', n: '血祭祭司 · 卡蓮', title: '血祭祭壇', type: 'craft', spr: '3227' },
          { id: 'npc_wh_orc_castle', n: '巴血', title: '倉庫', type: 'warehouse', spr: '1307' },
          { id: 'npc_orc_guard_captain', n: '妖魔堡守衛隊長', title: '城堡護衛', type: 'castleguard', spr: '3858' },
          { id: 'npc_esti', n: '依詩蒂', title: '血盟管理', type: 'pledge', spr: '3227' },
          { id: 'npc_hert', n: '赫特', title: '魔物追蹤', type: 'quest', spr: '1049' }
        ]
      };
    }

    // 4. 動畫別名支援
    if (typeof MOB_ANIM_NAMES !== 'undefined') {
      ['妖魔堡守衛', '狂暴獸人', '妖魔堡薩滿', '妖魔堡門', '妖魔堡守護塔'].forEach(n => MOB_ANIM_NAMES.add(n));
    }
    if (typeof MOB_ANIM_ALIAS !== 'undefined') {
      MOB_ANIM_ALIAS['妖魔堡守衛'] = '玩家男騎士';
      MOB_ANIM_ALIAS['狂暴獸人'] = '玩家男戰士';
      MOB_ANIM_ALIAS['妖魔堡薩滿'] = '玩家男法師';
      MOB_ANIM_ALIAS['妖魔堡門'] = '肯特城門';
      MOB_ANIM_ALIAS['妖魔堡守護塔'] = '肯特守護塔';
    }
    if (typeof MOB_ANIM_BAKED_SHADOW !== 'undefined') {
      MOB_ANIM_BAKED_SHADOW.add('妖魔堡門');
    }

    // 5. 背景備份
    if (typeof SPECIAL_AREA_BG !== 'undefined') {
      SPECIAL_AREA_BG['orc_outer'] = 'assets/area/1920x1080/風木外門區.jpg';
      SPECIAL_AREA_BG['orc_inner'] = 'assets/area/1920x1080/風木內城.jpg';
      SPECIAL_AREA_BG['town_orc_castle'] = 'assets/area/1920x1080/風木內城.jpg';
    }
  }

  // 立即執行 (同步)，不等待 DOMContentLoaded
  ensureOrcFortressData();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureOrcFortressData);
  }
  window.ensureOrcFortressData = ensureOrcFortressData;
})();
