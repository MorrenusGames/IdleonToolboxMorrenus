import {
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import { cleanUnderscore, numberWithCommas, prefix } from 'utility/helpers';
import { crafts } from '@website-data';
import { flattenCraftObject, getAllItems, findQuantityOwned } from 'parsers/items';
import { useLocalStorage } from '@mantine/hooks';

const DEFAULT_BATCH_SIZE = 10;

const SlabCrafter = ({ account, characters = [] }) => {
  const [ignoreList, setIgnoreList] = useLocalStorage({
    key: 'slab-crafter:ignoreList',
    defaultValue: []
  });
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [batchIndex, setBatchIndex] = useState(0);

  const allItems = useMemo(() => getAllItems(characters, account), [characters, account]);

  const craftableSlabItems = useMemo(() => {
    const slabItems = account?.looty?.slabItems;
    if (!slabItems) return [];
    return slabItems
      .filter((item) => !item.obtained && !item.unobtainable && crafts?.[item.name])
      .filter((item) => !ignoreList.includes(item.rawName))
      .map((item) => {
        const recipe = crafts[item.name];
        const flat = flattenCraftObject(recipe);
        const materials = flat?.map((mat) => {
          const owned = findQuantityOwned(allItems, mat.itemName);
          return {
            ...mat,
            have: owned?.amount || 0,
            short: Math.max(0, mat.itemQuantity - (owned?.amount || 0))
          };
        }) || [];
        const canCraft = materials.every((m) => m.short === 0);
        return { ...item, recipe, materials, canCraft };
      })
      .sort((a, b) => {
        if (a.canCraft !== b.canCraft) return a.canCraft ? -1 : 1;
        const aShort = a.materials.reduce((s, m) => s + m.short, 0);
        const bShort = b.materials.reduce((s, m) => s + m.short, 0);
        return aShort - bShort;
      });
  }, [account, allItems, ignoreList]);

  const totalBatches = Math.max(1, Math.ceil(craftableSlabItems.length / batchSize));
  const currentBatch = craftableSlabItems.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);

  const batchMaterials = useMemo(() => {
    const mats = {};
    currentBatch.forEach((item) => {
      item.materials.forEach(({ itemName, rawName, itemQuantity }) => {
        if (!mats[itemName]) mats[itemName] = { rawName, need: 0 };
        mats[itemName].need += itemQuantity;
      });
    });
    return Object.entries(mats).map(([itemName, { rawName, need }]) => {
      const owned = findQuantityOwned(allItems, itemName);
      return {
        itemName,
        rawName: rawName || itemName,
        need,
        have: owned?.amount || 0,
        short: Math.max(0, need - (owned?.amount || 0))
      };
    }).sort((a, b) => b.short - a.short);
  }, [currentBatch, allItems]);

  const toggleIgnore = (rawName) => {
    setIgnoreList((prev) =>
      prev.includes(rawName) ? prev.filter((n) => n !== rawName) : [...prev, rawName]
    );
  };

  const craftableCount = craftableSlabItems.filter((i) => i.canCraft).length;

  if (!account?.looty) {
    return <Typography>No slab data available. Log in to see slab information.</Typography>;
  }

  return (
    <Stack gap={3}>
      <Typography variant="h5">Slab Crafter</Typography>

      <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
        <Typography variant="body1">
          {craftableSlabItems.length} craftable missing items ({craftableCount} ready to craft)
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Batch Size</InputLabel>
          <Select value={batchSize} label="Batch Size" onChange={(e) => { setBatchSize(e.target.value); setBatchIndex(0); }}>
            {[5, 10, 20, 50].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" gap={1} alignItems="center">
          <Button size="small" variant="outlined" disabled={batchIndex === 0} onClick={() => setBatchIndex(batchIndex - 1)}>
            Prev
          </Button>
          <Typography variant="body2">
            Batch {batchIndex + 1} / {totalBatches}
          </Typography>
          <Button size="small" variant="outlined" disabled={batchIndex >= totalBatches - 1} onClick={() => setBatchIndex(batchIndex + 1)}>
            Next
          </Button>
        </Stack>
      </Stack>

      {ignoreList.length > 0 && (
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" color="text.secondary">Ignored:</Typography>
          {ignoreList.map((rawName) => (
            <Chip
              key={rawName}
              size="small"
              label={cleanUnderscore(rawName)}
              onDelete={() => toggleIgnore(rawName)}
            />
          ))}
        </Stack>
      )}

      <Stack gap={1}>
        <Typography variant="h6">Items in Batch</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Materials</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentBatch.map((item) => (
                <TableRow key={item.rawName}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <img
                        src={`${prefix}data/${item.rawName}.png`}
                        alt=""
                        style={{ width: 32, height: 32, objectFit: 'contain' }}
                      />
                      <Typography variant="body2">{cleanUnderscore(item.name)}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {item.materials.map((mat, i) => (
                        <Stack key={i} direction="row" alignItems="center" gap={0.25}>
                          <img
                            src={`${prefix}data/${mat.rawName}.png`}
                            alt=""
                            style={{ width: 20, height: 20, objectFit: 'contain' }}
                          />
                          <Typography
                            variant="caption"
                            color={mat.short > 0 ? 'error' : 'success.main'}
                          >
                            {numberWithCommas(mat.have)}/{numberWithCommas(mat.itemQuantity)}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {item.canCraft
                      ? <Chip label="Ready" size="small" color="success" />
                      : <Chip label="Missing Mats" size="small" color="warning" />}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => toggleIgnore(item.rawName)}>Ignore</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {batchMaterials.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">Material Pull List (Batch {batchIndex + 1})</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Need</TableCell>
                  <TableCell align="right">Have</TableCell>
                  <TableCell align="right">Short</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {batchMaterials.map(({ itemName, rawName, need, have, short }) => (
                  <TableRow key={itemName} sx={short > 0 ? { bgcolor: 'rgba(255,0,0,0.05)' } : {}}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <img
                          src={`${prefix}data/${rawName}.png`}
                          alt=""
                          style={{ width: 24, height: 24, objectFit: 'contain' }}
                        />
                        <Typography variant="body2">{cleanUnderscore(itemName)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{numberWithCommas(need)}</TableCell>
                    <TableCell align="right">{numberWithCommas(have)}</TableCell>
                    <TableCell align="right">
                      {short > 0
                        ? <Typography variant="body2" color="error">{numberWithCommas(short)}</Typography>
                        : <Typography variant="body2" color="success.main">0</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Stack>
  );
};

export default SlabCrafter;
