import React, { useContext } from 'react';
import { Typography } from '@mui/material';
import { AppContext } from 'components/common/context/AppProvider';
import { NextSeo } from 'next-seo';
import ToolChecker from '@components/tools/tool-checker/ToolChecker';

export default function ToolCheckerPage() {
  const { state } = useContext(AppContext);

  return (
    <>
      <NextSeo
        title="Tool Checker | Idleon Toolbox"
        description="Check tool upgrades, swap recommendations, and material needs per skill"
      />
      {!state?.characters && !state?.account
        ? <Typography component={'div'} sx={{ mb: 2 }} variant={'caption'}>* This tool will work better if you're logged in</Typography>
        : null}
      <ToolChecker
        characters={state?.characters || []}
        account={state?.account}
      />
    </>
  );
}
