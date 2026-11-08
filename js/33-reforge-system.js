// ============================================================
// js/33-reforge-system.js — 💰 奇岩重鑄所（裝備洗隨機詞綴系統）
// ============================================================
'use strict';

// 🌈 v3.8.34 六階品階系統定案：白(一般)→綠(罕見)→藍(稀有)→紫(英雄)→金(傳說)→神話(紅)。
//    單一真相：顏色/標籤/排序集中於此，33 本檔的重鑄 UI 與 10-ui-tabs.js 的裝備說明欄 tooltip 都讀這份，避免兩邊各自維護、對不起來（前車之鑑：抗魔結界那次）。
const REFORGE_TIER_ORDER = ['mythic', 'gold', 'purple', 'blue', 'green', 'white'];   // 由稀有到常見排序，rollReforgeAffixTier 用這個順序累加機率
const REFORGE_TIER_META = {
  mythic: { label: '神話', badge: '【神話·紅】', color: '#ef4444' },   // 用戶確認「虹」是手滑，改回紅
  gold:   { label: '傳說', badge: '【傳說·金】', color: '#fbbf24' },
  purple: { label: '英雄', badge: '【英雄·紫】', color: '#c084fc' },
  blue:   { label: '稀有', badge: '【稀有·藍】', color: '#60a5fa' },
  green:  { label: '罕見', badge: '【罕見·綠】', color: '#4ade80' },
  white:  { label: '一般', badge: '【一般·白】', color: '#e5e7eb' }
};

const REFORGE_TIERS = {
  tier1: {
    id: 'tier1',
    name: '初級重鑄',
    color: '#e5e7eb',
    gold: 50000,
    materials: [
      { id: 'mat_magic_gem', name: '魔法寶石', count: 5, altId: 'mat_rough_stone', altName: '粗糙原石', altCount: 10 },
      { id: 'new_item_195', name: '精靈玉', count: 3 }
    ],
    probs: { white: 0.59, green: 0.32, blue: 0.08, purple: 0.01 }   // 只開得出 白／綠／藍，另有 1% 機率直接開出英雄(紫)
  },
  tier2: {
    id: 'tier2',
    name: '席琳血祭重鑄',
    color: '#60a5fa',
    gold: 300000,
    materials: [
      { id: 'sherine_crystal', name: '席琳結晶', count: 20 },
      { id: 'mat_black_blood', name: '黑色血痕', count: 50 }
    ],
    probs: { green: 0.49, blue: 0.35, purple: 0.15, gold: 0.01 }   // 只開得出 綠／藍／紫，另有 1% 機率直接開出傳說(金)
  },
  tier3: {
    id: 'tier3',
    name: '瘋狂席琳·極限重鑄',
    color: '#ef4444',
    gold: 1200000,
    materials: [
      { id: 'sherine_crystal', name: '席琳結晶', count: 50 },
      { id: 'mat_crack_core', name: '龜裂之核', count: 150 },
      { id: 'sherine_crystal_relic', name: '遺物席琳結晶', count: 10 }
    ],
    probs: { purple: 0.45, gold: 0.35, mythic: 0.20 }   // 只開得出 紫／金／神話
  }
};

const REFORGE_AFFIX_POOLS = {
  weapon: [
    {
      key: 'physDmgBonus', name: '💥 巨力狂瀾', type: 'weapon',
      white: { val: 4, text: '物理傷害 +4' },
      green: { val: 8, text: '物理傷害 +8' },
      blue: { val: 15, text: '物理傷害 +15' },
      purple: { val: 35, text: '物理傷害 +35' },
      gold: { val: 80, text: '物理傷害 +80' },
      mythic: { val: 200, text: '物理傷害 +200' }
    },
    {
      key: 'physDmgPct', name: '🔥 物理終極增幅', type: 'weapon',
      white: { val: 4, text: '物理總傷害 +4%' },
      green: { val: 8, text: '物理總傷害 +8%' },
      blue: { val: 15, text: '物理總傷害 +15%' },
      purple: { val: 35, text: '物理總傷害 +35%' },
      gold: { val: 70, text: '物理總傷害 +70%' },
      mythic: { val: 120, text: '物理總傷害 +120%' }
    },
    {
      key: 'strScaleDmg', name: '👑 力拔山河', type: 'weapon',
      white: { coef: 0.15, text: '附加 [力量 × 0.15] 額外傷害' },
      green: { coef: 0.25, text: '附加 [力量 × 0.25] 額外傷害' },
      blue: { coef: 0.5, text: '附加 [力量 × 0.5] 額外傷害' },
      purple: { coef: 1.0, text: '附加 [力量 × 1.0] 額外傷害' },
      gold: { coef: 1.8, text: '附加 [力量 × 1.8] 額外傷害' },
      mythic: { coef: 3.0, text: '附加 [力量 × 3.0] 額外傷害' }
    },
    {
      key: 'dexScaleDmg', name: '🎯 極速穿心', type: 'weapon',
      white: { coef: 0.15, text: '附加 [敏捷 × 0.15] 遠程傷害' },
      green: { coef: 0.25, text: '附加 [敏捷 × 0.25] 遠程傷害' },
      blue: { coef: 0.5, text: '附加 [敏捷 × 0.5] 遠程傷害' },
      purple: { coef: 1.0, text: '附加 [敏捷 × 1.0] 遠程傷害' },
      gold: { coef: 1.8, text: '附加 [敏捷 × 1.8] 遠程傷害' },
      mythic: { coef: 3.0, text: '附加 [敏捷 × 3.0] 遠程傷害' }
    },
    {
      key: 'physCritRate', name: '💀 屠戮之眼', type: 'weapon',
      white: { val: 2, text: '物理爆擊率 +2%' },
      green: { val: 3, text: '物理爆擊率 +3%' },
      blue: { val: 5, text: '物理爆擊率 +5%' },
      purple: { val: 10, text: '物理爆擊率 +10%' },
      gold: { val: 18, text: '物理爆擊率 +18%' },
      mythic: { val: 30, text: '物理爆擊率 +30%' }
    },
    {
      key: 'physCritDmg', name: '🩸 崩天裂地', type: 'weapon',
      white: { val: 10, text: '物理爆擊傷害 +10%' },
      green: { val: 20, text: '物理爆擊傷害 +20%' },
      blue: { val: 40, text: '物理爆擊傷害 +40%' },
      purple: { val: 90, text: '物理爆擊傷害 +90%' },
      gold: { val: 180, text: '物理爆擊傷害 +180%' },
      mythic: { val: 350, text: '物理爆擊傷害 +350%' }
    },
    {
      key: 'trueDmgPierce', name: '🗡️ 開天闢地', type: 'weapon',
      white: { val: 2, pierce: 4, text: '忽視防禦 4% 且命中 +2' },
      green: { val: 3, pierce: 8, text: '忽視防禦 8% 且命中 +3' },
      blue: { val: 5, pierce: 15, text: '忽視防禦 15% 且命中 +5' },
      purple: { val: 10, pierce: 30, text: '忽視防禦 30% 且命中 +10' },
      gold: { val: 20, pierce: 60, text: '忽視防禦 60% 且命中 +20' },
      mythic: { val: 35, pierce: 100, text: '100% 無視防禦與硬皮 (真實傷害)，命中 +35' }
    },
    {
      key: 'comboRate', name: '🌪️ 狂風連斬', type: 'weapon',
      white: { val: 3, text: '普攻 3% 機率觸發雙連擊' },
      green: { val: 5, text: '普攻 5% 機率觸發雙連擊' },
      blue: { val: 10, text: '普攻 10% 機率觸發雙連擊' },
      purple: { val: 20, text: '普攻 20% 機率觸發雙連擊' },
      gold: { val: 35, text: '普攻 35% 機率觸發雙連擊' },
      mythic: { val: 50, text: '普攻 50% 機率觸發雙連擊' }
    },
    {
      key: 'vampPct', name: '🩸 嗜血獠牙', type: 'weapon',
      white: { val: 0.3, text: '命中吸血 +0.3%' },
      green: { val: 0.5, text: '命中吸血 +0.5%' },
      blue: { val: 1.0, text: '命中吸血 +1.0%' },
      purple: { val: 2.0, text: '命中吸血 +2.0%' },
      gold: { val: 3.5, text: '命中吸血 +3.5%' },
      mythic: { val: 5.0, text: '命中吸血 +5.0%' }
    },
    {
      key: 'magicDmg', name: '🔮 魔導奔流', type: 'weapon',
      white: { val: 1, text: '魔法傷害 +1' },
      green: { val: 2, text: '魔法傷害 +2' },
      blue: { val: 3, text: '魔法傷害 +3' },
      purple: { val: 6, text: '魔法傷害 +6' },
      gold: { val: 12, text: '魔法傷害 +12' },
      mythic: { val: 25, text: '魔法傷害 +25' }
    }
  ],
  armor: [
    {
      key: 'dr', name: '🛡️ 銅牆鐵壁', type: 'armor',
      white: { val: 1, text: '傷害減免 +1' },
      green: { val: 2, text: '傷害減免 +2' },
      blue: { val: 4, text: '傷害減免 +4' },
      purple: { val: 6, text: '傷害減免 +6' },
      gold: { val: 8, text: '傷害減免 +8' },
      mythic: { val: 15, text: '傷害減免 +15' }
    },
    {
      key: 'ac', name: '🏰 堅韌守護', type: 'armor',
      white: { val: 1, text: '防禦力 AC -1' },
      green: { val: 2, text: '防禦力 AC -2' },
      blue: { val: 4, text: '防禦力 AC -4' },
      purple: { val: 6, text: '防禦力 AC -6' },
      gold: { val: 8, text: '防禦力 AC -8' },
      mythic: { val: 15, text: '防禦力 AC -15' }
    },
    {
      key: 'magicDr', name: '✨ 抗魔結界', type: 'armor',
      white: { val: 2, text: '魔法傷害減免 +2%' },
      green: { val: 3, text: '魔法傷害減免 +3%' },
      blue: { val: 6, text: '魔法傷害減免 +6%' },
      purple: { val: 8, text: '魔法傷害減免 +8%' },
      gold: { val: 10, text: '魔法傷害減免 +10%' },
      mythic: { val: 18, text: '魔法傷害減免 +18%' }
    },
    {
      key: 'er', name: '💨 幻影迷蹤', type: 'armor',
      white: { val: 1, text: '閃避率 ER +1%' },
      green: { val: 2, text: '閃避率 ER +2%' },
      blue: { val: 4, text: '閃避率 ER +4%' },
      purple: { val: 6, text: '閃避率 ER +6%' },
      gold: { val: 8, text: '閃避率 ER +8%' },
      mythic: { val: 13, text: '閃避率 ER +13%' }
    },
    {
      key: 'mhp', name: '💖 氣血蓬勃', type: 'armor',
      white: { val: 40, text: '最大生命 HP +40' },
      green: { val: 75, text: '最大生命 HP +75' },
      blue: { val: 150, text: '最大生命 HP +150' },
      purple: { val: 350, text: '最大生命 HP +350' },
      gold: { val: 800, text: '最大生命 HP +800' },
      mythic: { val: 1800, text: '最大生命 HP +1800' }
    },
    {
      key: 'stunResist', name: '🗿 磐石意志', type: 'armor',
      white: { val: 2, text: '暈眩/凍結/麻痺/沉睡抗性 +2%' },
      green: { val: 4, text: '暈眩/凍結/麻痺/沉睡抗性 +4%' },
      blue: { val: 7, text: '暈眩/凍結/麻痺/沉睡抗性 +7%' },
      purple: { val: 11, text: '暈眩/凍結/麻痺/沉睡抗性 +11%' },
      gold: { val: 15, text: '暈眩/凍結/麻痺/沉睡抗性 +15%' },
      mythic: { val: 20, text: '暈眩/凍結/麻痺/沉睡抗性 +20%' }
    }
  ],
  accessory: [
    {
      key: 'goldDrop', name: '💰 黃金律法', type: 'accessory',
      white: { val: 7, text: '金幣掉落 +7%' },
      green: { val: 13, text: '金幣掉落 +13%' },
      blue: { val: 25, text: '金幣掉落 +25%' },
      purple: { val: 35, text: '金幣掉落 +35%' },
      gold: { val: 40, text: '金幣掉落 +40%' },
      mythic: { val: 75, text: '金幣掉落 +75%' }
    },
    {
      key: 'expGain', name: '📜 天道眷顧', type: 'accessory',
      white: { val: 3, text: '經驗值獲得 +3%' },
      green: { val: 5, text: '經驗值獲得 +5%' },
      blue: { val: 10, text: '經驗值獲得 +10%' },
      purple: { val: 15, text: '經驗值獲得 +15%' },
      gold: { val: 18, text: '經驗值獲得 +18%' },
      mythic: { val: 30, text: '經驗值獲得 +30%' }
    },
    {
      key: 'dropRate', name: '💎 尋寶秘術', type: 'accessory',
      white: { val: 3, text: '掉寶率提升 +3%' },
      green: { val: 6, text: '掉寶率提升 +6%' },
      blue: { val: 12, text: '掉寶率提升 +12%' },
      purple: { val: 20, text: '掉寶率提升 +20%' },
      gold: { val: 25, text: '掉寶率提升 +25%' },
      mythic: { val: 50, text: '掉寶率提升 +50%' }
    },
    {
      key: 'allStats', name: '🌟 全能神啟', type: 'accessory',
      white: { val: 1, text: '全六維屬性 +1' },
      green: { val: 2, text: '全六維屬性 +2' },
      blue: { val: 3, text: '全六維屬性 +3' },
      purple: { val: 5, text: '全六維屬性 +5' },
      gold: { val: 8, text: '全六維屬性 +8' },
      mythic: { val: 13, text: '全六維屬性 +13' }
    }
  ]
};

let _reforgeSelectedUid = null;
let _reforgeSelectedTier = 'tier1';
let _reforgeLockedIndices = {};

// 🔒 詞綴鎖定消耗倍率：單一真相，金幣與材料一律套用同一份倍率（鎖 1 條 ×2、鎖 2 條 ×4）。
//    numLocks 理論上不會超過 2（UI 由 toggleReforgeLock 擋下），這裡仍夾住上限做保險，避免鎖越多反而越便宜。
function _reforgeLockMultiplier() {
  let numLocks = Math.min(2, Object.keys(_reforgeLockedIndices).filter(k => _reforgeLockedIndices[k]).length);
  return numLocks === 1 ? 2 : numLocks === 2 ? 4 : 1;
}

function getReforgeTargetItem() {
  if (!_reforgeSelectedUid || typeof player === 'undefined' || !player) return null;
  // 🔒 v3.8.34 用戶拍板：重鑄僅限已裝備在身上的裝備，不再回退搜尋背包
  if (player.eq) {
    for (let k in player.eq) {
      let item = player.eq[k];
      if (item && (item.uid === _reforgeSelectedUid || item.id === _reforgeSelectedUid)) return item;
    }
  }
  return null;
}

const REFORGE_EXCLUDED_SLOTS = {   // 🔒 v3.8.34 這些欄位雖然 type 掛 wpn/acc，但都是特殊機制專屬裝備，不可重鑄（逐一核對 00-data.js 全部 slot 值得出的完整清單，非僅席琳遺骸）
  doll: 1, eye: 1, petarm: 1, petwpn: 1,
  rem_blood: 1, rem_bone: 1, rem_claw: 1, rem_eye: 1, rem_fang: 1, rem_flesh: 1, rem_heart: 1, rem_scale: 1
};
function getItemReforgeType(item) {
  if (!item) return null;
  if ((item.cnt || 1) > 1) return null;   // 🔒 v3.8.34 多件疊加的同簽章裝備（背包同格 cnt>1）不可重鑄：疊在一起是同一個物件參照，重鑄只花一次錢卻會讓整疊全部一起帶上同樣的詞綴（裝備時複製、留在背包也共用同一份），必須先拆成單件才能重鑄
  let d = (typeof DB !== 'undefined' && DB.items && DB.items[item.id]) || {};
  if (d.isArrow) return null;   // 🔒 v3.8.34 箭矢：type 雖登記為 wpn，但屬消耗性彈藥，不可重鑄
  if (d.slot && REFORGE_EXCLUDED_SLOTS[d.slot]) return null;   // 🔒 v3.8.34 娃娃／魔眼／寵物裝備／席琳遺骸（8 種）：type 多半登記為 acc，靠 slot 名單擋下
  if (d.type === 'wpn') return 'weapon';
  if (d.type === 'arm') return 'armor';
  if (d.type === 'acc') return 'accessory';
  return null;   // 🔒 v3.8.34 其餘一律不可重鑄
}

// 💰 v3.8.34 材料讀取/扣除：背包優先、不足自動查倉庫補足，比照遊戲原生製作系統（js/14 的 invCountId／consumeMaterialById／whCountId／whConsumeId）同一套口徑。
//   鎖定物品不列入可用材料（跟原生製作系統一致，避免誤銷毀玩家特意上鎖保護的裝備）。
function countPlayerItem(itemId, altId) {
  let count = 0;
  if (player && player.inv) {
    player.inv.forEach(i => {
      if (!i || i.lock) return;
      if (i.id === itemId || (altId && i.id === altId)) count += (Number(i.cnt) || 1);
    });
  }
  if (typeof whCountId === 'function') {
    count += whCountId(itemId);
    if (altId) count += whCountId(altId);
  }
  return count;
}

function consumePlayerItem(itemId, count, altId) {
  if (!player || count <= 0) return false;
  let remaining = count;
  function consumeFromInv(id) {
    if (remaining <= 0 || !player.inv) return;
    let stacks = player.inv.filter(i => i && i.id === id && !i.lock);
    // 白板/低強化優先被消耗，排序邏輯與遊戲原生製作系統一致
    stacks.sort((a, b) => (((a.en || 0) * 100) + (a.anc ? 10 : 0) + (a.bless ? 10 : 0) + (a.attr ? 10 : 0) + (a.seteff ? 50 : 0)) - (((b.en || 0) * 100) + (b.anc ? 10 : 0) + (b.bless ? 10 : 0) + (b.attr ? 10 : 0) + (b.seteff ? 50 : 0)));
    let gone = new Set();
    for (let st of stacks) {
      if (remaining <= 0) break;
      let c = Number(st.cnt) || 1;
      let d = Math.min(c, remaining);
      st.cnt = c - d;
      remaining -= d;
      if (st.cnt <= 0) gone.add(st.uid);
    }
    if (gone.size) player.inv = player.inv.filter(i => !(i && gone.has(i.uid)));
  }
  consumeFromInv(itemId);
  if (remaining > 0 && typeof whConsumeId === 'function') remaining -= whConsumeId(itemId, remaining);
  if (remaining > 0 && altId) {
    consumeFromInv(altId);
    if (remaining > 0 && typeof whConsumeId === 'function') remaining -= whConsumeId(altId, remaining);
  }
  return remaining <= 0;
}

function rollReforgeAffixTier(cfg) {
  let r = Math.random();
  let cum = 0;
  for (let i = 0; i < REFORGE_TIER_ORDER.length - 1; i++) {
    let t = REFORGE_TIER_ORDER[i];
    cum += (cfg.probs[t] || 0);
    if (r < cum) return t;
  }
  return REFORGE_TIER_ORDER[REFORGE_TIER_ORDER.length - 1];   // 剩餘機率歸給序列最後一階（各檔次 probs 只填自己開得出的 3 階，其餘為 0，故不會越級開出範圍外的品階）
}

function executeReforgingAction() {
  let item = getReforgeTargetItem();
  if (!item) {
    if (typeof alertSysMsg === 'function') alertSysMsg('請先選擇要重鑄的裝備！');
    return;
  }
  let itemType = getItemReforgeType(item);
  if (!itemType) {   // 🔒 v3.8.34 非武器/防具/飾品：理論上選單已濾掉，這裡是保險，且要在扣費「之前」擋下，不能讓玩家白花錢
    if (typeof alertSysMsg === 'function') alertSysMsg('此裝備無法重鑄！僅武器、防具、飾品可進行重鑄。');
    return;
  }
  let tierCfg = REFORGE_TIERS[_reforgeSelectedTier] || REFORGE_TIERS.tier1;
  let costMultiplier = _reforgeLockMultiplier();
  let requiredGold = tierCfg.gold * costMultiplier;

  if ((player.gold || 0) < requiredGold) {
    if (typeof alertSysMsg === 'function') alertSysMsg('金幣不足！需要 ' + requiredGold.toLocaleString() + ' 金幣。');
    return;
  }

  // Check materials
  for (let mat of tierCfg.materials) {
    let have = countPlayerItem(mat.id, mat.altId);
    let need = mat.count * costMultiplier;
    if (have < need) {
      if (typeof alertSysMsg === 'function') alertSysMsg('材料不足！缺少 ' + mat.name + ' ×' + need + '（目前持有：' + have + '）。');
      return;
    }
  }

  // Deduct costs
  player.gold -= requiredGold;
  for (let mat of tierCfg.materials) {
    let need = mat.count * costMultiplier;
    consumePlayerItem(mat.id, need, mat.altId);
  }

  // Generate Affixes
  let pool = REFORGE_AFFIX_POOLS[itemType] || [];   // 🔒 v3.8.34 各類型只抽自己的池：武器詞綴只給武器、防具詞綴只給防具、飾品詞綴只給飾品，不再互相混池
  let maxSlots = 3;
  if (!item.reforgeAffixes || !Array.isArray(item.reforgeAffixes)) {
    item.reforgeAffixes = [];
  }

  let newAffixes = [];
  let usedKeys = new Set();

  for (let i = 0; i < maxSlots; i++) {
    if (_reforgeLockedIndices[i] && item.reforgeAffixes[i]) {
      newAffixes.push(item.reforgeAffixes[i]);
      usedKeys.add(item.reforgeAffixes[i].key);
    } else {
      let available = pool.filter(p => !usedKeys.has(p.key));
      if (!available.length) available = pool;
      let chosen = available[Math.floor(Math.random() * available.length)];
      usedKeys.add(chosen.key);
      let rolledTier = rollReforgeAffixTier(tierCfg);
      let tierData = chosen[rolledTier] || chosen.white;
      newAffixes.push({
        key: chosen.key,
        name: chosen.name,
        tier: rolledTier,
        val: tierData.val || 0,
        coef: tierData.coef || 0,
        pierce: tierData.pierce || 0,
        text: tierData.text
      });
    }
  }

  item.reforgeAffixes = newAffixes;

  try { if (typeof playSfx === 'function') playSfx('enchant'); } catch (e) {}
  if (typeof logSys === 'function') {
    let d = (typeof DB !== 'undefined' && DB.items && DB.items[item.id]) || {};
    let full = (item.en ? '+' + item.en + ' ' : '') + (d.n || item.id);
    logSys('<span class="text-amber-300 font-bold">✨【奇岩重鑄所】</span>成功為【' + full + '】重鑄了 ' + newAffixes.length + ' 條詞綴！');
  }

  if (typeof calcStats === 'function') calcStats();
  if (typeof updateUI === 'function') updateUI();
  if (typeof saveGame === 'function') saveGame();
  renderReforgeMasterUI();
}


function selectReforgeItem(uid) {
  _reforgeSelectedUid = uid;
  _reforgeLockedIndices = {};
  renderReforgeMasterUI();
}

function selectReforgeTier(tierKey) {
  _reforgeSelectedTier = tierKey;
  renderReforgeMasterUI();
}

function toggleReforgeLock(slotIndex) {
  if (_reforgeLockedIndices[slotIndex]) {
    delete _reforgeLockedIndices[slotIndex];
  } else {
    // Check max locks (at most 2 locks allowed for 3 slots)
    let currentLocks = Object.keys(_reforgeLockedIndices).length;
    if (currentLocks >= 2) {
      if (typeof alertSysMsg === 'function') alertSysMsg('最多只能鎖定 2 條詞綴！');
      return;
    }
    _reforgeLockedIndices[slotIndex] = true;
  }
  renderReforgeMasterUI();
}

function renderReforgeMasterUI(targetContainer) {
  let cont = targetContainer || document.getElementById('interaction-content') || document.getElementById('town-interaction-container');
  if (!cont) return;
  
  let playerGears = [];
  if (player.eq) {
    for (let slot in player.eq) {
      let it = player.eq[slot];
      if (!it || !it.id) continue;
      if (!getItemReforgeType(it)) continue;   // 🔒 v3.8.34 單一真相：只有武器/防具/飾品可重鑄，箭矢/娃娃/席琳遺骸/魔眼等一律排除（與 executeReforgingAction 的檢查同一份函式，不會再各自維護各自漏）
      playerGears.push(Object.assign({ isEquipped: true, slotKey: slot }, it));
    }
  }
  // 🔒 v3.8.34 用戶拍板：重鑄僅限「已裝備在身上」的裝備，背包/存放欄一律不列入可選清單（避免疊加同格詞綴外洩等問題，且符合「隨身裝備才能重鑄」的設計定案）

  if (!_reforgeSelectedUid && playerGears.length > 0) {
    _reforgeSelectedUid = playerGears[0].uid || playerGears[0].id;
  }

  let selectedItem = getReforgeTargetItem();
  let tierCfg = REFORGE_TIERS[_reforgeSelectedTier] || REFORGE_TIERS.tier1;
  let costMultiplier = _reforgeLockMultiplier();
  let finalGoldCost = tierCfg.gold * costMultiplier;

  let html = `
  <div style="background:rgba(18,16,22,0.96);border:1px solid #c5a64f;border-radius:8px;padding:16px;color:#f3f4f6;max-width:820px;margin:0 auto;box-shadow:0 8px 32px rgba(0,0,0,0.8);font-family:sans-serif;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(197,166,79,0.3);padding-bottom:10px;margin-bottom:14px;">
      <div>
        <h2 style="margin:0;font-size:20px;color:#fde047;display:flex;align-items:center;gap:8px;">
          <span>💰 奇岩黑市重鑄所</span>
          <span style="font-size:12px;padding:2px 8px;border-radius:4px;background:#4b300d;color:#fde68a;border:1px solid #b45309;">奇岩城主專屬工坊</span>
        </h2>
        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">洗練頂級專屬詞綴 · 支援鎖定詞條 · 提升物理/魔法爆發</div>
      </div>
      <button onclick="closeNpcInteraction()" style="background:#374151;border:none;color:#d1d5db;padding:4px 10px;border-radius:4px;cursor:pointer;">✕ 關閉</button>
    </div>

    <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;">
      <!-- Left Column: Equipment List -->
      <div style="background:rgba(28,25,35,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;max-height:420px;overflow-y:auto;">
        <div style="font-size:13px;font-weight:bold;color:#fcd34d;margin-bottom:8px;">選擇重鑄裝備 (${playerGears.length})</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
  `;

  playerGears.forEach(g => {
    let d = (typeof DB !== 'undefined' && DB.items && DB.items[g.id]) || {};
    let uid = g.uid || g.id;
    let isSel = (uid === _reforgeSelectedUid);
    let affCount = (g.reforgeAffixes && g.reforgeAffixes.length) || 0;
    html += `
      <div onclick="selectReforgeItem('${uid}')" style="padding:6px 8px;border-radius:4px;cursor:pointer;border:1px solid ${isSel ? '#f59e0b' : '#374151'};background:${isSel ? 'rgba(245,158,11,0.18)' : 'rgba(31,41,55,0.5)'};display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;color:${isSel ? '#fbbf24' : '#e5e7eb'};font-weight:${isSel ? 'bold' : 'normal'};">
            ${g.isEquipped ? '<span style="color:#60a5fa;font-size:10px;">[裝備中]</span> ' : ''}${g.en ? '+' + g.en + ' ' : ''}${d.n || g.id}
          </div>
          <div style="font-size:11px;color:${affCount ? '#34d399' : '#9ca3af'};">${affCount ? '已附 ' + affCount + ' 條詞綴' : '尚未重鑄'}</div>
        </div>
      </div>
    `;
  });

  html += `
        </div>
      </div>

      <!-- Right Column: Reforge Workspace -->
      <div style="display:flex;flex-direction:column;gap:12px;">
        <!-- Selected Item Box -->
        <div style="background:rgba(30,27,38,0.9);border:1px solid #c5a64f;border-radius:6px;padding:12px;">
  `;

  if (selectedItem && getItemReforgeType(selectedItem)) {
    let sd = (typeof DB !== 'undefined' && DB.items && DB.items[selectedItem.id]) || {};
    let affs = selectedItem.reforgeAffixes || [];
    html += `
      <div style="font-size:15px;font-weight:bold;color:#fde047;border-bottom:1px solid #4b5563;padding-bottom:6px;margin-bottom:8px;">
        ${selectedItem.en ? '+' + selectedItem.en + ' ' : ''}${sd.n || selectedItem.id}
      </div>
      <div style="font-size:12px;color:#cbd5e1;margin-bottom:10px;">當前詞綴槽位（點擊右側 🔒 可鎖定詞綴）：</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
    `;

    for (let slot = 0; slot < 3; slot++) {
      let aff = affs[slot];
      let isLocked = !!_reforgeLockedIndices[slot];
      let tierColor = !aff ? '#6b7280' : (REFORGE_TIER_META[aff.tier] ? REFORGE_TIER_META[aff.tier].color : '#4ade80');
      let tierBadge = !aff ? '' : (REFORGE_TIER_META[aff.tier] ? REFORGE_TIER_META[aff.tier].badge : '');
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(15,13,19,0.8);border:1px solid ${tierColor};padding:6px 10px;border-radius:4px;">
          <div>
            <span style="color:${tierColor};font-weight:bold;font-size:13px;">${aff ? aff.name : '[ 槽位 ' + (slot + 1) + '：空 ]'}</span>
            ${aff ? '<span style="font-size:11px;color:' + tierColor + ';margin-left:6px;">' + tierBadge + '</span>' : ''}
            <div style="font-size:12px;color:#e2e8f0;margin-top:2px;">${aff ? aff.text : '點擊重鑄洗出隨機詞綴'}</div>
          </div>
          ${aff ? `
          <button onclick="toggleReforgeLock(${slot})" style="padding:4px 8px;border-radius:4px;cursor:pointer;border:1px solid ${isLocked ? '#f59e0b' : '#6b7280'};background:${isLocked ? '#78350f' : '#374151'};color:${isLocked ? '#fde68a' : '#d1d5db'};font-size:12px;">
            ${isLocked ? '🔒 已鎖定' : '🔓 點擊鎖定'}
          </button>` : ''}
        </div>
      `;
    }

    html += `</div>`;
  } else {
    html += `<div style="color:#9ca3af;font-size:13px;">請從左側列表選擇欲重鑄的武器或防具。</div>`;
  }

  html += `
        </div>

        <!-- Tier Selection -->
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
  `;

  Object.values(REFORGE_TIERS).forEach(t => {
    let isSel = (_reforgeSelectedTier === t.id);
    let _probLine = Object.keys(t.probs)
      .sort((a, b) => REFORGE_TIER_ORDER.indexOf(a) - REFORGE_TIER_ORDER.indexOf(b))
      .map(k => `<span style="color:${REFORGE_TIER_META[k].color};">${REFORGE_TIER_META[k].label}${(t.probs[k] * 100).toFixed(0)}%</span>`)
      .join(' / ');
    html += `
      <div onclick="_reforgeSelectedTier='${t.id}';renderReforgeMasterUI();" style="border:1px solid ${isSel ? t.color : '#4b5563'};background:${isSel ? 'rgba(30,41,59,0.9)' : 'rgba(20,18,25,0.7)'};padding:8px;border-radius:6px;cursor:pointer;text-align:center;">
        <div style="font-size:13px;font-weight:bold;color:${t.color};">${t.name}</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:4px;">
          ${_probLine}
        </div>
      </div>
    `;
  });

  html += `
        </div>

        <!-- Cost & Execution -->
        <div style="background:rgba(20,18,25,0.8);border:1px solid #4b5563;border-radius:6px;padding:10px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:12px;color:#d1d5db;">
            <div>金幣消耗：<span style="color:#fde047;font-weight:bold;">${finalGoldCost.toLocaleString()}</span> (持有: ${(player.gold || 0).toLocaleString()})</div>
            <div style="margin-top:2px;">所需材料：
  `;

  tierCfg.materials.forEach(mat => {
    let need = mat.count * costMultiplier;
    let have = countPlayerItem(mat.id, mat.altId);
    let ok = have >= need;
    html += `<span style="color:${ok ? '#34d399' : '#f87171'};margin-right:8px;">${mat.name} ${have}/${need}</span>`;
  });

  html += `
            </div>
          </div>
          <button onclick="executeReforgingAction()" style="padding:10px 20px;border-radius:6px;cursor:pointer;background:linear-gradient(135deg, #d97706, #b45309);border:1px solid #fde68a;color:#fff;font-weight:bold;font-size:14px;box-shadow:0 4px 12px rgba(217,119,6,0.4);">
            ⚡ 開始重鑄
          </button>
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
  window.renderReforgeMasterUI = renderReforgeMasterUI;
  window.executeReforgingAction = executeReforgingAction;
  window.selectReforgeItem = selectReforgeItem;
  window.selectReforgeTier = selectReforgeTier;
  window.toggleReforgeLock = toggleReforgeLock;
  window.getReforgeTargetItem = getReforgeTargetItem;
  window._reforgeSelectedTier = _reforgeSelectedTier;
  window._reforgeLockedIndices = _reforgeLockedIndices;
  window.REFORGE_TIER_META = REFORGE_TIER_META;
}


// ============================================================
// ============================================================
// 🏰 奇岩攻城戰 (Giran Siege) 地圖資料與出怪池 (DB.maps & DB.mobs 注入)
// ============================================================
(function initGiranSiegeData() {
  function ensureGiranData() {
    if (typeof DB === 'undefined') return;
    if (!DB.maps) DB.maps = {};
    if (!DB.mobs) DB.mobs = {};
    if (!DB.towns) DB.towns = {};

    // 1. 奇岩攻城守軍與建築 (完整 siege 結構)
    if (!DB.mobs['giran_gate']) {
      DB.mobs['giran_gate'] = {
        n: '奇岩城門', lv: 1, s: 'L', hp: 60000, curHp: 60000,
        ac: 10, mr: 0, dr: 6, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hp: 60000, ac: 10, mr: 0, dr: 6 },
        spr: '241', exp: 10000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['giran_tower']) {
      DB.mobs['giran_tower'] = {
        n: '奇岩守護塔', lv: 1, s: 'L', hp: 50000, curHp: 50000,
        ac: 10, mr: 0, dr: 10, atkSpd: 2, dmg: [0, 0], db: 0, hit: 0,
        beh: '被動', race: '建築', boss: true, siegeEnemy: true,
        siege: { fixed: true, hpPerLv: 500, hp: 50000, ac: 10, mr: 0, dr: 10 },
        spr: '240', exp: 50000, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['giran_guard']) {
      DB.mobs['giran_guard'] = {
        n: '奇岩守衛', lv: 55, s: 'S', hp: 3000, curHp: 3000,
        ac: -20, mr: 30, atkSpd: 1.0, dmg: [1, 12], db: 55, hit: 35,
        beh: '主動', race: '人形', siegeEnemy: true,
        siege: { hpC: 45, acBase: -20, mrBase: 30, dmgSides: 12, hitBase: 10 },
        spr: '1254', exp: 3500, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['giran_archer']) {
      DB.mobs['giran_archer'] = {
        n: '奇岩巡守', lv: 55, s: 'S', hp: 2400, curHp: 2400,
        ac: -15, mr: 35, atkSpd: 1.0, dmg: [1, 10], db: 55, hit: 40,
        beh: '主動', ranged: true, race: '人形', siegeEnemy: true,
        siege: { hpC: 35, acBase: -15, mrBase: 35, dmgSides: 10, hitBase: 15 },
        spr: '1256', exp: 3200, goldMin: 0, goldMax: 0
      };
    }
    if (!DB.mobs['giran_mage']) {
      DB.mobs['giran_mage'] = {
        n: '奇岩法師', lv: 55, s: 'S', hp: 2000, curHp: 2000,
        ac: -10, mr: 50, atkSpd: 1.2, dmg: [1, 15], db: 55, hit: 30,
        beh: '主動', magic: true, race: '人形', siegeEnemy: true,
        siege: { hpC: 30, acBase: -10, mrBase: 50, dmgSides: 15, hitBase: 10 },
        spr: '1278', exp: 3800, goldMin: 0, goldMax: 0
      };
    }

    // 2. 出怪池注入 (強制寫入)
    DB.maps['giran_outer'] = ['giran_guard', 'giran_archer', 'giran_mage', 'giran_gate'];
    DB.maps['giran_inner'] = ['giran_guard', 'giran_archer', 'giran_mage', 'giran_tower'];

    // 3. 奇岩城堡內殿城鎮資料
    if (!DB.towns['town_giran_castle']) {
      DB.towns['town_giran_castle'] = {
        id: 'town_giran_castle',
        n: '奇岩城',
        title: '奇岩城內殿',
        npcs: [
          { id: 'npc_reforge_master', n: '重鑄大師 · 朵林', title: '奇岩重鑄所', type: 'craft', spr: '1768' },
          { id: 'npc_randisi', n: '藍迪西', title: '雜貨商人', type: 'shop', spr: '1256' },
          { id: 'npc_baojin', n: '寶金', title: '倉庫', type: 'warehouse', spr: '1307' },
          { id: 'npc_giran_guard_captain', n: '奇岩守衛隊長', title: '城堡護衛', type: 'castleguard', spr: '3858' },
          { id: 'npc_hert', n: '赫特', title: '魔物追蹤', type: 'quest', spr: '1049' },
          { id: 'npc_esti', n: '依詩蒂', title: '血盟管理', type: 'pledge', spr: '3227' }
        ]
      };
    }

    // 4. 動畫別名支援
    if (typeof MOB_ANIM_NAMES !== 'undefined') {
      MOB_ANIM_NAMES.add('奇岩守衛');
      MOB_ANIM_NAMES.add('奇岩巡守');
      MOB_ANIM_NAMES.add('奇岩法師');
      MOB_ANIM_NAMES.add('奇岩城門');
      MOB_ANIM_NAMES.add('奇岩守護塔');
    }
    if (typeof MOB_ANIM_ALIAS !== 'undefined') {
      MOB_ANIM_ALIAS['奇岩守衛'] = '玩家男騎士';
      MOB_ANIM_ALIAS['奇岩巡守'] = '玩家男妖精';
      MOB_ANIM_ALIAS['奇岩法師'] = '玩家男法師';
      MOB_ANIM_ALIAS['奇岩城門'] = '肯特城門';
      MOB_ANIM_ALIAS['奇岩守護塔'] = '肯特守護塔';
    }
    if (typeof MOB_ANIM_BAKED_SHADOW !== 'undefined') {
      MOB_ANIM_BAKED_SHADOW.add('奇岩城門');
    }

    // 5. 背景備份
    if (typeof SPECIAL_AREA_BG !== 'undefined') {
      SPECIAL_AREA_BG['giran_outer'] = 'assets/area/1920x1080/肯特外門區.jpg';
      SPECIAL_AREA_BG['giran_inner'] = 'assets/area/1920x1080/肯特內城.jpg';
      SPECIAL_AREA_BG['town_giran_castle'] = 'assets/area/1920x1080/肯特內城.jpg';
    }
  }

  // 立即執行 (同步)，不等待 DOMContentLoaded
  ensureGiranData();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureGiranData);
  }
  window.ensureGiranData = ensureGiranData;
})();