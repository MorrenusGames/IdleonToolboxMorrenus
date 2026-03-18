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

const statusColors = {
  'up-to-date': 'success',
  'can-craft': 'info',
  'can-skip': 'info',
  'missing-mats': 'warning'
};

const statusLabels = {
  'up-to-date': 'Up to Date',
  'can-craft': 'Can Craft',
  'can-skip': 'Can Skip Tiers',
  'missing-mats': 'Missing Mats'
};

const SkillToolPage = ({ config, result }) => {
  const { rows, swaps, materials, craftOrder } = result;

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
                <TableCell>Current Tool</TableCell>
                <TableCell>Upgrade Target</TableCell>
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
                    {row.target ? (
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <img
                          src={`${prefix}data/${row.target.rawName}.png`}
                          alt=""
                          style={{ width: 28, height: 28, objectFit: 'contain' }}
                        />
                        <Typography variant="body2">{cleanUnderscore(row.target.displayName)}</Typography>
                      </Stack>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusLabels[row.status]}
                      color={statusColors[row.status]}
                    />
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
              <Typography variant="body2">
                {swap.from}
              </Typography>
              <img
                src={`${prefix}data/${swap.tool?.rawName}.png`}
                alt=""
                style={{ width: 24, height: 24, objectFit: 'contain' }}
              />
              <Typography variant="body2" color="text.secondary">→</Typography>
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
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell>For</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {craftOrder.map(({ item, chars, qty }) => (
                  <TableRow key={item.rawName}>
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
                    <TableCell align="right">{qty}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{chars.join(', ')}</Typography>
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

export default SkillToolPage;
