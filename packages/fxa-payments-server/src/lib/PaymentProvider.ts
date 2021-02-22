/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Customer, PaymentProvider, PaymentProviders } from '../store/types';

export const hasPaymentProvider = (c?: Customer | null) =>
  c && c.payment_provider && c.payment_provider !== PaymentProviders.none;

export const isStripe = (provider?: PaymentProvider) =>
  provider === PaymentProviders.stripe;

export const isPaypal = (provider?: PaymentProvider) =>
  provider === PaymentProviders.paypal;

export default { hasPaymentProvider, isStripe, isPaypal };
