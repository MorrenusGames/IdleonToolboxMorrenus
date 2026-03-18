import {
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import Button from '@mui/material/Button';
import React, { useContext, useState } from 'react';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import styled from '@emotion/styled';
import { useRouter } from 'next/router';
import MenuItem from '@mui/material/MenuItem';
import useTimeout from '../components/hooks/useTimeout';
import { AppContext } from '@components/common/context/AppProvider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { NextSeo } from 'next-seo';
import Box from '@mui/material/Box';
import Popper from '@components/common/Popper';
import { handleLoadJson } from '@utility/helpers';

import VisibilityIcon from '@mui/icons-material/Visibility';
import { IconInfoCircleFilled } from '@tabler/icons-react';
import Tooltip from '@components/Tooltip';
import CookiePolicyDialog from '@components/common/Etc/CookiePolicyDialog';

const Data = () => {
  const router = useRouter();
  const { state, dispatch } = useContext(AppContext);
  const [key, setKey] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [openPolicy, setOpenPolicy] = useState(false);
  const [open, setOpen] = useState(false);
  const [imported, setImported] = useState(false);

  const handleCopyITRaw = async (e) => {
    try {
      setAnchorEl(e.currentTarget)
      const data = JSON.parse(localStorage.getItem('rawJson'));
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyRaw = async (e) => {
    try {
      setAnchorEl(e.currentTarget)
      const data = JSON.parse(localStorage.getItem('rawJson'));
      await navigator.clipboard.writeText(JSON.stringify(data?.data, null, 2));
    } catch (err) {
      console.error(err);
    }
  };

  const handleStorageClear = () => {
    if (key === 'all') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        localStorage.removeItem(key)
      })
    } else {
      localStorage.removeItem(key)
    }
    router.reload();
  }

  const handleImportFromClipboard = async () => {
    try {
      await handleLoadJson(dispatch);
      setImported(true);
      setTimeout(() => setImported(false), 3000);
    } catch (err) {
      console.error(err);
    }
  }

  useTimeout(() => {
    setAnchorEl(null);
  }, anchorEl ? 1000 : null)

  return <Container>
    <NextSeo
      title="Data | Idleon Toolbox"
      description="Website settings and data management"
    />
    <h1>Data page</h1>
    <>
      <Stack direction={'column'} gap={1} flexWrap={'wrap'}>
        <Section title={'Import Profile'} description={'Paste your Idleon JSON data from clipboard to load your profile'}>
          <Stack direction={'row'} gap={1} alignItems={'center'}>
            <ButtonStyle component={'span'} variant={'contained'} startIcon={<FileUploadIcon/>}
                         onClick={handleImportFromClipboard} size={'large'}>
              Import from Clipboard
            </ButtonStyle>
            <Fade in={imported}>
              <CheckCircleIcon color={'success'}/>
            </Fade>
          </Stack>
        </Section>
        <Section title={'Data'} description={'This is idleon toolbox formatted data, use this when asking for support'}>
          <ButtonStyle component={'span'} variant={'outlined'} startIcon={<FileCopyIcon/>}
                       onClick={handleCopyITRaw} size={'large'}>
            Copy Data for Support
          </ButtonStyle>
          <Tooltip title={'View raw JSON data'}>
            <ButtonStyle sx={{ ml: 'auto', minWidth: 32, opacity: 0.6 }} component={'span'} variant={'text'} size={'small'}
                         onClick={() => setOpen(true)}>
              <VisibilityIcon fontSize={'small'}/>
            </ButtonStyle>
          </Tooltip>
          <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>
              <Stack direction={'row'} justifyContent={'space-between'}>
                <Typography variant={'h6'}>Raw idleon data</Typography>
                <ButtonStyle sx={{ ml: 'auto' }} component={'span'} size={'small'} variant={'outlined'}
                             onClick={handleCopyRaw}>
                  Copy
                </ButtonStyle>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                {JSON.stringify(JSON.parse(localStorage.getItem('rawJson'))?.data, null, 2)}
              </div>
            </DialogContent>
          </Dialog>
        </Section>
        <Section title={'Configurations'}
                 description={'Various local configurations, use this if you\'re having any issues loading the website'}>
          <Stack direction={'row'} gap={2} flexWrap={'wrap'}>
            <TextField sx={{ width: 220 }} size="small" label={''} select value={key}
                       onChange={(e) => setKey(e.target.value)}>
              <MenuItem value={'all'}>All</MenuItem>
              <MenuItem value={'filters'}>Characters page filters</MenuItem>
              <MenuItem value={'trackers'}>Dashboard config</MenuItem>
              <MenuItem value={'planner'}>Item Planner</MenuItem>
              <MenuItem value={'material-tracker'}>Material tracker</MenuItem>
              <MenuItem value={'pinnedPages'}>Pinned Pages</MenuItem>
            </TextField>
            <ButtonStyle size={'small'} color={'warning'} variant={'outlined'} onClick={handleStorageClear}
                         startIcon={<IconInfoCircleFilled/>}>
              Clear
            </ButtonStyle>
          </Stack>
        </Section>
        <Section title={'Cookie Policy'}
                 description={'Review the site\'s cookie policy'}>
          <ButtonStyle variant={'outlined'} onClick={() => setOpenPolicy(true)}>Learn
            more</ButtonStyle>
          <CookiePolicyDialog open={openPolicy} onClose={() => setOpenPolicy(false)}/>
        </Section>
      </Stack>
      <Popper anchorEl={anchorEl} handleClose={() => setAnchorEl(null)}/>
    </>
  </Container>
};

const Section = ({ title, description, children }) => {
  return <Card variant="outlined" sx={{ maxWidth: { xs: 'auto', sm: 360 } }}>
    <Box sx={{ p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography gutterBottom variant="h5" component="div">{title}</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{description}</Typography>
    </Box>
    <Divider/>
    <Stack direction={'row'} sx={{ p: 2 }}>{children}</Stack>
  </Card>
}

const ButtonStyle = styled(Button)`
  text-transform: none;
`

export default Data;
