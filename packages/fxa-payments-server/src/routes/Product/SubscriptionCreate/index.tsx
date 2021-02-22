import React, {
  useState,
  useCallback,
  useContext,
  useEffect,
  Suspense,
} from 'react';
import { Stripe } from '@stripe/stripe-js';
import classNames from 'classnames';
import { Plan, Profile, Customer } from '../../../store/types';
import { State as ValidatorState } from '../../../lib/validator';

import { useNonce } from '../../../lib/hooks';
import { getErrorMessage } from '../../../lib/errors';

import PlanDetails from '../../../components/PlanDetails';
import Header from '../../../components/Header';
import PaymentForm, { PaymentFormProps } from '../../../components/PaymentForm';
import ErrorMessage from '../../../components/ErrorMessage';
import AcceptedCards from '../../Product/AcceptedCards';
import PaymentLegalBlurb from '../../../components/PaymentLegalBlurb';
import { SubscriptionTitle } from '../../../components/SubscriptionTitle';
import { TermsAndPrivacy } from '../../../components/TermsAndPrivacy';
import { PaymentProcessing } from '../../../components/PaymentProcessing';

import * as Amplitude from '../../../lib/amplitude';
import { Localized } from '@fluent/react';
import * as apiClient from '../../../lib/apiClient';

import { AppContext } from '../../../lib/AppContext';

import '../../Product/SubscriptionCreate/index.scss';

import { ButtonBaseProps } from '../../Product/PayPalButton';
import { hasPaymentProvider } from '../../../lib/PaymentProvider';
import {
  handleSubscriptionPayment,
  PaymentError,
  RetryStatus,
} from '../../../lib/stripe';
const PaypalButton = React.lazy(() => import('../../Product/PayPalButton'));

export type SubscriptionCreateStripeAPIs = Pick<
  Stripe,
  'createPaymentMethod' | 'confirmCardPayment'
>;

export type SubscriptionCreateAuthServerAPIs = Pick<
  typeof apiClient,
  | 'apiCreateCustomer'
  | 'apiCreateSubscriptionWithPaymentMethod'
  | 'apiRetryInvoice'
  | 'apiDetachFailedPaymentMethod'
>;

export type SubscriptionCreateProps = {
  isMobile: boolean;
  profile: Profile;
  customer: Customer | null;
  selectedPlan: Plan;
  refreshSubscriptions: () => void;
  validatorInitialState?: ValidatorState;
  paymentErrorInitialState?: PaymentError;
  stripeOverride?: SubscriptionCreateStripeAPIs;
  apiClientOverrides?: Partial<SubscriptionCreateAuthServerAPIs>;
  paypalButtonBase?: React.FC<ButtonBaseProps>;
};

export const SubscriptionCreate = ({
  isMobile,
  profile,
  customer,
  selectedPlan,
  refreshSubscriptions,
  validatorInitialState,
  paymentErrorInitialState,
  stripeOverride,
  apiClientOverrides = {},
  paypalButtonBase,
}: SubscriptionCreateProps) => {
  const [submitNonce, refreshSubmitNonce] = useNonce();
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  const onFormMounted = useCallback(
    () => Amplitude.createSubscriptionMounted(selectedPlan),
    [selectedPlan]
  );

  const onFormEngaged = useCallback(
    () => Amplitude.createSubscriptionEngaged(selectedPlan),
    [selectedPlan]
  );

  const { config } = useContext(AppContext);

  const [paypalScriptLoaded, setPaypalScriptLoaded] = useState(false);

  useEffect(() => {
    if (!config.featureFlags.usePaypalUIByDefault) {
      return;
    }

    if (paypalButtonBase) {
      setPaypalScriptLoaded(true);
      return;
    }

    // Read nonce from the fxa-paypal-csp-nonce meta tag
    const cspNonceMetaTag = document?.querySelector(
      'meta[name="fxa-paypal-csp-nonce"]'
    );
    const cspNonce = JSON.parse(
      decodeURIComponent(cspNonceMetaTag?.getAttribute('content') || '""')
    );

    const script = document.createElement('script');
    script.src = `${config.paypal.scriptUrl}/sdk/js?client-id=${config.paypal.clientId}&vault=true&commit=false&intent=capture&disable-funding=credit,card`;
    // Pass the csp nonce to paypal
    script.setAttribute('data-csp-nonce', cspNonce);
    /* istanbul ignore next */
    script.onload = () => {
      setPaypalScriptLoaded(true);
    };
    /* istanbul ignore next */
    script.onerror = () => {
      throw new Error('Paypal SDK could not be loaded.');
    };
    document.body.appendChild(script);
  }, []);

  const [inProgress, setInProgress] = useState(false);

  const [paymentError, setPaymentError] = useState<PaymentError>(
    paymentErrorInitialState
  );
  const [retryStatus, setRetryStatus] = useState<RetryStatus>();

  // clear any error rendered with `ErrorMessage` on form change
  const onChange = useCallback(() => {
    if (paymentError) {
      setPaymentError(undefined);
    }
  }, [paymentError, setPaymentError]);

  const onStripeFormSubmit: PaymentFormProps['onSubmit'] = useCallback(
    async ({ stripe: stripeFromParams, ...params }) => {
      setInProgress(true);
      try {
        await handleSubscriptionPayment({
          ...params,
          ...apiClient,
          ...apiClientOverrides,
          stripe:
            stripeOverride /* istanbul ignore next - used for testing */ ||
            stripeFromParams,
          selectedPlan,
          customer,
          retryStatus,
          onSuccess: refreshSubscriptions,
          onFailure: setPaymentError,
          onRetry: (status: RetryStatus) => {
            setRetryStatus(status);
            setPaymentError({ type: 'card_error', code: 'card_declined' });
          },
        });
      } catch (error) {
        console.error('handleSubscriptionPayment failed', error);
        setPaymentError(error);
      }
      setInProgress(false);
      refreshSubmitNonce();
    },
    [
      selectedPlan,
      customer,
      retryStatus,
      apiClientOverrides,
      stripeOverride,
      setInProgress,
      refreshSubscriptions,
      refreshSubmitNonce,
      setPaymentError,
      setRetryStatus,
    ]
  );

  return (
    <>
      <Header {...{ profile }} />
      <div className="main-content">
        <PaymentProcessing
          provider="paypal"
          className={classNames({
            hidden: !transactionInProgress,
          })}
        />
        <SubscriptionTitle
          screenType="create"
          className={classNames({
            hidden: transactionInProgress,
          })}
        />
        <div
          className={classNames('product-payment', {
            hidden: transactionInProgress,
          })}
          data-testid="subscription-create"
        >
          {!hasPaymentProvider(customer) && (
            <>
              {paypalScriptLoaded && (
                <>
                  <div
                    className="subscription-create-pay-with-other"
                    data-testid="pay-with-other"
                  >
                    <Suspense fallback={<div>Loading...</div>}>
                      <Localized id="pay-with-heading-other">
                        <p className="pay-with-heading">
                          Select payment option
                        </p>
                      </Localized>
                      <div className="paypal-button">
                        <PaypalButton
                          apiClientOverrides={apiClientOverrides}
                          currencyCode={selectedPlan.currency}
                          customer={customer}
                          idempotencyKey={submitNonce}
                          priceId={selectedPlan.plan_id}
                          refreshSubscriptions={refreshSubscriptions}
                          setPaymentError={setPaymentError}
                          ButtonBase={paypalButtonBase}
                          setTransactionInProgress={setTransactionInProgress}
                        />
                      </div>
                    </Suspense>
                  </div>
                  <div>
                    <Localized id="pay-with-heading-card-or">
                      <p className="pay-with-heading">Or pay with card</p>
                    </Localized>
                    <AcceptedCards />
                  </div>
                </>
              )}
              {!paypalScriptLoaded && (
                <div>
                  <Localized id="pay-with-heading-card-only">
                    <p className="pay-with-heading">Pay with card</p>
                  </Localized>
                  <AcceptedCards />
                </div>
              )}
            </>
          )}

          {hasPaymentProvider(customer) && (
            <Localized id="pay-with-heading-saved">
              <p className="pay-with-heading">Use saved payment option</p>
            </Localized>
          )}

          <div>
            <h3 className="billing-title">
              <Localized id="sub-update-payment-title">
                <span className="title">Payment information</span>
              </Localized>
            </h3>

            <ErrorMessage isVisible={!!paymentError}>
              {paymentError && (
                <Localized id={getErrorMessage(paymentError.code || 'UNKNOWN')}>
                  <p data-testid="error-payment-submission">
                    {getErrorMessage(paymentError.code || 'UNKNOWN')}
                  </p>
                </Localized>
              )}
            </ErrorMessage>

            <PaymentForm
              {...{
                customer,
                submitNonce,
                onSubmit: onStripeFormSubmit,
                onChange,
                inProgress,
                validatorInitialState,
                confirm: true,
                plan: selectedPlan,
                onMounted: onFormMounted,
                onEngaged: onFormEngaged,
              }}
            />
          </div>
          <div className="subscription-create-footer">
            <PaymentLegalBlurb />
            {selectedPlan && <TermsAndPrivacy plan={selectedPlan} />}
          </div>
        </div>
        <PlanDetails
          {...{
            className: classNames('default', {
              hidden: transactionInProgress && isMobile,
            }),
            profile,
            selectedPlan,
            isMobile,
            showExpandButton: isMobile,
          }}
        />
      </div>
    </>
  );
};

export default SubscriptionCreate;
