import React, { useContext } from 'react';
import { Typography } from '@mui/material';
import { AppContext } from 'components/common/context/AppProvider';
import { NextSeo } from 'next-seo';
import BagChecker from '@components/tools/bag-checker/BagChecker';

export default function BagCheckerPage() {
  const { state } = useContext(AppContext);

  return (
    <>
      <NextSeo
        title="Bag Checker | Idleon Toolbox"
        description="Check bag upgrades and material needs for all characters"
      />
      {!state?.characters && !state?.account
        ? <Typography component={'div'} sx={{ mb: 2 }} variant={'caption'}>* This tool will work better if you're logged in</Typography>
        : null}
      <BagChecker
        characters={state?.characters || []}
        account={state?.account}
      />
    </>
  );
}
