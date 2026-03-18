import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import React, { useMemo } from 'react';
import { cleanUnderscore, numberWithCommas, prefix } from 'utility/helpers';
import { carryBags, crafts } from '@website-data';
import { flattenCraftObject, getAllItems, findQuantityOwned } from 'parsers/items';

const bagTypeLabels = {
  Mining: 'Mining',
  Chopping: 'Chopping',
  Foods: 'Food',
  bCraft: 'Material',
  Fishing: 'Fishing',
  Bugs: 'Bugs',
  Critters: 'Critters',
  Souls: 'Souls'
};

const getTierList = (bagType) => {
  const tiers = carryBags?.[bagType];
  if (!tiers) return [];
  return Object.values(tiers).sort((a, b) => a.capacity - b.capacity);
};

const BagChecker = ({ characters = [], account }) => {
  const allItems = useMemo(() => getAllItems(characters, account), [characters, account]);

  const bagData = useMemo(() => {
    const bagTypes = Object.keys(carryBags);
    const charBags = characters?.map((char) => {
      const result = { name: char.name, className: char.class, bags: {} };
      bagTypes.forEach((bagType) => {
        const tierList = getTierList(bagType);
        const currentBag = char.carryCapBags?.find((b) => b?.Class === bagType);
        const currentIndex = currentBag ? tierList.findIndex((t) => t.rawName === currentBag.rawName) : -1;
        const nextTier = currentIndex < tierList.length - 1 ? tierList[currentIndex + 1] : null;
        result.bags[bagType] = {
          current: currentBag,
          currentIndex,
          next: nextTier,
          isMax: currentIndex === tierList.length - 1
        };
      });
      return result;
    }) || [];
    return { charBags, bagTypes };
  }, [characters]);

  const shoppingList = useMemo(() => {
    const materials = {};
    bagData.charBags.forEach((char) => {
      Object.values(char.bags).forEach(({ next }) => {
        if (!next) return;
        const recipe = crafts?.[next.displayName];
        if (!recipe) return;
        const flat = flattenCraftObject(recipe);
        flat?.forEach(({ itemName, rawName, itemQuantity }) => {
          if (!materials[itemName]) materials[itemName] = { need: 0, rawName: rawName || itemName };
          materials[itemName].need += itemQuantity;
        });
      });
    });

    return Object.entries(materials).map(([itemName, { need, rawName }]) => {
      const owned = findQuantityOwned(allItems, itemName);
      return {
        itemName,
        rawName,
        need,
        have: owned?.amount || 0,
        short: Math.max(0, need - (owned?.amount || 0))
      };
    }).filter((m) => m.need > 0).sort((a, b) => b.short - a.short);
  }, [bagData, allItems]);

  if (!characters?.length) {
    return <Typography>No character data available. Log in to see bag information.</Typography>;
  }

  return (
    <Stack gap={4}>
      <Typography variant="h5">Bag Checker</Typography>

      {bagData.bagTypes.map((bagType) => {
        const tierList = getTierList(bagType);
        const hasUpgrades = bagData.charBags.some((c) => c.bags[bagType]?.next);
        return (
          <Stack key={bagType} gap={1}>
            <Typography variant="h6">{bagTypeLabels[bagType] || bagType} Bags</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Character</TableCell>
                    <TableCell>Current Bag</TableCell>
                    <TableCell>Capacity</TableCell>
                    <TableCell>Next Upgrade</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bagData.charBags.map((char) => {
                    const info = char.bags[bagType];
                    return (
                      <TableRow key={char.name + bagType}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Typography variant="body2">{char.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {cleanUnderscore(char.className)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {info.current ? (
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <img
                                src={`${prefix}data/${info.current.rawName}.png`}
                                alt=""
                                style={{ width: 28, height: 28, objectFit: 'contain' }}
                              />
                              <Typography variant="body2">{cleanUnderscore(info.current.displayName)}</Typography>
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">None</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {info.current ? numberWithCommas(info.current.capacity) : '—'}
                        </TableCell>
                        <TableCell>
                          {info.next ? (
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <img
                                src={`${prefix}data/${info.next.rawName}.png`}
                                alt=""
                                style={{ width: 28, height: 28, objectFit: 'contain' }}
                              />
                              <Typography variant="body2">
                                {cleanUnderscore(info.next.displayName)} ({numberWithCommas(info.next.capacity)})
                              </Typography>
                            </Stack>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {info.isMax
                            ? <Chip label="MAX" size="small" color="success" />
                            : info.next
                              ? <Chip label="Upgrade Available" size="small" color="info" />
                              : <Chip label="No Bag" size="small" color="warning" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        );
      })}

      {shoppingList.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">Shopping List (All Bag Upgrades)</Typography>
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
                {shoppingList.map(({ itemName, rawName, need, have, short }) => (
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

export default BagChecker;
