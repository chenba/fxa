/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import SurveyTargeter from 'lib/survey-targeter';
import { assert } from 'chai';
import sinon from 'sinon';

const sandbox = sinon.createSandbox();
const trueFn = sandbox.stub().returns(true);
const nullFn = sandbox.stub().returns(null);

function storageMock() {
  const storage = {};

  return {
    setItem: function(key, value) {
      storage[key] = value || '';
    },
    getItem: function(key) {
      return key in storage ? storage[key] : null;
    },
    removeItem: function(key) {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: function(i) {
      const keys = Object.keys(storage);
      return keys[i] || null;
    },
  };
}

describe('lib/SurveyTargeter', () => {
  let surveyTargeter;

  beforeEach(() => {
    surveyTargeter = new SurveyTargeter({
      window: {
        localStorage: storageMock(),
        navigator: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0',
        },
      },
      relier: {
        get: nullFn,
      },
      user: {
        getSignedInAccount: trueFn,
      },
      config: {
        enabled: true,
        surveys: [
          {
            id: 'portugese-speaking-mobile-users-in-southern-hemisphere',
            conditions: {},
            view: 'settings',
            rate: 0.1,
            url: 'https://www.surveygizmo.com/s3/5541940/pizza',
          },
        ],
        doNotBotherSpan: 2592000000,
      },
    });
  });

  it('surveyTargeter returns a survey if the view matches', async () => {
    const view = await surveyTargeter.getSurvey('settings');
    assert.isTrue(view);
  });

  it('surveyTargeter sets "lastSurvey" in localStorage if view returns', async () => {
    await surveyTargeter.getSurvey('settings');
    assert.isDefined(surveyTargeter._storage.get('lastSurvey'));
  });

  it('surveyTargeter returns false if view does not match', async () => {
    const view = await surveyTargeter.getSurvey('non-view');
    assert.isFalse(view);
  });
});
