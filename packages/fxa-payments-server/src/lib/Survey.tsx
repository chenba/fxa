import React, { FunctionComponent } from 'react';
import { useLocation } from 'react-router';

export const Survey: FunctionComponent = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/products/prod_FUUNYnlDso7FeB')) {
    return <iframe src="https://www.surveygizmo.com/s3/5541940/pizza" />;
  }
  return <></>;
};
