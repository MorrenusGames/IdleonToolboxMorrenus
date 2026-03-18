import {
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import { cleanUnderscore, numberWithCommas, prefix } from 'utility/helpers';
import CheckIcon from '@mui/icons-material/Check';
import { mapEnemiesArray, monsters } from '@website-data';

const areaLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
const worlds = [1, 2, 3, 4, 5, 6, 7];

const getAreaFromName = (name) => {
  const match = name?.match(/^([A-F])-/);
  return match ? match[1] : null;
};

const getWorldFromMap = (mapIndex) => {
  return Number.isInteger(mapIndex) ? Math.floor(mapIndex / 50) + 1 : null;
};

const EnhancedConstellations = ({ constellations = [], characters = [] }) => {
  const isMd = useMediaQuery((theme) => theme.breakpoints.down('md'), { noSsr: true });
  const [hideCompleted, setHideCompleted] = useState(false);
  const [areaFilter, setAreaFilter] = useState([]);
  const [worldFilter, setWorldFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [playerCountFilter, setPlayerCountFilter] = useState('');
  const [expandedHints, setExpandedHints] = useState({});

  const characterNames = useMemo(() => characters?.map(({ name }) => name) || [], [characters]);

  const charIndexMap = useMemo(() => {
    const alphabet = '_abcdefghijklmnopqrstuvwxyz';
    return alphabet.split('').reduce((acc, char, idx) => ({ ...acc, [char]: idx }), {});
  }, []);

  const getCompletedNames = (completedChars) => {
    const indices = completedChars
      ?.split('')
      ?.map((char) => charIndexMap?.[char])
      ?.filter((idx) => idx !== undefined);
    const uniqueSorted = [...new Set(indices)]?.sort((a, b) => a - b);
    return uniqueSorted?.map((idx) => characterNames?.[idx] || `Char ${idx + 1}`) || [];
  };

  const getStatus = (constellation) => {
    if (constellation.done) return 'done';
    const charCount = constellation.completedChars?.length ?? 0;
    return charCount >= constellation.requiredPlayers ? 'ready' : 'need-more';
  };

  const filteredList = useMemo(() => {
    return constellations?.filter((c) => {
      if (hideCompleted && c.done) return false;
      if (areaFilter.length > 0) {
        const area = getAreaFromName(c.name);
        if (!area || !areaFilter.includes(area)) return false;
      }
      if (worldFilter) {
        const world = getWorldFromMap(c.mapIndex);
        if (world !== worldFilter) return false;
      }
      if (statusFilter) {
        const status = getStatus(c);
        if (status !== statusFilter) return false;
      }
      if (playerCountFilter) {
        if (c.requiredPlayers !== playerCountFilter) return false;
      }
      return true;
    });
  }, [constellations, hideCompleted, areaFilter, worldFilter, statusFilter, playerCountFilter]);

  const stats = useMemo(() => {
    const result = { ownedPoints: 0, totalPoints: 0, done: 0, ready: 0, needMore: 0, total: constellations?.length || 0 };
    constellations?.forEach((c) => {
      result.totalPoints += c.points;
      if (c.done) {
        result.ownedPoints += c.points;
        result.done++;
      } else {
        const charCount = c.completedChars?.length ?? 0;
        if (charCount >= c.requiredPlayers) result.ready++;
        else result.needMore++;
      }
    });
    return result;
  }, [constellations]);

  const uniquePlayerCounts = useMemo(() => {
    const counts = new Set(constellations?.map((c) => c.requiredPlayers));
    return [...counts].sort((a, b) => a - b);
  }, [constellations]);

  const toggleHint = (name) => {
    setExpandedHints((prev) => ({ ...prev, [name]: !prev?.[name] }));
  };

  return (
    <Stack gap={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2} flexWrap={'wrap'}>
        <Card variant="outlined" sx={{ minWidth: 140 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Points</Typography>
            <Typography variant="h6">{numberWithCommas(stats.ownedPoints)} / {numberWithCommas(stats.totalPoints)}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ minWidth: 100 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Done</Typography>
            <Typography variant="h6" color="success.main">{stats.done}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ minWidth: 100 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Ready</Typography>
            <Typography variant="h6" color="info.main">{stats.ready}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ minWidth: 100 }}>
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">Need More</Typography>
            <Typography variant="h6" color="warning.main">{stats.needMore}</Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} flexWrap={'wrap'} alignItems={'center'}>
        <ToggleButtonGroup
          size="small"
          value={areaFilter}
          onChange={(e, val) => setAreaFilter(val)}
        >
          {areaLetters.map((letter) => (
            <ToggleButton key={letter} value={letter}>{letter}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>World</InputLabel>
          <Select value={worldFilter} label="World" onChange={(e) => setWorldFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {worlds.map((w) => <MenuItem key={w} value={w}>World {w}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="done">Done</MenuItem>
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="need-more">Need More</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Players Needed</InputLabel>
          <Select value={playerCountFilter} label="Players Needed" onChange={(e) => setPlayerCountFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {uniquePlayerCounts.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Checkbox checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />}
          label="Hide completed"
        />

        {(areaFilter.length > 0 || worldFilter || statusFilter || playerCountFilter) && (
          <Chip
            label="Clear filters"
            size="small"
            onDelete={() => { setAreaFilter([]); setWorldFilter(''); setStatusFilter(''); setPlayerCountFilter(''); }}
          />
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Showing {filteredList?.length} of {constellations?.length} constellations
      </Typography>

      <Grid rowGap={2} justifyContent={'center'} container>
        {!isMd ? <Grid item xs={1}>
          <Typography variant={'body1'} component={'span'}>Name</Typography></Grid> : null}
        <Grid item xs={1}>
          <Typography variant={'body1'} component={'span'}>{!isMd ? 'Progress' : ''}</Typography></Grid>
        <Grid item xs={2}>
          <Typography pl={!isMd ? 6 : 0} variant={'body1'} component={'span'}>{!isMd ? 'Location' : 'Loc.'}</Typography></Grid>
        <Grid item xs={3}>
          <Typography pl={!isMd ? 6 : 0} variant={'body1'} component={'span'}>{!isMd ? 'Requirement' : 'Req.'}</Typography></Grid>
        <Grid item xs={4}>
          <Typography pl={!isMd ? 6 : 0} variant={'body1'} component={'span'}>Points</Typography></Grid>
        <Grid item md={1} />
      </Grid>

      {filteredList?.map((constellation, index) => {
        const { name, points, done, requirement, completedChars, requiredPlayers, location, mapIndex } = constellation;
        const completedNames = getCompletedNames(completedChars);
        const monsterRaw = mapEnemiesArray?.[mapIndex];
        const monsterName = monsterRaw === 'Nothing' ? null : cleanUnderscore(monsters?.[monsterRaw]?.Name || monsterRaw);
        const world = getWorldFromMap(mapIndex);
        const status = getStatus(constellation);
        const wikiAnchor = name?.replace('-', '_');
        const wikiLink = `https://idleon.miraheze.org/wiki/Star_Signs#${wikiAnchor}`;

        return (
          <React.Fragment key={name + ' ' + index}>
            <Grid rowGap={2} gap={1} container sx={{ cursor: 'pointer' }} onClick={() => toggleHint(name)}>
              {!isMd ? <Grid item xs={1}>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Typography variant={'body1'} component={'span'}>{cleanUnderscore(name)}</Typography>
                  {status === 'ready' && <Chip size="small" label="Ready" color="info" sx={{ height: 20 }} />}
                </Stack>
              </Grid> : null}
              <Grid item xs={1} display={'flex'} alignItems={'center'} gap={1}>
                {done ? <CheckIcon color={'success'} /> : <Typography variant={'body1'} component={'span'}>
                  {`${completedChars?.length ?? 0}/${requiredPlayers}`}
                </Typography>}
              </Grid>
              <Grid item xs={2}>
                <Stack spacing={0.25}>
                  <Typography variant={'body1'} component={'span'}>
                    {(location === 'End_Of_The_Road') ? cleanUnderscore(location) + ' *' : cleanUnderscore(location)}
                  </Typography>
                  {world ? <Typography variant={'caption'} color={'text.secondary'}>World {world}</Typography> : null}
                  {monsterName
                    ? <Stack direction={'row'} spacing={0.5} alignItems={'center'}>
                        <img
                          src={`${prefix}afk_targets/${monsters?.[monsterRaw]?.Name}.png`}
                          alt={monsterName}
                          style={{ width: 28, height: 28, objectFit: 'contain' }}
                        />
                        <Typography variant={'caption'} color={'text.secondary'}>Mob: {monsterName}</Typography>
                      </Stack>
                    : null}
                </Stack>
              </Grid>
              <Grid item xs={3}>{cleanUnderscore(requirement)}</Grid>
              <Grid item xs={2} sm={1}>{points}</Grid>
              <Grid item xs={2}>
                {completedNames?.length > 0
                  ? <Stack spacing={0.25}>
                      <Typography variant={'caption'} component={'div'}>Completed By</Typography>
                      <Typography variant={'caption'} sx={{ wordBreak: 'break-word' }}>{completedNames.join(', ')}</Typography>
                    </Stack>
                  : null}
              </Grid>
              <Grid item xs={12}>
                <Collapse in={expandedHints?.[name]}>
                  <Stack spacing={0.5} pl={!isMd ? 1 : 0} pb={1}>
                    <Typography variant={'body2'}>
                      {cleanUnderscore(location)} {world ? `(World ${world})` : ''}. Follow the map star icon for this sign.
                    </Typography>
                    <Link href={wikiLink} target={'_blank'} rel={'noopener'} underline={'hover'}>
                      View wiki entry for {cleanUnderscore(name)}
                    </Link>
                  </Stack>
                </Collapse>
              </Grid>
            </Grid>
            {filteredList.length - 1 !== index ? <Divider /> : null}
          </React.Fragment>
        );
      })}
    </Stack>
  );
};

export default EnhancedConstellations;
