import {
  Box,
  Chip,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography
} from '@mui/material';
import React, { useMemo, useState } from 'react';
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

const getTierIndex = (bagType, rawName) => {
  const tierList = getTierList(bagType);
  return tierList.findIndex((t) => t.rawName === rawName);
};

const BagChecker = ({ characters = [], account }) => {
  const [tab, setTab] = useState(0);
  const allItems = useMemo(() => getAllItems(characters, account), [characters, account]);

  const bagTypes = useMemo(() => Object.keys(carryBags || {}), []);

  const charBagData = useMemo(() => {
    return characters?.map((char) => {
      const result = { name: char.name, className: char.class, bags: {} };
      bagTypes.forEach((bagType) => {
        const tierList = getTierList(bagType);
        const currentBag = char.carryCapBags?.find((b) => b?.Class === bagType);
        const currentIndex = currentBag ? tierList.findIndex((t) => t.rawName === currentBag.rawName) : -1;
        const nextTier = currentIndex < tierList.length - 1 ? tierList[currentIndex + 1] : null;
        const maxTier = tierList.length - 1;
        const storageQty = nextTier ? findQuantityOwned(allItems, nextTier.displayName)?.amount || 0 : 0;
        result.bags[bagType] = {
          current: currentBag,
          currentIndex,
          maxTier,
          next: nextTier,
          isMax: currentIndex === maxTier,
          storageQty
        };
      });
      return result;
    }) || [];
  }, [characters, allItems, bagTypes]);

  const shoppingData = useMemo(() => {
    const needs = {};
    charBagData.forEach((char) => {
      bagTypes.forEach((bagType) => {
        const info = char.bags[bagType];
        if (!info?.next) return;
        const rn = info.next.rawName;
        if (!needs[rn]) {
          needs[rn] = {
            rawName: rn,
            displayName: info.next.displayName,
            bagType,
            capacity: info.next.capacity,
            chars: [],
            count: 0,
            storageQty: info.storageQty
          };
        }
        needs[rn].chars.push(char.name);
        needs[rn].count += 1;
      });
    });

    const byType = {};
    Object.values(needs).forEach((info) => {
      if (!byType[info.bagType]) byType[info.bagType] = [];
      byType[info.bagType].push(info);
    });
    Object.values(byType).forEach((list) => list.sort((a, b) => a.capacity - b.capacity));

    return { needs, byType };
  }, [charBagData, bagTypes]);

  const charShoppingData = useMemo(() => {
    const totalMats = {};
    const perChar = charBagData.map((char) => {
      const bagsNeeded = [];
      const charMats = {};
      bagTypes.forEach((bagType) => {
        const info = char.bags[bagType];
        if (!info?.next) return;
        const recipe = crafts?.[info.next.displayName];
        const flat = recipe ? flattenCraftObject(recipe) : null;
        const materials = flat?.map(({ itemName, rawName, itemQuantity }) => {
          const owned = findQuantityOwned(allItems, itemName);
          return {
            itemName,
            rawName: rawName || itemName,
            need: itemQuantity,
            have: owned?.amount || 0
          };
        }) || null;

        if (materials && !info.storageQty) {
          materials.forEach(({ itemName, need }) => {
            charMats[itemName] = (charMats[itemName] || 0) + need;
            totalMats[itemName] = (totalMats[itemName] || 0) + need;
          });
        }

        bagsNeeded.push({
          bagType,
          displayName: info.next.displayName,
          rawName: info.next.rawName,
          storageQty: info.storageQty,
          materials,
          hasRecipe: !!recipe
        });
      });
      return { name: char.name, bagsNeeded, charMats };
    });

    const totalMatsList = Object.entries(totalMats).map(([itemName, need]) => {
      const owned = findQuantityOwned(allItems, itemName);
      return { itemName, need, have: owned?.amount || 0 };
    }).sort((a, b) => a.itemName.localeCompare(b.itemName));

    return { perChar, totalMatsList };
  }, [charBagData, allItems, bagTypes]);

  if (!characters?.length) {
    return <Typography>No character data available. Log in to see bag information.</Typography>;
  }

  return (
    <Stack gap={2}>
      <Typography variant="h5">Bag Checker</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab label="Per Character" />
        <Tab label="Shopping List" />
        <Tab label="Per-Char Shopping" />
        <Tab label="Summary Grid" />
      </Tabs>

      {tab === 0 && <PerCharacterView charBagData={charBagData} bagTypes={bagTypes} />}
      {tab === 1 && <ShoppingListView shoppingData={shoppingData} />}
      {tab === 2 && <PerCharShoppingView charShoppingData={charShoppingData} allItems={allItems} />}
      {tab === 3 && <SummaryGridView charBagData={charBagData} bagTypes={bagTypes} />}
    </Stack>
  );
};

const PerCharacterView = ({ charBagData, bagTypes }) => {
  return (
    <Stack gap={3}>
      {charBagData.map((char) => {
        const totalUpgrades = bagTypes.filter((bt) => char.bags[bt]?.next).length;
        return (
          <Stack key={char.name} gap={1}>
            <Typography variant="h6">
              {char.name}
              <Typography component="span" variant="body2" sx={{ ml: 1 }} color="text.secondary">
                ({totalUpgrades} upgrades available)
              </Typography>
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bag Type</TableCell>
                    <TableCell>Current Bag</TableCell>
                    <TableCell>Capacity</TableCell>
                    <TableCell>Next Upgrade</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bagTypes.map((bagType) => {
                    const info = char.bags[bagType];
                    if (!info) return null;
                    return (
                      <TableRow key={bagType}>
                        <TableCell>{bagTypeLabels[bagType] || bagType}</TableCell>
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
                          {info.isMax ? (
                            '—'
                          ) : info.next ? (
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
                          {info.isMax ? (
                            <Chip label="MAXED" size="small" color="success" />
                          ) : info.storageQty > 0 ? (
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Chip label="IN STORAGE" size="small" color="success" />
                              <Typography variant="caption" color="text.secondary">x{info.storageQty}</Typography>
                            </Stack>
                          ) : info.next ? (
                            <Chip label="NEED" size="small" color="error" />
                          ) : (
                            <Chip label="No Bag" size="small" color="warning" />
                          )}
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
    </Stack>
  );
};

const ShoppingListView = ({ shoppingData }) => {
  const { byType } = shoppingData;
  const sortedTypes = Object.keys(byType).sort();

  if (sortedTypes.length === 0) {
    return <Typography color="success.main">All characters are maxed on all bag types!</Typography>;
  }

  return (
    <Stack gap={3}>
      <Typography variant="body2" color="text.secondary">
        Aggregated across all characters. Only shows the NEXT upgrade each character needs per type.
      </Typography>
      {sortedTypes.map((bagType) => {
        const items = byType[bagType];
        return (
          <Stack key={bagType} gap={1}>
            <Typography variant="h6">{bagTypeLabels[bagType] || bagType}</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bag</TableCell>
                    <TableCell align="right">Need</TableCell>
                    <TableCell align="right">Have</TableCell>
                    <TableCell>Characters</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => {
                    const short = Math.max(0, item.count - item.storageQty);
                    const enough = short === 0;
                    return (
                      <TableRow key={item.rawName} sx={enough ? {} : { bgcolor: 'rgba(255,0,0,0.05)' }}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <img
                              src={`${prefix}data/${item.rawName}.png`}
                              alt=""
                              style={{ width: 28, height: 28, objectFit: 'contain' }}
                            />
                            <Typography variant="body2">{cleanUnderscore(item.displayName)}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{item.count}</TableCell>
                        <TableCell align="right">{item.storageQty}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{item.chars.join(', ')}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={enough ? 'Have Enough' : `Short ${short}`}
                            size="small"
                            color={enough ? 'success' : 'error'}
                          />
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
    </Stack>
  );
};

const PerCharShoppingView = ({ charShoppingData, allItems }) => {
  const { perChar, totalMatsList } = charShoppingData;

  return (
    <Stack gap={3}>
      <Typography variant="body2" color="text.secondary">
        Bags to craft + materials needed per character.
      </Typography>
      {perChar.map((char) => {
        const hasNeeds = char.bagsNeeded.length > 0;
        if (!hasNeeds) {
          return (
            <Stack key={char.name} direction="row" alignItems="center" gap={1}>
              <Typography variant="h6">{char.name}</Typography>
              <Chip label="ALL MAXED" size="small" color="success" />
            </Stack>
          );
        }

        return (
          <Stack key={char.name} gap={1}>
            <Typography variant="h6">
              {char.name}
              <Typography component="span" variant="body2" sx={{ ml: 1 }} color="text.secondary">
                ({char.bagsNeeded.length} bags needed)
              </Typography>
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Bag</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {char.bagsNeeded.map((bag) => (
                    <React.Fragment key={bag.rawName}>
                      <TableRow>
                        <TableCell>{bagTypeLabels[bag.bagType] || bag.bagType}</TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <img
                              src={`${prefix}data/${bag.rawName}.png`}
                              alt=""
                              style={{ width: 28, height: 28, objectFit: 'contain' }}
                            />
                            <Typography variant="body2">{cleanUnderscore(bag.displayName)}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {bag.storageQty > 0 ? (
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Chip label="IN STORAGE" size="small" color="success" />
                              <Typography variant="caption" color="text.secondary">x{bag.storageQty}</Typography>
                            </Stack>
                          ) : (
                            <Chip label="NEED" size="small" color="error" />
                          )}
                        </TableCell>
                      </TableRow>
                      {!bag.storageQty && bag.materials ? (
                        bag.materials.map((mat) => (
                          <TableRow key={`${bag.rawName}-${mat.itemName}`} sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <TableCell />
                            <TableCell>
                              <Stack direction="row" alignItems="center" gap={0.5} sx={{ pl: 2 }}>
                                <img
                                  src={`${prefix}data/${mat.rawName}.png`}
                                  alt=""
                                  style={{ width: 20, height: 20, objectFit: 'contain' }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                  {cleanUnderscore(mat.itemName)}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                color={mat.have >= mat.need ? 'success.main' : 'error.main'}
                              >
                                Need: {numberWithCommas(mat.need)} / Have: {numberWithCommas(mat.have)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : !bag.storageQty && !bag.hasRecipe ? (
                        <TableRow key={`${bag.rawName}-norecipe`}>
                          <TableCell />
                          <TableCell colSpan={2}>
                            <Typography variant="body2" sx={{ color: 'warning.main', pl: 2 }}>
                              No crafting recipe - quest/shop reward
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        );
      })}

      {totalMatsList.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">Total Materials Needed (All Characters)</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell align="right">Need</TableCell>
                  <TableCell align="right">Have</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {totalMatsList.map(({ itemName, need, have }) => {
                  const enough = have >= need;
                  return (
                    <TableRow key={itemName} sx={enough ? {} : { bgcolor: 'rgba(255,0,0,0.05)' }}>
                      <TableCell>
                        <Typography variant="body2">{cleanUnderscore(itemName)}</Typography>
                      </TableCell>
                      <TableCell align="right">{numberWithCommas(need)}</TableCell>
                      <TableCell align="right">{numberWithCommas(have)}</TableCell>
                      <TableCell>
                        <Chip
                          label={enough ? 'OK' : `Short ${numberWithCommas(need - have)}`}
                          size="small"
                          color={enough ? 'success' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Stack>
  );
};

const SummaryGridView = ({ charBagData, bagTypes }) => {
  const sortedTypes = [...bagTypes].sort();
  return (
    <Stack gap={2}>
      <Typography variant="body2" color="text.secondary">
        Green = maxed, Orange = close (70%+), Red = behind
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Character</TableCell>
              {sortedTypes.map((bt) => (
                <TableCell key={bt} align="center">{bagTypeLabels[bt] || bt}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {charBagData.map((char) => (
              <TableRow key={char.name}>
                <TableCell>{char.name}</TableCell>
                {sortedTypes.map((bt) => {
                  const info = char.bags[bt];
                  if (!info) return <TableCell key={bt} align="center">—</TableCell>;
                  const tier = info.currentIndex;
                  const maxTier = info.maxTier;
                  let color = 'error.main';
                  let display = tier < 0 ? 'NONE' : `${tier}/${maxTier}`;
                  if (tier === maxTier) {
                    color = 'success.main';
                  } else if (tier >= 0 && tier >= maxTier * 0.7) {
                    color = 'warning.main';
                  }
                  return (
                    <TableCell key={bt} align="center">
                      <Typography variant="body2" sx={{ color, fontWeight: tier === maxTier ? 'bold' : 'normal' }}>
                        {display}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

export default BagChecker;
