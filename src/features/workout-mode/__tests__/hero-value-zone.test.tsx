import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { HeroValueZone } from '../components/hero-value-zone';

void React;

jest.mock('@quidone/react-native-wheel-picker', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  const MockWheelPicker = ({
    value,
    onValueChanging,
    onValueChanged,
    testID,
  }: {
    value: number;
    onValueChanging?: (event: { item: { value: number } }) => void;
    onValueChanged?: (event: { item: { value: number } }) => void;
    testID?: string;
  }) => {
    React.useEffect(() => {
      onValueChanging?.({ item: { value: value + 1 } });
    }, [onValueChanging, value]);

    return (
      <ReactNative.Pressable
        testID={`${testID}-commit`}
        onPress={() => onValueChanged?.({ item: { value } })}
      />
    );
  };

  return {
    __esModule: true,
    default: MockWheelPicker,
  };
});

describe('HeroValueZone', () => {
  it('ignores programmatic sync change events and commits only settled values', () => {
    const onCommitValue = jest.fn();

    const { rerender } = render(
      <HeroValueZone
        field="weight"
        value={90}
        options={[85, 90, 95, 100]}
        onCommitValue={onCommitValue}
      />,
    );

    rerender(
      <HeroValueZone
        field="weight"
        value={95}
        options={[90, 95, 100, 105]}
        onCommitValue={onCommitValue}
      />,
    );

    expect(onCommitValue).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('hero-zone-weight-wheel-commit'));
    expect(onCommitValue).toHaveBeenCalledWith(95);
  });
});
