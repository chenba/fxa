import React, { useState, useCallback, useContext, useRef } from 'react';
import { render, cleanup, fireEvent, prettyDOM } from '@testing-library/react';
import 'jest-dom/extend-expect';
import { ReactStripeElements } from 'react-stripe-elements';
import { FieldGroup, Form, FormContext, FormContextValue, Field, Input, StripeElement, SubmitButton, Checkbox } from './fields';
import {
  useValidatorState,
  Validator,
  State as ValidatorState,
  MiddlewareReducer as ValidatorMiddlewareReducer,
} from '../lib/validator';

afterEach(cleanup);

describe('Form', () => {
  it('renders a form that provides children with a validator', () => {
    const validatorStateRef = mkValidatorStateRef();
    const { container } = render(
      <TestForm validatorStateRef={validatorStateRef}>
        <Field fieldType="input" name="foo" label="This is a label">
          <p>Hi mom</p>
        </Field>
      </TestForm>
    );
    expect(container.querySelector('form')).not.toBeNull();
    expect(validatorStateRef.current).toEqual({
      "error": null,
      "fields": {
        "foo": {
          "error": null,
          "fieldType": "input",
          "required": false,
          "valid": null,
          "value": null,
        },
      },
    });
  });
});

describe('FieldGroup', () => {
  it('wraps children in className="input-row-group"', () => {
    const { container } = render(
      <FieldGroup>
        <div>Hi mom</div>
      </FieldGroup>
    );
    const groupEl = container.querySelector('.input-row-group');
    expect(groupEl).not.toBeNull();
  })
});

describe('Field', () => {
  it('renders a label when available', () => {
    const { container } = render(
      <TestForm>
        <Field fieldType="input" name="foo" label="This is a label">
          <p>Hi mom</p>
        </Field>
      </TestForm>
    );
    const label = container.querySelector('label .label-text');
    expect(label).not.toBeNull();
    if (label) {
      expect(label.textContent).toEqual('This is a label');
    }
  });

  it('renders a tooltip for errors', () => {
    const Subject = () => {
      const tooltipParentRef = useRef<HTMLDivElement>(null);
      return (
        <TestForm>
          <Field fieldType="input" name="foo" label="This is a label" tooltip={true} tooltipParentRef={tooltipParentRef}>
            <p ref={tooltipParentRef}>Hi mom</p>
          </Field>
          <TestValidatorFn fn={validator => {
            validator.updateField({ name: 'foo', value: 'bar', valid: false, error: 'This is an error' })
          }} />
        </TestForm>
      );
    };
    const { container, queryAllByTestId } = render(<Subject />);
    queryAllByTestId('execute').forEach(fireEvent.click);
    const tooltip = container.querySelector('aside.tooltip');
    expect(tooltip).not.toBeNull();
  });

  it('registers a field with validator state', () => {
    const validatorStateRef = mkValidatorStateRef();
    render(
      <TestForm validatorStateRef={validatorStateRef}>
        <Field fieldType="input" name="foo">
          <p>Hi mom</p>
        </Field>
      </TestForm>
    );
    expect(validatorStateRef.current.fields.foo).toEqual({
      fieldType: "input",
      required: false,
      value: null, 
      valid: null,
      error: null
    });
  });
});

describe('Input', () => {
  it('enforces non-empty content in required fields', () => {
    const validatorStateRef = mkValidatorStateRef();
    const { getByTestId } = render(
      <TestForm validatorStateRef={validatorStateRef}>
        <Input data-testid="input-1" type="text" name="input-1" required initialValue="bar" />
        <Input data-testid="input-2" type="text" name="input-2" required />
      </TestForm>
    );
    
    fireEvent.change(getByTestId('input-1'), { target: { value: '' } });
    fireEvent.blur(getByTestId('input-2'));

    expect(validatorStateRef.current).toEqual({
      'error': null,
      'fields': {
        'input-1': {
          'fieldType': 'input',
          'required': true,
          'value': '',
          'valid': true,
          'error': 'This field is required'
        },
        'input-2': {
          'fieldType': 'input',
          'required': true,
          'value': '',
          'valid': true,
          'error': 'This field is required'
        }
      }
    });
  });

  it('accepts a function to validate on change', () => {
    const validate = jest.fn((value: string) => {
      return {
        value: `bar ${value}`,
        error: 'bad thing'
      };
    });

    const validatorStateRef = mkValidatorStateRef();
    const { getByTestId } = render(
      <TestForm validatorStateRef={validatorStateRef}>
        <Input data-testid="testInput" type="text" name="foo" onValidate={validate} />
      </TestForm>
    );
    
    fireEvent.change(
      getByTestId('testInput'),
      { target: { value: 'xyzzy' } }
    );
    
    expect(validate).toBeCalledWith('xyzzy');

    expect(validatorStateRef.current).toEqual({
      error: null,
      fields: {
        foo: {
          fieldType: 'input',
          required: false,
          // validate function can alter value
          value: 'bar xyzzy',
          // validate function can set error and valid state
          valid: false,
          error: 'bad thing'
        }
      }
    });
  });

  it('adds an "invalid" class name when invalid', () => {
    const validate = (value: string) => ({ value: 'bar', error: 'bad thing' });
    const { container, getByTestId } = render(
      <TestForm>
        <Input data-testid="testInput" type="text" name="foo" onValidate={validate} />
      </TestForm>
    );    
    fireEvent.change(getByTestId('testInput'), { target: { value: 'xyzzy' } });
    expect(container.querySelector('input.invalid')).not.toBeNull();
  });
});

describe('StripeElement', () => {
  type MockStripeElementProps = {
    id?: string,
    className?: string,
    onChange: Function,
    onBlur: Function,
    onFocus: Function,
    onReady: Function,
  };

  const buildMockStripeElement = (value: any) => (
    class extends React.Component<MockStripeElementProps> {
      constructor(props: MockStripeElementProps) {
        super(props);
      }
      handleClick = (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        ev.preventDefault();
        this.props.onChange(value);
      };
      render() {
        return <button data-testid="mockStripe" onClick={this.handleClick} />
      }
    }
  );

  it('handles error result from contained stripe element', () => {
    const MockStripeElement = buildMockStripeElement({
      error: { message: 'game over man' }
    });
    const validatorStateRef = mkValidatorStateRef();
    const { container, getByTestId } = render(
      <TestForm validatorStateRef={validatorStateRef}>
        <StripeElement name="input-1" component={MockStripeElement} />
      </TestForm>
    );

    fireEvent.click(getByTestId('mockStripe'));

    const tooltipEl = container.querySelector('aside.tooltip');
    expect(tooltipEl).not.toBeNull();
    if (tooltipEl) {
      expect(tooltipEl.textContent).toContain('game over man');
    }

    expect(validatorStateRef.current).toEqual({
      error: null,
      fields: {
        'input-1': {
          fieldType: 'stripe',
          required: false,
          value: {
            error: {
              message: 'game over man'
            }
          },
          valid: false,
          error: 'game over man'
        }
      }
    });
  });

  it('handles complete result from contained stripe element', () => {
    const MockStripeElement = buildMockStripeElement({ complete: true });
    const validatorStateRef = mkValidatorStateRef();
    const { container, getByTestId } = render(
      <TestForm validatorStateRef={validatorStateRef}>
        <StripeElement name="input-1" component={MockStripeElement} />
      </TestForm>
    );

    fireEvent.click(getByTestId('mockStripe'));

    const tooltipEl = container.querySelector('aside.tooltip');
    expect(tooltipEl).toBeNull();

    expect(validatorStateRef.current).toEqual({
      error: null,
      fields: {
        'input-1': {
          fieldType: 'stripe',
          required: false,
          value: { complete: true },
          valid: true,
          error: null
        }
      }
    });
  });
});

describe('Checkbox', () => {
  it('renders its own label', () => {
    const { container } = render(
      <TestForm>
        <Checkbox name="foo" label="nice label" />
      </TestForm>    
    );
    const label = container.querySelector('span.label-text.checkbox');
    expect(label).not.toBeNull();
    if (label) {
      expect(label.textContent).toContain('nice label');
    }
  });

  it('must be checked to be valid when required', () => {
    const validatorStateRef = mkValidatorStateRef();
    const { getByTestId } = render(
      <TestForm validatorStateRef={validatorStateRef}>
        <Checkbox data-testid="checkbox" name="foo" required />
      </TestForm>
    );

    const checkbox = getByTestId('checkbox');
    
    fireEvent.click(checkbox);
    expect(validatorStateRef.current).toEqual({
      "error": null,
      "fields": {
        "foo": {
          "fieldType": "input",
          "required": true,
          "value": true,
          "valid": true,
          "error": null
        }
      }
    });
    
    fireEvent.click(checkbox);
    expect(validatorStateRef.current).toEqual({
      "error": null,
      "fields": {
        "foo": {
          "fieldType": "input",
          "required": true,
          "value": false,
          "valid": false,
          "error": null
        }
      }
    });
  });
});

describe('SubmitButton', () => {
  it('is disabled if all required fields are not valid', () => {
    const Subject = () => {
      return (
        <TestForm>
          <SubmitButton data-testid="submit" name="submit">Submit</SubmitButton>
          <Input name="foo" required />
          <TestValidatorFn fn={validator => {
            validator.updateField({ name: 'foo', value: 'bar', valid: false, error: 'This is an error' })
          }} />
          <TestValidatorFn fn={validator => {
            validator.updateField({ name: 'foo', value: 'baz', valid: true })
          }} />
        </TestForm>
      );
    };
    const { queryAllByTestId, getByTestId } = render(<Subject />);
    const validatorFns = queryAllByTestId('execute');

    fireEvent.click(validatorFns[0]);
    expect(getByTestId('submit')).toHaveAttribute('disabled');

    fireEvent.click(validatorFns[1]);
    expect(getByTestId('submit')).not.toHaveAttribute('disabled');
  });
});

const mkValidatorStateRef = () =>
  React.createRef() as React.MutableRefObject<ValidatorState>;

const TestForm = ({
  children,
  validatorStateRef,
} : {
  children: React.ReactNode,
  validatorStateRef?: React.MutableRefObject<ValidatorState>,
}) => {
  const middleware: ValidatorMiddlewareReducer = (state, action, next) => {
    const nextState = next(state, action);
    if (validatorStateRef) {
      validatorStateRef.current = nextState;
    }
    return nextState;
  };
  const validator = useValidatorState({ middleware });
  return (
    <Form validator={validator}>
      {children}
    </Form>
  );
};

const TestValidatorFn = ({ fn }: { fn: (validator: Validator) => any }) => {
  const { validator } = useContext(FormContext) as FormContextValue;      
  const [ result, setResult ] = useState('');
  const onClick = useCallback(
    (ev) => {
      ev.preventDefault();
      setResult(JSON.stringify(fn(validator)));
    },
    [ setResult, fn, validator ]
  );
  return (
    <div>
      <button data-testid="execute" onClick={onClick}>Execute</button>
      <pre data-testid="result">{result}</pre>
    </div>
  )
};