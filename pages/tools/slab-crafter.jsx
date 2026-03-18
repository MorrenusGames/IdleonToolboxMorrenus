import React, { useContext } from 'react';
import { Typography } from '@mui/material';
import { AppContext } from 'components/common/context/AppProvider';
import { NextSeo } from 'next-seo';
import SlabCrafter from '@components/tools/slab-crafter/SlabCrafter';

export default function SlabCrafterPage() {
  const { state } = useContext(AppContext);

  return (
    <>
      <NextSeo
        title="Slab Crafter | Idleon Toolbox"
        description="Plan crafting batches for missing slab items with material tracking"
      />
      {!state?.characters && !state?.account
        ? <Typography component={'div'} sx={{ mb: 2 }} variant={'caption'}>* This tool will work better if you're logged in</Typography>
        : null}
      <SlabCrafter
        account={state?.account}
        characters={state?.characters || []}
      />
    </>
  );
}
