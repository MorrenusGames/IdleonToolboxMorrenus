import { Stack, Tab, Tabs, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { items as allItemsData, crafts } from '@website-data';
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

const getToolTierList = (type) => {
  return Object.entries(allItemsData)
    .filter(([, item]) => item.Type === type)
    .map(([rawName, item]) => ({ ...item, rawName }))
    .sort((a, b) => (a.lvReqToEquip || 0) - (b.lvReqToEquip || 0));
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
      bestTarget = tierList[equippedTierIdx + 1];
      bestTargetIdx = equippedTierIdx + 1;
      status = 'missing-mats';
    } else if (bestTarget) {
      status = bestTargetIdx > equippedTierIdx + 1 ? 'can-skip' : 'can-craft';
    } else {
      status = 'up-to-date';
    }

    if (bestTarget && (status === 'can-craft' || status === 'can-skip')) {
      const recipe = crafts?.[bestTarget.displayName];
      if (recipe) {
        const flat = flattenCraftObject(recipe);
        flat?.forEach((mat) => {
          used[mat.itemName] = (used[mat.itemName] || 0) + mat.itemQuantity;
          if (!craftNeeded[bestTarget.displayName]) {
            craftNeeded[bestTarget.displayName] = { item: bestTarget, chars: [], materials: flat };
          }
          if (!craftNeeded[bestTarget.displayName].chars.includes(char.name)) {
            craftNeeded[bestTarget.displayName].chars.push(char.name);
          }
        });
      }
    }

    if (bestTarget && status === 'missing-mats') {
      const recipe = crafts?.[bestTarget.displayName];
      if (recipe) {
        const flat = flattenCraftObject(recipe);
        if (!craftNeeded[bestTarget.displayName]) {
          craftNeeded[bestTarget.displayName] = { item: bestTarget, chars: [], materials: flat };
        }
        if (!craftNeeded[bestTarget.displayName].chars.includes(char.name)) {
          craftNeeded[bestTarget.displayName].chars.push(char.name);
        }
      }
    }

    rows.push({
      name: char.name,
      className: char.class,
      isPrimary,
      equipped,
      equippedTierIdx,
      target: bestTarget,
      targetTierIdx: bestTargetIdx,
      status
    });
  });

  const swaps = [];
  const offClassRows = rows.filter((r) => !r.isPrimary);
  const primaryRows = rows.filter((r) => r.isPrimary);
  offClassRows.forEach((offRow) => {
    primaryRows.forEach((primRow) => {
      if (offRow.equippedTierIdx > primRow.equippedTierIdx && primRow.status !== 'up-to-date') {
        swaps.push({
          from: offRow.name,
          to: primRow.name,
          tool: offRow.equipped
        });
      }
    });
  });

  const materials = {};
  Object.values(craftNeeded).forEach(({ materials: mats }) => {
    mats?.forEach(({ itemName, rawName, itemQuantity }) => {
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

  const craftOrder = Object.values(craftNeeded).map(({ item, chars }) => ({
    item,
    chars,
    qty: chars.length
  }));

  return { rows, swaps, materials: materialList, craftOrder };
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

  const overviewResult = useMemo(() => {
    const globalUsed = {};
    const allRows = [];
    SKILL_CONFIG.forEach((config) => {
      const result = resolveSkillUpgrades(characters, config, inventoryItems, globalUsed);
      result.rows.forEach((row) => allRows.push({ ...row, skill: config.label }));
    });
    return allRows;
  }, [characters, inventoryItems]);

  if (!characters?.length) {
    return <Typography>No character data available. Log in to see tool information.</Typography>;
  }

  return (
    <Stack gap={3}>
      <Typography variant="h5">Tool Checker</Typography>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab label="Overview" />
        {SKILL_CONFIG.map((s) => <Tab key={s.key} label={s.label} />)}
      </Tabs>

      {tab === 0 && (
        <OverviewTab rows={overviewResult} />
      )}

      {tab > 0 && (
        <SkillToolPage
          config={SKILL_CONFIG[tab - 1]}
          result={skillResults[SKILL_CONFIG[tab - 1].key]}
        />
      )}
    </Stack>
  );
};

const OverviewTab = ({ rows }) => {
  const needsUpgrade = rows.filter((r) => r.status !== 'up-to-date');
  return (
    <Stack gap={2}>
      <Typography variant="body1">
        {needsUpgrade.length} upgrades needed across all skills
      </Typography>
      <Stack gap={1}>
        {SKILL_CONFIG.map((config) => {
          const skillRows = rows.filter((r) => r.skill === config.label);
          const upgrades = skillRows.filter((r) => r.status !== 'up-to-date');
          const ready = skillRows.filter((r) => r.status === 'can-craft' || r.status === 'can-skip');
          return (
            <Stack key={config.key} direction="row" gap={2} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 100 }}>{config.label}</Typography>
              <Typography variant="caption" color={upgrades.length ? 'warning.main' : 'success.main'}>
                {upgrades.length} upgrades needed
              </Typography>
              {ready.length > 0 && (
                <Typography variant="caption" color="info.main">
                  ({ready.length} craftable now)
                </Typography>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ToolChecker;
