import { Card, CardContent, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { crafts, items as allItemsData, slab } from '@website-data';
import { TOOLS } from 'utility/consts';
import { getBaseClass } from 'parsers/talents';
import { flattenCraftObject, getAllItems, findQuantityOwned } from 'parsers/items';
import { cleanUnderscore, numberWithCommas, prefix } from 'utility/helpers';
import SkillToolPage from './SkillToolPage';

const SKILL_CONFIG = [
  { key: 'mining', label: 'Mining', toolIndex: TOOLS.PICKAXE, type: 'PICKAXE', primaryBase: 'Warrior' },
  { key: 'chopping', label: 'Chopping', toolIndex: TOOLS.HATCHET, type: 'HATCHET', primaryBase: 'Mage' },
  { key: 'fishing', label: 'Fishing', toolIndex: TOOLS.ROD, type: 'FISHING_ROD', primaryBase: 'Archer' },
  { key: 'catching', label: 'Catching', toolIndex: TOOLS.NET, type: 'BUG_CATCHING_NET', primaryBase: 'Archer' },
  { key: 'trapping', label: 'Trapping', toolIndex: TOOLS.TRAP, type: 'TRAP_BOX_SET', primaryBase: 'Archer' },
  { key: 'worship', label: 'Worship', toolIndex: TOOLS.SKULL, type: 'WORSHIP_SKULL', primaryBase: 'Mage' }
];

const TAB_LABELS = ['Overview', 'Craftable Now', ...SKILL_CONFIG.map((s) => s.label)];

const getToolTierList = (type) => {
  return Object.entries(allItemsData)
    .filter(([, item]) => item.Type === type)
    .map(([rawName, item]) => ({ ...item, rawName }))
    .sort((a, b) => (a.lvReqToEquip || 0) - (b.lvReqToEquip || 0));
};

const getAnvilTab = (lvReqToEquip) => {
  if (lvReqToEquip <= 9) return 'Anvil Tab 1';
  if (lvReqToEquip <= 24) return 'Anvil Tab 2';
  if (lvReqToEquip <= 44) return 'Anvil Tab 3';
  if (lvReqToEquip <= 69) return 'Anvil Tab 4';
  if (lvReqToEquip <= 99) return 'Anvil Tab 5';
  if (lvReqToEquip <= 149) return 'Anvil Tab 6';
  return 'Anvil Tab 7';
};

const isSlab = (rawName) => slab?.includes(rawName);

const getDirectMaterials = (recipe) => {
  if (!recipe?.materials) return [];
  return recipe.materials.map((mat) => ({
    itemName: mat.itemName,
    rawName: mat.rawName,
    itemQuantity: mat.itemQuantity
  }));
};

const resolveSkillUpgrades = (characters, skillConfig, inventoryItems, globalUsed) => {
  const { toolIndex, type, primaryBase } = skillConfig;
  const tierList = getToolTierList(type);
  if (!tierList.length) return { rows: [], swaps: [], materials: [], craftOrder: [] };

  const used = globalUsed || {};

  const charRows = characters.map((char) => {
    const base = getBaseClass(char.class);
    const isPrimary = base === primaryBase || base === 'Beginner';
    return { char, isPrimary, priority: isPrimary ? 0 : 1 };
  }).sort((a, b) => a.priority - b.priority);

  const rows = [];
  const craftNeeded = {};

  charRows.forEach(({ char, isPrimary }) => {
    const equipped = char.tools?.[toolIndex];
    const equippedRaw = equipped?.rawName;
    const equippedTierIdx = tierList.findIndex((t) => t.rawName === equippedRaw);

    let bestTarget = null;
    let bestTargetIdx = -1;
    let status = 'up-to-date';
    let blockedInfo = null;

    for (let i = tierList.length - 1; i > equippedTierIdx; i--) {
      const candidate = tierList[i];
      const recipe = crafts?.[candidate.displayName];
      if (!recipe) continue;

      const flat = flattenCraftObject(recipe);
      const canCraft = flat?.every((mat) => {
        const owned = findQuantityOwned(inventoryItems, mat.itemName);
        const available = (owned?.amount || 0) - (used[mat.itemName] || 0);
        const equippedIsMat = equippedRaw === mat.rawName;
        return (available + (equippedIsMat ? 1 : 0)) >= mat.itemQuantity;
      });

      if (canCraft) {
        bestTarget = candidate;
        bestTargetIdx = i;
        break;
      }
    }

    if (!bestTarget && equippedTierIdx < tierList.length - 1) {
      const nextTier = tierList[equippedTierIdx + 1];
      const recipe = crafts?.[nextTier.displayName];
      const flat = recipe ? flattenCraftObject(recipe) : [];
      const missing = flat?.filter((mat) => {
        const owned = findQuantityOwned(inventoryItems, mat.itemName);
        const available = (owned?.amount || 0) - (used[mat.itemName] || 0);
        const equippedIsMat = equippedRaw === mat.rawName;
        return (available + (equippedIsMat ? 1 : 0)) < mat.itemQuantity;
      }).map((mat) => {
        const owned = findQuantityOwned(inventoryItems, mat.itemName);
        const available = (owned?.amount || 0) - (used[mat.itemName] || 0);
        return { name: cleanUnderscore(mat.itemName), need: mat.itemQuantity, have: Math.max(0, available) };
      }) || [];

      bestTarget = nextTier;
      bestTargetIdx = equippedTierIdx + 1;
      status = 'blocked';

      const nextAfter = equippedTierIdx + 2 < tierList.length ? tierList[equippedTierIdx + 2] : null;
      blockedInfo = {
        missing,
        nextTier: nextAfter ? {
          name: cleanUnderscore(nextAfter.displayName),
          lvReq: nextAfter.lvReqToEquip
        } : null
      };
    } else if (bestTarget) {
      status = bestTargetIdx > equippedTierIdx + 1 ? 'can-skip' : 'can-craft';
    } else {
      const topTier = tierList[tierList.length - 1];
      status = 'max';
      blockedInfo = { charLevel: char.level, topTierLvl: topTier?.lvReqToEquip };
    }

    if (bestTarget && (status === 'can-craft' || status === 'can-skip')) {
      const recipe = crafts?.[bestTarget.displayName];
      if (recipe) {
        const flat = flattenCraftObject(recipe);
        flat?.forEach((mat) => {
          used[mat.itemName] = (used[mat.itemName] || 0) + mat.itemQuantity;
        });
        if (!craftNeeded[bestTarget.displayName]) {
          craftNeeded[bestTarget.displayName] = {
            item: bestTarget,
            chars: [],
            materials: getDirectMaterials(crafts?.[bestTarget.displayName]),
            flatMaterials: flat
          };
        }
        if (!craftNeeded[bestTarget.displayName].chars.includes(char.name)) {
          craftNeeded[bestTarget.displayName].chars.push(char.name);
        }
      }
    }

    if (bestTarget && status === 'blocked') {
      const recipe = crafts?.[bestTarget.displayName];
      if (recipe) {
        const flat = flattenCraftObject(recipe);
        if (!craftNeeded[bestTarget.displayName]) {
          craftNeeded[bestTarget.displayName] = {
            item: bestTarget,
            chars: [],
            materials: getDirectMaterials(recipe),
            flatMaterials: flat
          };
        }
        if (!craftNeeded[bestTarget.displayName].chars.includes(char.name)) {
          craftNeeded[bestTarget.displayName].chars.push(char.name);
        }
      }
    }

    rows.push({
      name: char.name,
      className: char.class,
      level: char.level,
      isPrimary,
      equipped,
      equippedTierIdx,
      target: bestTarget,
      targetTierIdx: bestTargetIdx,
      status,
      blockedInfo
    });
  });

  const swaps = [];
  const offClassRows = rows.filter((r) => !r.isPrimary);
  const primaryRows = rows.filter((r) => r.isPrimary);
  offClassRows.forEach((offRow) => {
    primaryRows.forEach((primRow) => {
      if (offRow.equippedTierIdx > primRow.equippedTierIdx && primRow.status !== 'max') {
        swaps.push({
          from: offRow.name,
          to: primRow.name,
          tool: offRow.equipped
        });
      }
    });
  });

  const materials = {};
  Object.values(craftNeeded).forEach(({ flatMaterials }) => {
    flatMaterials?.forEach(({ itemName, rawName, itemQuantity }) => {
      if (!materials[itemName]) materials[itemName] = { rawName, need: 0 };
      materials[itemName].need += itemQuantity;
    });
  });

  const materialList = Object.entries(materials).map(([itemName, { rawName, need }]) => {
    const owned = findQuantityOwned(inventoryItems, itemName);
    return {
      itemName,
      rawName: rawName || itemName,
      need,
      have: owned?.amount || 0,
      short: Math.max(0, need - (owned?.amount || 0))
    };
  }).sort((a, b) => b.short - a.short);

  const craftOrder = Object.values(craftNeeded).map(({ item, chars, materials: mats }) => ({
    item,
    chars,
    qty: chars.length,
    anvilTab: getAnvilTab(item.lvReqToEquip || 0),
    isSlab: isSlab(item.rawName),
    materials: mats
  })).sort((a, b) => a.anvilTab.localeCompare(b.anvilTab));

  return { rows, swaps, materials: materialList, craftOrder };
};

const findToolsInStorage = (account, toolRawNames) => {
  const storageTools = {};
  account?.storage?.list?.forEach((item) => {
    if (toolRawNames.includes(item.rawName)) {
      if (!storageTools[item.rawName]) {
        storageTools[item.rawName] = { ...item, amount: 0 };
      }
      storageTools[item.rawName].amount += (item.amount || 1);
    }
  });
  return storageTools;
};

const ToolChecker = ({ characters = [], account }) => {
  const [tab, setTab] = useState(0);

  const inventoryItems = useMemo(() => getAllItems(characters, account), [characters, account]);

  const skillResults = useMemo(() => {
    const results = {};
    SKILL_CONFIG.forEach((config) => {
      results[config.key] = resolveSkillUpgrades(characters, config, inventoryItems, null);
    });
    return results;
  }, [characters, inventoryItems]);

  const overviewData = useMemo(() => {
    const globalUsed = {};
    const skillSummaries = [];
    SKILL_CONFIG.forEach((config) => {
      const result = resolveSkillUpgrades(characters, config, inventoryItems, globalUsed);
      const upgrades = result.rows.filter((r) => r.status !== 'max');
      const ready = result.rows.filter((r) => r.status === 'can-craft' || r.status === 'can-skip');
      const blocked = result.rows.filter((r) => r.status === 'blocked');
      skillSummaries.push({
        key: config.key,
        label: config.label,
        total: result.rows.length,
        upgrades: upgrades.length,
        ready: ready.length,
        blocked: blocked.length,
        maxed: result.rows.filter((r) => r.status === 'max').length
      });
    });
    const totalUpgrades = skillSummaries.reduce((s, r) => s + r.upgrades, 0);
    const totalReady = skillSummaries.reduce((s, r) => s + r.ready, 0);
    return { skillSummaries, totalUpgrades, totalReady };
  }, [characters, inventoryItems]);

  const craftableNowData = useMemo(() => {
    const charCrafts = {};

    const allToolRawNames = [];
    SKILL_CONFIG.forEach((config) => {
      const tierList = getToolTierList(config.type);
      tierList.forEach((t) => allToolRawNames.push(t.rawName));
    });
    const storageTools = findToolsInStorage(account, allToolRawNames);

    SKILL_CONFIG.forEach((config) => {
      const result = skillResults[config.key];
      if (!result) return;
      result.rows.forEach((row) => {
        if (row.status !== 'can-craft' && row.status !== 'can-skip') return;
        if (!row.target) return;

        if (!charCrafts[row.name]) {
          charCrafts[row.name] = { name: row.name, className: row.className, grabs: [], crafts: [] };
        }

        const storageTool = storageTools[row.target.rawName];
        if (storageTool && storageTool.amount > 0) {
          charCrafts[row.name].grabs.push({
            tool: row.target,
            skill: config.label
          });
          storageTool.amount -= 1;
        } else {
          const recipe = crafts?.[row.target.displayName];
          const flat = recipe ? flattenCraftObject(recipe) : [];
          const matStatus = flat?.map((mat) => {
            const owned = findQuantityOwned(inventoryItems, mat.itemName);
            return {
              itemName: mat.itemName,
              rawName: mat.rawName,
              need: mat.itemQuantity,
              have: owned?.amount || 0,
              ok: (owned?.amount || 0) >= mat.itemQuantity
            };
          }) || [];

          charCrafts[row.name].crafts.push({
            tool: row.target,
            skill: config.label,
            anvilTab: getAnvilTab(row.target.lvReqToEquip || 0),
            isSlab: isSlab(row.target.rawName),
            materials: getDirectMaterials(recipe),
            matStatus
          });
        }
      });
    });

    return Object.values(charCrafts).filter((c) => c.grabs.length > 0 || c.crafts.length > 0);
  }, [skillResults, inventoryItems, account]);

  if (!characters?.length) {
    return <Typography>No character data available. Log in to see tool information.</Typography>;
  }

  return (
    <Stack gap={3}>
      <Typography variant="h5">Tool Checker</Typography>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        {TAB_LABELS.map((label) => <Tab key={label} label={label} />)}
      </Tabs>

      {tab === 0 && <OverviewTab data={overviewData} />}
      {tab === 1 && <CraftableNowTab data={craftableNowData} />}
      {tab >= 2 && (
        <SkillToolPage
          config={SKILL_CONFIG[tab - 2]}
          result={skillResults[SKILL_CONFIG[tab - 2].key]}
        />
      )}
    </Stack>
  );
};

const OverviewTab = ({ data }) => {
  const { skillSummaries, totalUpgrades, totalReady } = data;
  return (
    <Stack gap={2}>
      <Stack direction="row" gap={2} alignItems="center">
        <Typography variant="body1">
          {totalUpgrades} upgrade{totalUpgrades !== 1 ? 's' : ''} needed across all skills
        </Typography>
        {totalReady > 0 && (
          <Chip size="small" label={`${totalReady} craftable now`} color="info" />
        )}
      </Stack>
      <Stack gap={1}>
        {skillSummaries.map((s) => (
          <Stack key={s.key} direction="row" gap={2} alignItems="center" sx={{ py: 0.5 }}>
            <Typography variant="body2" sx={{ minWidth: 100, fontWeight: 'bold' }}>{s.label}</Typography>
            {s.upgrades > 0 ? (
              <Chip
                size="small"
                label={`${s.upgrades} upgrade${s.upgrades !== 1 ? 's' : ''} needed`}
                color="warning"
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
            ) : (
              <Chip
                size="small"
                label="All maxed"
                color="success"
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
            )}
            {s.ready > 0 && (
              <Chip
                size="small"
                label={`${s.ready} craftable`}
                color="info"
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
            )}
            {s.blocked > 0 && (
              <Chip
                size="small"
                label={`${s.blocked} blocked`}
                color="error"
                sx={{ height: 22, fontSize: '0.75rem' }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {s.maxed}/{s.total} at max tier
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

const CraftableNowTab = ({ data }) => {
  if (!data.length) {
    return (
      <Typography color="text.secondary">
        No tools can be crafted or grabbed from storage right now.
      </Typography>
    );
  }

  return (
    <Stack gap={3}>
      {data.map((charData) => (
        <Card key={charData.name} variant="outlined">
          <CardContent>
            <Stack gap={2}>
              <Stack direction="row" gap={1} alignItems="center">
                <Typography variant="h6">{charData.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {cleanUnderscore(charData.className)}
                </Typography>
              </Stack>

              {charData.grabs.length > 0 && (
                <Stack gap={1}>
                  <Typography variant="subtitle2" color="success.main">Grab from Storage</Typography>
                  {charData.grabs.map((grab, i) => (
                    <Stack key={i} direction="row" alignItems="center" gap={1}>
                      <img
                        src={`${prefix}data/${grab.tool.rawName}.png`}
                        alt=""
                        style={{ width: 28, height: 28, objectFit: 'contain' }}
                      />
                      <Typography variant="body2">
                        {cleanUnderscore(grab.tool.displayName)}
                      </Typography>
                      <Chip size="small" label={grab.skill} sx={{ height: 20, fontSize: '0.65rem' }} />
                    </Stack>
                  ))}
                </Stack>
              )}

              {charData.crafts.map((craft, i) => (
                <Stack key={i} gap={1} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <img
                      src={`${prefix}data/${craft.tool.rawName}.png`}
                      alt=""
                      style={{ width: 28, height: 28, objectFit: 'contain' }}
                    />
                    <Typography variant="subtitle2">
                      {cleanUnderscore(craft.tool.displayName)}
                    </Typography>
                    <Chip size="small" label={craft.skill} sx={{ height: 20, fontSize: '0.65rem' }} />
                    <Chip size="small" label={craft.anvilTab} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    {craft.isSlab && (
                      <Chip size="small" label="SLAB" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#d29922', color: '#000', fontWeight: 'bold' }} />
                    )}
                  </Stack>

                  <Typography variant="caption" color="text.secondary">Materials to Pull</Typography>
                  <Stack gap={0.25} sx={{ pl: 1 }}>
                    {craft.matStatus.map((mat) => (
                      <Stack key={mat.itemName} direction="row" alignItems="center" gap={1}>
                        <img
                          src={`${prefix}data/${mat.rawName}.png`}
                          alt=""
                          style={{ width: 20, height: 20, objectFit: 'contain' }}
                        />
                        <Typography variant="caption" sx={{ minWidth: 160 }}>
                          {cleanUnderscore(mat.itemName)}
                        </Typography>
                        <Typography variant="caption">x{numberWithCommas(mat.need)}</Typography>
                        <Chip
                          size="small"
                          label={mat.ok ? 'OK' : `Short ${numberWithCommas(mat.need - mat.have)}`}
                          color={mat.ok ? 'success' : 'error'}
                          sx={{ height: 18, fontSize: '0.6rem' }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default ToolChecker;
