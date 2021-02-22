/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable camelcase */

import React from 'react';
import { Localized } from '@fluent/react';
import { Customer } from '../../store/types';
import PaymentProvider from '../../lib/PaymentProvider';

import './index.scss';

type PaymentProviderDetailsProps = {
  customer: Customer;
};

export const PaymentProviderDetails = ({
  customer,
}: PaymentProviderDetailsProps) => {
  const { brand, last4, payment_provider } = customer;

  return (
    <>
      {PaymentProvider.isStripe(payment_provider) && brand && last4 && (
        <Localized id="payment-confirmation-cc-card-ending-in" vars={{ last4 }}>
          <div
            data-testid="card-logo-and-last-four"
            className={`c-card ${brand.toLowerCase()}`}
          >
            Card ending in {last4}
          </div>
        </Localized>
      )}
      {PaymentProvider.isPaypal(payment_provider) && (
        <div className="paypal-logo" data-testid="paypal-logo">
          {payment_provider}
        </div>
      )}
    </>
  );
};

export default PaymentProviderDetails;
