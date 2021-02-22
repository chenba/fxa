/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Customer } from '../store/types';

export const hasSubscriptions = (c: Customer) =>
  c && c.subscriptions.length > 0;

export const hasExistingCard = (c: Customer | null | undefined) =>
  c && c.last4 && hasSubscriptions(c);

export default { hasSubscriptions, hasExistingCard };
