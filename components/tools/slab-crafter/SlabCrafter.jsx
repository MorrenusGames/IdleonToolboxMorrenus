import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  Divider,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { cleanUnderscore, numberWithCommas, prefix } from 'utility/helpers';
import { crafts } from '@website-data';
import { flattenCraftObject, getAllItems, findQuantityOwned } from 'parsers/items';
import { useLocalStorage } from '@mantine/hooks';

const MAX_SLOTS = 83;

const SlabCrafter = ({ account, characters = [] }) => {
  const [ignoreList, setIgnoreList] = useLocalStorage({
    key: 'slab-crafter:ignoreList',
    defaultValue: []
  });
  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentBatch, setCurrentBatch] = useState(0);

  const allItems = useMemo(() => getAllItems(characters, account), [characters, account]);

  const getDirectMats = useCallback((recipe) => {
    if (!recipe?.materials) return [];
    return recipe.materials.map((mat) => {
      const owned = findQuantityOwned(allItems, mat.itemName);
      return {
        name: mat.itemName,
        rawName: mat.rawName,
        qty: mat.itemQuantity,
        have: owned?.amount || 0,
        materials: mat.materials
      };
    });
  }, [allItems]);

  const getCraftOrder = useCallback((recipe, itemName) => {
    if (!recipe?.materials) return [];
    const order = [];
    const seen = new Set();

    const walk = (mats) => {
      if (!mats) return;
      for (const mat of mats) {
        if (mat.materials && mat.materials.length > 0) {
          walk(mat.materials);
          if (!seen.has(mat.itemName)) {
            seen.add(mat.itemName);
            order.push(mat.itemName);
          }
        }
      }
    };

    walk(recipe.materials);
    if (!seen.has(itemName)) {
      order.push(itemName);
    }
    return order;
  }, []);

  const getRawMaterials = useCallback((recipe) => {
    const flat = flattenCraftObject(recipe);
    if (!flat) return [];
    const rawOnly = flat.filter((mat) => {
      const subRecipe = crafts[mat.itemName];
      return !subRecipe;
    });
    const merged = {};
    for (const mat of rawOnly) {
      if (!merged[mat.itemName]) {
        const owned = findQuantityOwned(allItems, mat.itemName);
        merged[mat.itemName] = {
          name: mat.itemName,
          rawName: mat.rawName,
          need: 0,
          have: owned?.amount || 0
        };
      }
      merged[mat.itemName].need += mat.itemQuantity;
    }
    return Object.values(merged);
  }, [allItems]);

  const getTab = useCallback((recipe) => {
    if (!recipe) return 'Unknown';
    const raw = recipe.rawName || '';
    if (raw.match(/^EquipmentHats/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentShirts/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentPants/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentShoes/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentPunching/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentSword/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentBows/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentWands/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentTools/)) return 'Anvil Tab 1';
    if (raw.match(/^EquipmentRings/)) return 'Anvil Tab 2';
    if (raw.match(/^EquipmentPendant/)) return 'Anvil Tab 2';
    if (raw.match(/^EquipmentSmithingTabs/)) return 'Anvil Tab 2';
    if (raw.match(/^FishingRod/)) return 'Anvil Tab 2';
    if (raw.match(/^CatchingNet/)) return 'Anvil Tab 2';
    if (raw.match(/^TrapBoxSet/)) return 'Anvil Tab 2';
    if (raw.match(/^WorshipSkull/)) return 'Anvil Tab 2';
    if (raw.match(/^DNAgun/)) return 'Anvil Tab 3';
    if (raw.match(/^EquipmentNametag/)) return 'Anvil Tab 3';
    const subType = recipe.subType || '';
    if (subType.includes('HEALTH_FOOD') || subType.includes('BOOST_FOOD') || subType.includes('GOLDEN_FOOD')) return 'Anvil Tab 1';
    return 'Anvil Tab 1';
  }, []);

  const allCraftableItems = useMemo(() => {
    const slabItems = account?.looty?.slabItems;
    if (!slabItems) return [];
    return slabItems
      .filter((item) => !item.obtained && !item.unobtainable && crafts?.[item.name])
      .map((item) => {
        const recipe = crafts[item.name];
        const directMats = getDirectMats(recipe);
        const craftOrder = getCraftOrder(recipe, item.name);
        const rawMaterials = getRawMaterials(recipe);
        const canCraftDirect = directMats.every((m) => m.have >= m.qty && (!m.materials || m.materials.length === 0));
        const flat = flattenCraftObject(recipe);
        const allMatsAvailable = flat?.every((mat) => {
          const owned = findQuantityOwned(allItems, mat.itemName);
          return (owned?.amount || 0) >= mat.itemQuantity;
        });
        const canCraftWithChain = allMatsAvailable && !canCraftDirect;
        const tab = getTab(recipe);
        return {
          ...item,
          recipe,
          directMats,
          craftOrder: craftOrder.length > 1 ? craftOrder : [],
          rawMaterials,
          canCraftDirect,
          canCraftWithChain,
          tab
        };
      });
  }, [account, allItems, getDirectMats, getCraftOrder, getRawMaterials, getTab]);

  const activeItems = useMemo(
    () => allCraftableItems.filter((i) => !ignoreList.includes(i.rawName)),
    [allCraftableItems, ignoreList]
  );

  const directCount = useMemo(() => activeItems.filter((i) => i.canCraftDirect).length, [activeItems]);
  const chainCount = useMemo(
    () => activeItems.filter((i) => i.canCraftWithChain && !i.canCraftDirect).length,
    [activeItems]
  );

  const filteredItems = useMemo(() => {
    const source = filter === 'ignored' ? allCraftableItems : activeItems;
    return source.filter((item) => {
      const isIgnored = ignoreList.includes(item.rawName);
      if (filter === 'ignored' && !isIgnored) return false;
      if (filter !== 'ignored' && isIgnored) return false;
      if (filter === 'direct' && !item.canCraftDirect) return false;
      if (filter === 'chain' && item.canCraftDirect) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!item.name?.toLowerCase().includes(s) && !item.rawName?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [allCraftableItems, activeItems, ignoreList, filter, search]);

  const groupedByTab = useMemo(() => {
    const tabs = {};
    for (const item of filteredItems) {
      const t = item.tab || 'Unknown';
      if (!tabs[t]) tabs[t] = [];
      tabs[t].push(item);
    }
    for (const t of Object.keys(tabs)) {
      tabs[t].sort((a, b) => a.name.localeCompare(b.name));
    }
    return tabs;
  }, [filteredItems]);

  const planBatches = useCallback((items, maxSlots) => {
    let remaining = [...items];
    const batches = [];

    while (remaining.length > 0) {
      const batch = [];
      const batchRaw = {};
      const batchCrafted = new Set();

      const scored = remaining.map((item) => {
        const overlap = item.rawMaterials.filter((m) => m.name in batchRaw).length;
        return { overlap, item };
      });
      scored.sort((a, b) => b.overlap - a.overlap);

      for (const { item } of scored) {
        const testRaw = { ...batchRaw };
        for (const m of item.rawMaterials) {
          testRaw[m.name] = (testRaw[m.name] || 0) + m.need;
        }

        const order = item.craftOrder || [];
        let newCrafts;
        if (order.length > 0) {
          newCrafts = order.filter((s) => !batchCrafted.has(s));
        } else {
          newCrafts = batchCrafted.has(item.name) ? [] : [item.name];
        }

        const uniqueMats = Object.keys(testRaw).length;
        const totalCrafts = batchCrafted.size + newCrafts.length + batch.length;
        if (uniqueMats + totalCrafts > maxSlots) continue;

        batch.push(item);
        for (const m of item.rawMaterials) {
          batchRaw[m.name] = (batchRaw[m.name] || 0) + m.need;
        }
        if (order.length > 0) {
          for (const s of order) batchCrafted.add(s);
        } else {
          batchCrafted.add(item.name);
        }
      }

      if (batch.length === 0) break;

      const batchSet = new Set(batch.map((b) => b.rawName));
      remaining = remaining.filter((r) => !batchSet.has(r.rawName));
      batches.push(buildBatch(batches.length + 1, batch));
    }

    return batches;
  }, []);

  const buildBatch = useCallback((batchNum, batchItems) => {
    const stepOrder = [];
    const stepSeen = new Set();

    const chain = batchItems.filter((i) => !i.canCraftDirect && i.craftOrder?.length > 0);
    const direct = batchItems.filter((i) => i.canCraftDirect || !i.craftOrder?.length);

    for (const item of chain) {
      for (const stepName of item.craftOrder) {
        if (!stepSeen.has(stepName)) {
          stepSeen.add(stepName);
          const isSlab = stepName === item.name;
          stepOrder.push({
            name: stepName,
            isSlab,
            tab: item.tab,
            parentItem: item.name
          });
        }
      }
    }

    for (const item of direct) {
      if (!stepSeen.has(item.name)) {
        stepSeen.add(item.name);
        stepOrder.push({
          name: item.name,
          isSlab: true,
          tab: item.tab,
          parentItem: null
        });
      }
    }

    const crafted = new Set(stepSeen);

    const stepParents = {};
    for (const s of stepOrder) {
      if (!stepParents[s.name]) stepParents[s.name] = [];
    }
    for (const s of stepOrder) {
      const recipe = crafts[s.name];
      const mats = recipe?.materials || [];
      for (const mat of mats) {
        if (crafted.has(mat.itemName)) {
          if (!stepParents[mat.itemName]) stepParents[mat.itemName] = [];
          if (!stepParents[mat.itemName].includes(s.name)) {
            stepParents[mat.itemName].push(s.name);
          }
        }
      }
    }

    const stepQty = {};
    for (const s of [...stepOrder].reverse()) {
      if (s.isSlab) {
        stepQty[s.name] = 1;
      } else {
        let need = 0;
        for (const p of (stepParents[s.name] || [])) {
          const recipe = crafts[p];
          const mats = recipe?.materials || [];
          for (const mat of mats) {
            if (mat.itemName === s.name) {
              need += mat.itemQuantity * (stepQty[p] || 1);
            }
          }
        }
        stepQty[s.name] = Math.max(need, 1);
      }
    }

    const steps = stepOrder.map((s, idx) => ({
      step: idx + 1,
      ...s,
      qty: stepQty[s.name] || 1,
      parent: s.isSlab ? null : (s.parentItem || (stepParents[s.name]?.join(', ') || null))
    }));

    const haveLookup = {};
    for (const item of batchItems) {
      for (const m of (item.rawMaterials || [])) {
        haveLookup[m.name] = m.have;
      }
    }

    const rawMerged = {};
    for (const s of steps) {
      const recipe = crafts[s.name];
      const mats = recipe?.materials || [];
      for (const mat of mats) {
        if (crafted.has(mat.itemName)) continue;
        const need = mat.itemQuantity * s.qty;
        if (!rawMerged[mat.itemName]) {
          rawMerged[mat.itemName] = { need: 0, have: haveLookup[mat.itemName] || 0, rawName: mat.rawName };
        }
        rawMerged[mat.itemName].need += need;
      }
    }

    const rawMaterials = Object.entries(rawMerged).map(([name, v]) => ({
      name,
      rawName: v.rawName,
      need: v.need,
      have: v.have
    }));

    const peakSlots = Object.keys(rawMerged).length + steps.length;

    return {
      batchNum,
      slabItems: batchItems.map((i) => ({ name: i.name, rawName: i.rawName, tab: i.tab })),
      craftSteps: steps,
      rawMaterials,
      peakSlots
    };
  }, []);

  const batches = useMemo(
    () => planBatches(activeItems, MAX_SLOTS),
    [activeItems, planBatches]
  );

  const safeBatchIndex = Math.min(currentBatch, Math.max(0, batches.length - 1));
  const batch = batches[safeBatchIndex] || null;

  const toggleIgnore = useCallback((rawName) => {
    setIgnoreList((prev) =>
      prev.includes(rawName) ? prev.filter((n) => n !== rawName) : [...prev, rawName]
    );
  }, [setIgnoreList]);

  const toggleSelect = useCallback((rawName) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(rawName)) next.delete(rawName);
      else next.add(rawName);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map((i) => i.rawName)));
  }, [filteredItems]);

  const selectNone = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const bulkIgnore = useCallback(() => {
    if (selectedItems.size === 0) return;
    setIgnoreList((prev) => [...new Set([...prev, ...selectedItems])]);
    setSelectedItems(new Set());
  }, [selectedItems, setIgnoreList]);

  const bulkUnignore = useCallback(() => {
    if (selectedItems.size === 0) return;
    setIgnoreList((prev) => prev.filter((n) => !selectedItems.has(n)));
    setSelectedItems(new Set());
  }, [selectedItems, setIgnoreList]);

  const allRawMaterials = useMemo(() => {
    const merged = {};
    for (const item of filteredItems) {
      if (ignoreList.includes(item.rawName)) continue;
      for (const m of item.rawMaterials) {
        if (!merged[m.name]) {
          merged[m.name] = { name: m.name, rawName: m.rawName, need: 0, have: m.have };
        }
        merged[m.name].need += m.need;
      }
    }
    return Object.values(merged).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredItems, ignoreList]);

  const craftOrderSteps = useMemo(() => {
    const crafted = new Set();
    const steps = [];

    const chainItems = filteredItems.filter((i) => !i.canCraftDirect && i.craftOrder?.length > 0);
    const directItems = filteredItems.filter((i) => i.canCraftDirect);

    for (const item of chainItems) {
      for (const stepName of item.craftOrder) {
        if (!crafted.has(stepName)) {
          crafted.add(stepName);
          const isSlab = stepName === item.name;
          const recipe = crafts[stepName];
          steps.push({
            name: stepName,
            isSlab,
            tab: item.tab,
            parent: isSlab ? null : item.name
          });
        }
      }
    }

    for (const item of directItems) {
      if (!crafted.has(item.name)) {
        crafted.add(item.name);
        steps.push({
          name: item.name,
          isSlab: true,
          tab: item.tab,
          parent: null
        });
      }
    }

    return steps;
  }, [filteredItems]);

  if (!account?.looty) {
    return <Typography>No slab data available. Log in to see slab information.</Typography>;
  }

  const renderItemIcon = (rawName, size = 28) => (
    <img
      src={`${prefix}data/${rawName}.png`}
      alt=""
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );

  const colorForHave = (have, need) => (have >= need ? 'success.main' : 'error');

  const renderStats = () => (
    <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
      {[
        { label: 'Direct', value: directCount, color: 'success.main' },
        { label: 'Chain', value: chainCount, color: 'warning.main' },
        { label: 'Total', value: activeItems.length, color: 'info.main' },
        { label: 'Ignored', value: ignoreList.length, color: 'text.secondary' }
      ].map(({ label, value, color }) => (
        <Box
          key={label}
          sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 2, py: 0.5, textAlign: 'center' }}
        >
          <Typography variant="h6" color={color} fontWeight="bold">{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      ))}
    </Stack>
  );

  const renderFilterButtons = () => (
    <ButtonGroup size="small" variant="outlined">
      {[
        { val: 'all', label: 'All' },
        { val: 'direct', label: 'Direct' },
        { val: 'chain', label: 'Chain' },
        { val: 'ignored', label: 'Ignored' }
      ].map(({ val, label }) => (
        <Button
          key={val}
          variant={filter === val ? 'contained' : 'outlined'}
          onClick={() => setFilter(val)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );

  const renderItemsTab = () => (
    <Stack direction="row" gap={2} sx={{ height: '100%', minHeight: 500 }}>
      <Stack sx={{ flex: '0 0 420px', minWidth: 300, overflow: 'hidden' }} gap={1}>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Button size="small" variant="outlined" onClick={selectAll}>Select All</Button>
          <Button size="small" variant="outlined" onClick={selectNone}>Select None</Button>
          <Divider orientation="vertical" flexItem />
          <Button size="small" variant="outlined" color="error" onClick={bulkIgnore}>
            Ignore Selected
          </Button>
          <Button size="small" variant="outlined" color="success" onClick={bulkUnignore}>
            Unignore Selected
          </Button>
          <Typography variant="caption" color="text.secondary">
            {selectedItems.size} selected
          </Typography>
        </Stack>

        <Box sx={{ overflow: 'auto', flex: 1 }}>
          {Object.keys(groupedByTab).sort().map((tabName) => (
            <Box key={tabName}>
              <Typography
                variant="subtitle2"
                sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, mt: 1, fontWeight: 'bold' }}
                color="info.main"
              >
                {tabName} ({groupedByTab[tabName].length})
              </Typography>
              {groupedByTab[tabName].map((item) => {
                const isIgnored = ignoreList.includes(item.rawName);
                const isSelected = selectedItems.has(item.rawName);
                const isActive = selectedItem?.rawName === item.rawName;
                return (
                  <Stack
                    key={item.rawName}
                    direction="row"
                    alignItems="center"
                    sx={{
                      cursor: 'pointer',
                      px: 1,
                      py: 0.25,
                      bgcolor: isActive ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => setSelectedItem(item)}
                  >
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(item.rawName); }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ p: 0.25 }}
                    />
                    {renderItemIcon(item.rawName, 24)}
                    <Typography
                      variant="body2"
                      sx={{
                        ml: 0.5,
                        textDecoration: isIgnored ? 'line-through' : 'none',
                        color: isIgnored
                          ? 'text.disabled'
                          : item.canCraftDirect
                            ? 'success.main'
                            : 'warning.main'
                      }}
                    >
                      {cleanUnderscore(item.name)}
                    </Typography>
                  </Stack>
                );
              })}
            </Box>
          ))}
          {filteredItems.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No craftable slab items match.
            </Typography>
          )}
        </Box>
      </Stack>

      <Divider orientation="vertical" flexItem />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {selectedItem ? renderDetailPanel(selectedItem) : (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Click an item on the left to view details.
          </Typography>
        )}
      </Box>
    </Stack>
  );

  const renderDetailPanel = (item) => {
    const isIgnored = ignoreList.includes(item.rawName);
    return (
      <Stack gap={2} sx={{ p: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          {renderItemIcon(item.rawName, 36)}
          <Typography variant="h6">{cleanUnderscore(item.name)}</Typography>
          <Chip
            label={item.canCraftDirect ? 'DIRECT' : 'CHAIN'}
            size="small"
            color={item.canCraftDirect ? 'success' : 'warning'}
          />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Tab: {item.tab}
        </Typography>

        <Button
          variant="outlined"
          size="small"
          color={isIgnored ? 'success' : 'error'}
          onClick={() => toggleIgnore(item.rawName)}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isIgnored ? 'Unignore' : 'Ignore'}
        </Button>

        <Typography variant="subtitle1" fontWeight="bold" color="info.main">
          Direct Materials
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Material</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Have</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {item.directMats.map((m, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      {renderItemIcon(m.rawName, 22)}
                      <Typography variant="body2">{cleanUnderscore(m.name)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{numberWithCommas(m.qty)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={colorForHave(m.have, m.qty)}>
                      {numberWithCommas(m.have)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {item.craftOrder.length > 0 && (
          <>
            <Typography variant="subtitle1" fontWeight="bold" color="info.main">
              Craft Order
            </Typography>
            <Stack gap={0.25}>
              {item.craftOrder.map((step, idx) => (
                <Typography
                  key={idx}
                  variant="body2"
                  color={step === item.name ? 'success.main' : 'warning.main'}
                >
                  {idx + 1}. {cleanUnderscore(step)}
                </Typography>
              ))}
            </Stack>
          </>
        )}

        <Typography variant="subtitle1" fontWeight="bold" color="info.main">
          Raw Materials (fully broken down)
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Material</TableCell>
                <TableCell align="right">Need</TableCell>
                <TableCell align="right">Have</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {item.rawMaterials.map((m, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      {renderItemIcon(m.rawName, 22)}
                      <Typography variant="body2">{cleanUnderscore(m.name)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{numberWithCommas(m.need)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={colorForHave(m.have, m.need)}>
                      {numberWithCommas(m.have)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    );
  };

  const renderCraftOrderTab = () => {
    const tabs = {};
    for (const s of craftOrderSteps) {
      const t = s.tab || 'Unknown';
      if (!tabs[t]) tabs[t] = [];
      tabs[t].push(s);
    }

    let stepNum = 0;
    return (
      <Stack gap={2}>
        <Typography variant="h6" color="text.secondary">
          Craft Order ({filteredItems.length} slab items, {craftOrderSteps.length} total crafts)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Craft these in order. Sub-components are listed before the slab item that needs them.
        </Typography>
        {Object.keys(tabs).sort().map((tabName) => {
          const tabSteps = tabs[tabName];
          const slabCount = tabSteps.filter((s) => s.isSlab).length;
          return (
            <Box key={tabName}>
              <Typography
                variant="subtitle2"
                sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, fontWeight: 'bold' }}
                color="info.main"
              >
                {tabName} ({tabSteps.length} crafts, {slabCount} slab)
              </Typography>
              <Stack gap={0.25} sx={{ py: 0.5 }}>
                {tabSteps.map((s) => {
                  stepNum += 1;
                  return (
                    <Stack key={stepNum} direction="row" alignItems="center" gap={1} sx={{ px: 1 }}>
                      <Typography variant="body2" color="warning.main" fontWeight="bold" sx={{ minWidth: 40 }}>
                        #{stepNum}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={s.isSlab ? 'bold' : 'normal'}
                        color={s.isSlab ? 'warning.main' : 'text.primary'}
                      >
                        {cleanUnderscore(s.name)}
                      </Typography>
                      <Chip
                        label={s.isSlab ? 'SLAB' : 'SUB'}
                        size="small"
                        sx={{
                          bgcolor: s.isSlab ? 'warning.main' : '#f78166',
                          color: '#000',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                      {s.parent && (
                        <Typography variant="caption" color="text.secondary">
                          for {cleanUnderscore(s.parent)}
                        </Typography>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
        {craftOrderSteps.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No craftable slab items.
          </Typography>
        )}
      </Stack>
    );
  };

  const renderAllRawTab = () => {
    const haveAll = allRawMaterials.filter((m) => m.have >= m.need).length;
    const missing = allRawMaterials.length - haveAll;
    return (
      <Stack gap={2}>
        <Typography variant="h6" color="info.main">
          Raw Materials ({filteredItems.length} items)
        </Typography>
        <Typography variant="body2" color="info.main">
          Unique materials: {allRawMaterials.length}
        </Typography>
        {missing === 0 ? (
          <Typography variant="body2" color="success.main">You have everything!</Typography>
        ) : (
          <Typography variant="body2" color="error">Missing {missing} materials</Typography>
        )}
        {allRawMaterials.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Need</TableCell>
                  <TableCell align="right">Have</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allRawMaterials.map((m, idx) => (
                  <TableRow key={m.name} sx={idx % 2 === 1 ? { bgcolor: 'action.hover' } : {}}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        {renderItemIcon(m.rawName, 22)}
                        <Typography variant="body2">{cleanUnderscore(m.name)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{numberWithCommas(m.need)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={colorForHave(m.have, m.need)}>
                        {numberWithCommas(m.have)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    );
  };

  const renderBatchOrderTab = () => {
    if (!batch) {
      return <Typography variant="body2" color="text.secondary">No batches available.</Typography>;
    }

    const steps = batch.craftSteps;
    const slabCount = batch.slabItems.length;
    const peak = batch.peakSlots;
    const ok = peak <= MAX_SLOTS;

    const tabs = {};
    for (const s of steps) {
      const t = s.tab || 'Unknown';
      if (!tabs[t]) tabs[t] = [];
      tabs[t].push(s);
    }

    return (
      <Stack gap={2}>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          <Typography variant="body2" color="text.secondary">Batch:</Typography>
          {batches.map((b, idx) => (
            <Button
              key={idx}
              size="small"
              variant={idx === safeBatchIndex ? 'contained' : 'outlined'}
              onClick={() => setCurrentBatch(idx)}
            >
              Craft {b.batchNum}
            </Button>
          ))}
        </Stack>

        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
          {[
            { label: 'Slab Items', value: slabCount },
            { label: 'Crafts', value: steps.length },
            { label: 'Mats', value: batch.rawMaterials.length },
            { label: 'Peak Slots', value: `${peak}/${MAX_SLOTS}` }
          ].map(({ label, value }) => (
            <Box
              key={label}
              sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 0.25, textAlign: 'center' }}
            >
              <Typography variant="body2" fontWeight="bold">{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          ))}
          <Chip
            label={ok ? 'FITS' : `OVER BY ${peak - MAX_SLOTS}`}
            size="small"
            color={ok ? 'success' : 'error'}
          />
        </Stack>

        <Typography variant="h6" color="info.main">
          Batch {batch.batchNum} - Craft Order ({slabCount} slab items, {steps.length} crafts)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pull materials, craft in order, deposit crafted items.
        </Typography>

        {Object.keys(tabs).sort().map((tabName) => {
          const tabSteps = tabs[tabName];
          const slabInTab = tabSteps.filter((s) => s.isSlab).length;
          return (
            <Box key={tabName}>
              <Typography
                variant="subtitle2"
                sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, fontWeight: 'bold' }}
                color="info.main"
              >
                {tabName} ({tabSteps.length} crafts, {slabInTab} slab)
              </Typography>
              <Stack gap={0.25} sx={{ py: 0.5 }}>
                {tabSteps.map((s) => {
                  const qtyStr = s.qty > 1 ? ` x${s.qty}` : '';
                  return (
                    <Stack key={s.step} direction="row" alignItems="center" gap={1} sx={{ px: 1 }}>
                      <Typography variant="body2" color="warning.main" fontWeight="bold" sx={{ minWidth: 40 }}>
                        #{s.step}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={s.isSlab ? 'bold' : 'normal'}
                        color={s.isSlab ? 'warning.main' : 'text.primary'}
                      >
                        {cleanUnderscore(s.name)}{qtyStr}
                      </Typography>
                      <Chip
                        label={s.isSlab ? 'SLAB' : 'SUB'}
                        size="small"
                        sx={{
                          bgcolor: s.isSlab ? 'warning.main' : '#f78166',
                          color: '#000',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          height: 20
                        }}
                      />
                      {s.parent && (
                        <Typography variant="caption" color="text.secondary">
                          for {cleanUnderscore(s.parent)}
                        </Typography>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            </Box>
          );
        })}

        {steps.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No craft steps in this batch.
          </Typography>
        )}
      </Stack>
    );
  };

  const renderBatchMaterialsTab = () => {
    if (!batch) {
      return <Typography variant="body2" color="text.secondary">No batches available.</Typography>;
    }

    const raw = batch.rawMaterials;
    const peak = batch.peakSlots;
    const ok = peak <= MAX_SLOTS;
    const haveAll = raw.filter((m) => m.have >= m.need).length;
    const missing = raw.length - haveAll;

    return (
      <Stack gap={2}>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          <Typography variant="body2" color="text.secondary">Batch:</Typography>
          {batches.map((b, idx) => (
            <Button
              key={idx}
              size="small"
              variant={idx === safeBatchIndex ? 'contained' : 'outlined'}
              onClick={() => setCurrentBatch(idx)}
            >
              Craft {b.batchNum}
            </Button>
          ))}
        </Stack>

        <Typography variant="h6" color="info.main">
          Batch {batch.batchNum} - Raw Materials ({batch.slabItems.length} slab items)
        </Typography>

        <Stack direction="row" gap={2} flexWrap="wrap">
          <Typography variant="body2" color="info.main">
            Unique materials: {raw.length}
          </Typography>
          <Typography variant="body2" color="info.main">
            Peak slots: {peak}/{MAX_SLOTS}
          </Typography>
          <Chip
            label={ok ? 'FITS' : `OVER BY ${peak - MAX_SLOTS}`}
            size="small"
            color={ok ? 'success' : 'error'}
          />
        </Stack>

        {missing === 0 ? (
          <Typography variant="body2" color="success.main">You have everything!</Typography>
        ) : (
          <Typography variant="body2" color="error">Missing {missing} materials</Typography>
        )}

        {raw.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Need</TableCell>
                  <TableCell align="right">Have</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {raw.map((m, idx) => (
                  <TableRow key={m.name} sx={idx % 2 === 1 ? { bgcolor: 'action.hover' } : {}}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        {renderItemIcon(m.rawName, 22)}
                        <Typography variant="body2">{cleanUnderscore(m.name)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{numberWithCommas(m.need)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={colorForHave(m.have, m.need)}>
                        {numberWithCommas(m.have)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    );
  };

  const tabContent = [renderItemsTab, renderCraftOrderTab, renderAllRawTab, renderBatchOrderTab, renderBatchMaterialsTab];

  return (
    <Stack gap={2}>
      <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Slab Crafter</Typography>
        {renderStats()}
      </Stack>

      <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
        {renderFilterButtons()}
        <TextField
          size="small"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
      </Stack>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab label="Items" />
        <Tab label="Craft Order" />
        <Tab label="All Raw Materials" />
        <Tab label="Batch Order" />
        <Tab label="Batch Materials" />
      </Tabs>

      <Divider />

      <Box sx={{ minHeight: 400 }}>
        {tabContent[activeTab]()}
      </Box>
    </Stack>
  );
};

export default SlabCrafter;
