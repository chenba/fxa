import {
  config,
  resetConfig,
  decodeConfig,
  updateConfig,
  readConfigFromMeta,
  META_CONFIG,
  META_FEATURE_FLAGS,
  META_FLOW_METRICS_DATA,
} from './config';

beforeEach(resetConfig);

describe('decodeConfig', () => {
  const subject = (content: string) => () => decodeConfig(content);

  it('decodes URI-encoded JSON', () => {
    expect(subject(encodedConfig)()).toEqual(mockConfig);
  });

  it('throws an error on empty input', () => {
    expect(subject('')).toThrow(Error);
  });

  it('throws an error on malformed input', () => {
    expect(subject('this is bad')).toThrow(Error);
  });
});

describe('updateConfig', () => {
  it('merges input with existing config', () => {
    expect(config).not.toEqual(expectedMergedConfig);
    updateConfig(mockConfig);
    expect(config).toEqual({
      ...expectedMergedConfig,
      featureFlags: {},
    });
  });
});

describe('readConfigFromMeta', () => {
  it('throws an error if meta[name="fxa-config"] is missing', () => {
    const headQuerySelector = mkHeadQuerySelector(
      encodedConfig,
      encodedFeatureFlags,
      encodedFlowMetricsData,
      META_CONFIG
    );
    const subject = () => readConfigFromMeta(headQuerySelector);
    expect(subject).toThrow(Error);
  });

  it('throws an error if meta[name="fxa-config"] is empty', () => {
    const headQuerySelector = mkHeadQuerySelector('', '{}', '{}', null);
    const subject = () => readConfigFromMeta(headQuerySelector);
    expect(subject).toThrow(Error);
  });

  it('merges meta[name="fxa-config"] content into config', () => {
    expect(config).not.toEqual(expectedMergedConfig);
    readConfigFromMeta(baseHeadQuerySelector);
    expect(config).toEqual(expectedMergedConfig);
  });

  it('throws an error if meta[name="fxa-feature-flags"] is missing', () => {
    const headQuerySelector = mkHeadQuerySelector(
      encodedConfig,
      encodedFeatureFlags,
      encodedFlowMetricsData,
      META_FEATURE_FLAGS
    );
    const subject = () => readConfigFromMeta(headQuerySelector);
    expect(subject).toThrow(Error);
  });

  it('throws an error if meta[name="fxa-feature-flags"] is empty', () => {
    const headQuerySelector = mkHeadQuerySelector(
      encodedConfig,
      '',
      '{}',
      null
    );
    const subject = () => readConfigFromMeta(headQuerySelector);
    expect(subject).toThrow(Error);
  });

  it('merges meta[name="fxa-feature-flags"] content into config', () => {
    expect(config.featureFlags).not.toEqual(mockFeatureFlags);
    readConfigFromMeta(baseHeadQuerySelector);
    expect(config.featureFlags).toEqual(mockFeatureFlags);
  });

  describe('with flow metrics enabled', () => {
    beforeEach(() => {
      config.metrics.flow.enabled = true;
    });

    it('throws an error if meta[name="fxa-flow-metrics-data"] is missing', () => {
      const headQuerySelector = mkHeadQuerySelector(
        encodedConfig,
        encodedFeatureFlags,
        encodedFlowMetricsData,
        META_FEATURE_FLAGS
      );
      const subject = () => readConfigFromMeta(headQuerySelector);
      expect(subject).toThrow(Error);
    });

    it('throws an error if meta[name="fxa-flow-metrics-data"] is empty', () => {
      const headQuerySelector = mkHeadQuerySelector(
        encodedConfig,
        encodedFeatureFlags,
        '',
        null
      );
      const subject = () => readConfigFromMeta(headQuerySelector);
      expect(subject).toThrow(Error);
    });

    it('merges meta[name="fxa-flow-metrics-data"] content into config', () => {
      expect(config.featureFlags).not.toEqual(mockFeatureFlags);
      readConfigFromMeta(baseHeadQuerySelector);
      expect(config.featureFlags).toEqual(mockFeatureFlags);
    });
  });
});

const mockConfig = {
  servers: {
    content: {
      url: 'http://example.com',
    },
  },
  sample: {
    example: {
      jenny: '8675309',
    },
  },
  legalDocLinks: {
    privacyNotice: 'https://abc.xyz/privacy',
    termsOfService: 'https://abc.xyz/terms',
  },
};

const encodedConfig = encodeURIComponent(JSON.stringify(mockConfig));

const mockFeatureFlags = { foo: 1, bar: true };

const encodedFeatureFlags = encodeURIComponent(
  JSON.stringify(mockFeatureFlags)
);

const encodedFlowMetricsData = encodeURIComponent(
  JSON.stringify({
    flowBeginTime: 11111111,
    flowId: '227c0835a45bee8ecaf7d1340d77f11d336d33e52438162f43ef6a90abe2c442',
  })
);

const expectedMergedConfig = {
  featureFlags: { foo: 1, bar: true },
  sentryDsn: '',
  servers: {
    auth: {
      url: '',
    },
    content: {
      url: 'http://example.com',
    },
    oauth: {
      url: '',
    },
    profile: {
      url: '',
    },
  },
  stripe: {
    apiKey: '',
  },
  lang: '',
  productRedirectURLs: {},
  sample: {
    example: {
      jenny: '8675309',
    },
  },
  legalDocLinks: {
    privacyNotice: 'https://abc.xyz/privacy',
    termsOfService: 'https://abc.xyz/terms',
  },
  metrics: {
    flow: {
      enabled: false,
    },
  },
  flowMetricsData: {
    flowBeginTime: null,
    flowId: null,
  },
};

const headSelector = (name: string | null) => `meta[name="${name}"]`;

const mkHeadQuerySelector = (
  configValue: string | null,
  flagsValue: string | null,
  metricsValue: string | null,
  missing: string | null
) => (selector: string) =>
  selector === headSelector(missing)
    ? null
    : {
        getAttribute: (name: string) => {
          if (name !== 'content') {
            return null;
          }
          switch (selector) {
            case headSelector(META_CONFIG):
              return configValue;
            case headSelector(META_FEATURE_FLAGS):
              return flagsValue;
            case headSelector(META_FLOW_METRICS_DATA):
              return metricsValue;
            default:
              return null;
          }
        },
      };

const baseHeadQuerySelector = mkHeadQuerySelector(
  encodedConfig,
  encodedFeatureFlags,
  encodedFlowMetricsData,
  null
);
