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
import React from 'react';
import { cleanUnderscore, numberWithCommas, prefix } from 'utility/helpers';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const SkillToolPage = ({ config, result }) => {
  const { rows, swaps, materials, craftOrder } = result;

  const groupedCraftOrder = {};
  craftOrder.forEach((entry) => {
    if (!groupedCraftOrder[entry.anvilTab]) groupedCraftOrder[entry.anvilTab] = [];
    groupedCraftOrder[entry.anvilTab].push(entry);
  });

  return (
    <Stack gap={3}>
      <Stack gap={1}>
        <Typography variant="h6">Who Gets What</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Character</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Currently Has</TableCell>
                <TableCell>Upgrade To</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <Typography variant="body2">{row.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Typography variant="body2">{cleanUnderscore(row.className)}</Typography>
                      <Chip
                        size="small"
                        label={row.isPrimary ? 'PRIMARY' : 'off-class'}
                        color={row.isPrimary ? 'primary' : 'default'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {row.equipped ? (
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <img
                          src={`${prefix}data/${row.equipped.rawName}.png`}
                          alt=""
                          style={{ width: 28, height: 28, objectFit: 'contain' }}
                        />
                        <Typography variant="body2">{cleanUnderscore(row.equipped.displayName)}</Typography>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">None</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.target && row.status !== 'max' ? (
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <img
                          src={`${prefix}data/${row.target.rawName}.png`}
                          alt=""
                          style={{ width: 28, height: 28, objectFit: 'contain' }}
                        />
                        <Typography variant="body2">{cleanUnderscore(row.target.displayName)}</Typography>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{'\u2014'}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusDisplay row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      {swaps.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">Swap Recommendations</Typography>
          <Typography variant="caption" color="text.secondary">
            Off-class characters have better tools that primary-class characters could use
          </Typography>
          {swaps.map((swap, i) => (
            <Stack key={i} direction="row" alignItems="center" gap={1}>
              <SwapHorizIcon color="info" />
              <Typography variant="body2">{swap.from}</Typography>
              <img
                src={`${prefix}data/${swap.tool?.rawName}.png`}
                alt=""
                style={{ width: 24, height: 24, objectFit: 'contain' }}
              />
              <Typography variant="body2" color="text.secondary">{'\u2192'}</Typography>
              <Typography variant="body2">{swap.to}</Typography>
            </Stack>
          ))}
        </Stack>
      )}

      {materials.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">Materials to Pull</Typography>
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
                {materials.map(({ itemName, rawName, need, have, short }) => (
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

      {craftOrder.length > 0 && (
        <Stack gap={1}>
          <Typography variant="h6">Craft Order</Typography>
          {Object.entries(groupedCraftOrder)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tabName, entries]) => (
              <Stack key={tabName} gap={1}>
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{ bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: 1 }}
                >
                  <Typography variant="subtitle2">{tabName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({entries.length} item{entries.length !== 1 ? 's' : ''})
                  </Typography>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40 }}>#</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell>For</TableCell>
                        <TableCell>Materials</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entries.map(({ item, chars, qty, isSlab, materials: mats }, stepIdx) => (
                        <TableRow key={item.rawName}>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: isSlab ? 'bold' : 'normal', color: isSlab ? '#d29922' : 'text.secondary' }}
                            >
                              {stepIdx + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              <img
                                src={`${prefix}data/${item.rawName}.png`}
                                alt=""
                                style={{ width: 28, height: 28, objectFit: 'contain' }}
                              />
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: isSlab ? 'bold' : 'normal', color: isSlab ? '#d29922' : 'text.primary' }}
                              >
                                {cleanUnderscore(item.displayName)}
                              </Typography>
                              {isSlab && (
                                <Chip
                                  size="small"
                                  label="SLAB"
                                  sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#d29922', color: '#000', fontWeight: 'bold' }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{qty}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{chars.join(', ')}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack gap={0.25}>
                              {mats?.map((mat) => (
                                <Stack key={mat.itemName} direction="row" alignItems="center" gap={0.5}>
                                  <img
                                    src={`${prefix}data/${mat.rawName}.png`}
                                    alt=""
                                    style={{ width: 18, height: 18, objectFit: 'contain' }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {cleanUnderscore(mat.itemName)} x{numberWithCommas(mat.itemQuantity)}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            ))}
        </Stack>
      )}
    </Stack>
  );
};

const StatusDisplay = ({ row }) => {
  if (row.status === 'max') {
    return (
      <Stack gap={0.25}>
        <Chip size="small" label="MAX" color="success" sx={{ width: 'fit-content' }} />
        <Typography variant="caption" color="text.secondary">
          Already at best tool for Lv {row.blockedInfo?.topTierLvl || '?'}
        </Typography>
      </Stack>
    );
  }

  if (row.status === 'can-craft') {
    return <Chip size="small" label="Can Craft" color="info" />;
  }

  if (row.status === 'can-skip') {
    return <Chip size="small" label="Can Skip Tiers" color="info" />;
  }

  if (row.status === 'blocked') {
    const { missing, nextTier } = row.blockedInfo || {};
    return (
      <Stack gap={0.25}>
        <Chip size="small" label="BLOCKED" color="error" sx={{ width: 'fit-content' }} />
        {missing?.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            Need: {missing.map((m) => `${m.name} (${numberWithCommas(m.need - m.have)})`).join(' | ')}
          </Typography>
        )}
        {nextTier && (
          <Typography variant="caption" color="text.secondary">
            Next tier: {nextTier.name} @ Lv {nextTier.lvReq}
            {row.level < nextTier.lvReq ? ` (${nextTier.lvReq - row.level} to go)` : ''}
          </Typography>
        )}
      </Stack>
    );
  }

  return null;
};

export default SkillToolPage;
