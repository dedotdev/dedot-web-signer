import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import DedotLogo from 'assets/images/dedot-logo.png';
import { Props } from 'types';

const DedotTextLogo: FC<Props> = ({ size = 36 }) => {
  return (
    <Link to='/'>
      <img src={DedotLogo} alt='Dedot Signer' height={size} />
    </Link>
  );
};

export default DedotTextLogo;
