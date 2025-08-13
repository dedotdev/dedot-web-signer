import React, { FC } from 'react';
import { Container, styled } from '@mui/material';
import LockWalletButton from 'components/shared/LockWalletButton';
import ResetWalletButton from 'components/shared/ResetWalletButton';
import DedotSignerTextLogo from 'components/shared/misc/DedotTextLogo';
import SettingsWalletButton from 'components/shared/settings/SettingsWalletButton';
import { Props } from 'types';

interface MainLayoutProps extends Props {
  headerActions?: boolean;
}

const MainHeader: FC<MainLayoutProps> = ({ className = '', headerActions }) => {
  return (
    <header className={`${className} main-header border-b border-black/10 dark:bg-black/30 dark:border-white/15`}>
      <Container maxWidth='sm'>
        <div className='main-header__inner'>
          <DedotSignerTextLogo />
          {headerActions && (
            <div className='main-header__actions'>
              {!import.meta.env.PROD && <ResetWalletButton />}
              <LockWalletButton />
              <SettingsWalletButton />
            </div>
          )}
        </div>
      </Container>
    </header>
  );
};

export default styled(MainHeader)`
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.8);

  img {
    height: 34px;
    display: block;
  }

  .main-header__inner {
    height: 64px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .main-header__actions {
    flex-grow: 1;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;

    &:empty {
      display: none;
    }
  }
`;
