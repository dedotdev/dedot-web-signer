import { FC } from 'react';
import { GitHub, Twitter } from '@mui/icons-material';
import { Container } from '@mui/material';
import { Props } from 'types';

const MainFooter: FC<Props> = ({ className = '' }) => {
  return (
    <footer className={`${className} border-t border-black/10 dark:border-white/15`}>
      <Container maxWidth='sm'>
        <div className='flex flex-col sm:flex-row justify-between items-center py-4 gap-4 max-w-[800px] mx-auto'>
          <span className='text-sm'>Copyright &copy; 2025 <a href="https://dedot.dev" className='text-inherit' target='_blank'>dedot.dev</a></span>
          <div className='flex gap-4'>
            <a href='https://x.com/realsinzii' target='_blank'>
              <Twitter
                className='block text-gray-600 hover:text-gray-800 dark:text-gray-300 hover:dark:text-gray-100'
                fontSize='medium'
              />
            </a>
            <a href='https://github.com/dedotdev/dedot-web-signer' target='_blank'>
              <GitHub
                className='block text-gray-600 hover:text-gray-800 dark:text-gray-300 hover:dark:text-gray-100'
                fontSize='medium'
              />
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default MainFooter;
