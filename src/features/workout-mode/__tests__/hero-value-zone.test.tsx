import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { HeroValueZone } from '../components/hero-value-zone';

jest.mock('@quidone/react-native-wheel-picker', () => {
  const ReactNative = require('react-native');

  return {
    __esModule: true,
    default: ({
      onValueChanging,
      onValueChanged,
      _onScrollStart,
      _onScrollEnd,
    }: {
      onValueChanging?: (event: { item: { value: number } }) => void;
      onValueChanged?: (event: { item: { value: number } }) => void;
      _onScrollStart?: () => void;
      _onScrollEnd?: () => void;
    }) => (
      <ReactNative.View>
        <ReactNative.Pressable
          testID="wheel-programmatic-change"
          onPress={() => onValueChanging?.({ item: { value: 95 } })}
        />
        <ReactNative.Pressable
          testID="wheel-user-change"
          onPress={() => {
            _onScrollStart?.();
            onValueChanging?.({ item: { value: 100 } });
            _onScrollEnd?.();
          }}
        />
        <ReactNative.Pressable
          testID="wheel-value-changed"
          onPress={() => onValueChanged?.({ item: { value: 100 } })}
        />
      </ReactNative.View>
    ),
  };
});

describe('HeroValueZone', () => {
  it('ignores non-user preview events while still committing value changes', () => {
    const onPreviewValue = jest.fn();
    const onCommitValue = jest.fn();

    render(
      <HeroValueZone
        field="weight"
        value={90}
        options={[85, 90, 95, 100]}
        onPreviewValue={onPreviewValue}
        onCommitValue={onCommitValue}
      />,
    );

    fireEvent.press(screen.getByTestId('wheel-programmatic-change'));
    expect(onPreviewValue).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('wheel-user-change'));
    expect(onPreviewValue).toHaveBeenCalledWith(100);

    fireEvent.press(screen.getByTestId('wheel-value-changed'));
    expect(onCommitValue).toHaveBeenCalledWith(100);
  });
});
