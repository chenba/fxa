/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const { registerSuite } = intern.getInterface('object');
const TestHelpers = require('../lib/helpers');
const FunctionalHelpers = require('./lib/helpers');

const config = intern._config;
const SIGNIN_URL = config.fxaContentRoot + 'signin';
const SUPPORT_URL = config.fxaContentRoot + 'support';
const PASSWORD = 'amazingpassword';

const {
  clearBrowserState,
  createUser,
  fillOutSignIn,
  openPage,
  testElementExists,
} = FunctionalHelpers;

registerSuite('support form without valid session', {
  tests: {
    'go to support form, redirects to signin': function() {
      return this.remote.then(openPage(SUPPORT_URL, '#fxa-signin-header'));
    },
  },
});

registerSuite('support form without active subscriptions', {
  before: function() {
    const email = TestHelpers.createEmail();

    return this.remote
      .then(createUser(email, PASSWORD, { preVerified: true }))
      .then(clearBrowserState())
      .then(openPage(SIGNIN_URL, '#fxa-signin-header'))
      .then(fillOutSignIn(email, PASSWORD))
      .then(testElementExists('#fxa-settings-header'));
  },
  tests: {
    'go to support form, redirects to subscription management': function() {
      return this.remote.then(
        openPage(SUPPORT_URL, '.subscription-management')
      );
    },
  },
});
