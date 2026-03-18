import React, { useContext } from 'react';
import { Typography } from '@mui/material';
import { AppContext } from 'components/common/context/AppProvider';
import { NextSeo } from 'next-seo';
import EnhancedConstellations from '@components/tools/enhanced-constellations/EnhancedConstellations';

export default function EnhancedConstellationsPage() {
  const { state } = useContext(AppContext);

  return (
    <>
      <NextSeo
        title="Enhanced Constellations | Idleon Toolbox"
        description="Filter and track constellation progress by area, world, status, and player count"
      />
      {!state?.characters && !state?.account
        ? <Typography component={'div'} sx={{ mb: 2 }} variant={'caption'}>* This tool will work better if you're logged in</Typography>
        : null}
      <EnhancedConstellations
        constellations={state?.account?.constellations || []}
        characters={state?.characters || []}
      />
    </>
  );
}
