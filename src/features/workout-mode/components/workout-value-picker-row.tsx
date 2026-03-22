/**
 * Inline workout value picker.
 *
 * CALLING SPEC:
 * - render inside the focused set hero when `weight` or `reps` is active
 * - takes over the value row with a full-width horizontal wheel rail
 * - lets the user switch between `weight` and `reps` without leaving the row
 * - updates the selected value when scrolling settles on a new item or is tapped
 * - side effects: none
 */

import WheelPicker, {
  type PickerItem,
  type RenderListProps,
} from '@quidone/react-native-wheel-picker';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ScrollView } from 'react-native';
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';

import {
  Body,
  Heading,
  InteractivePressable,
  Label,
  Surface,
} from '@shared/components';

export type WorkoutValueField = 'weight' | 'reps';

const PICKER_ITEM_WIDTH = 96;
const PICKER_CARD_HEIGHT = 80;
const MIN_SIDE_PADDING = 16;

type PickerListRef = {
  scrollToIndex: (params: { index: number; animated: boolean }) => void;
};

type WheelValueItem = PickerItem<number> & {
  label: string;
};

function formatValue(field: WorkoutValueField, value: number): string {
  return field === 'weight' ? `${value} lbs` : String(value);
}

function getHeading(field: WorkoutValueField): string {
  return field === 'weight' ? 'Adjust Weight' : 'Adjust Reps';
}

interface HorizontalWheelListProps extends Omit<
  RenderListProps<WheelValueItem>,
  'ref'
> {
  selectedValue: number;
  onValueScrollSettled: (index: number) => void;
  testID: string;
}

const HorizontalWheelList = React.forwardRef<
  PickerListRef,
  HorizontalWheelListProps
>(function HorizontalWheelList(
  {
    data,
    itemHeight,
    initialIndex,
    scrollOffset,
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
    onScrollStart,
    onScrollEnd,
    contentContainerStyle,
    selectedValue,
    onValueScrollSettled,
    testID,
  },
  forwardedRef,
) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const lastOffsetRef = useRef(initialIndex * itemHeight);

  const horizontalPadding = useMemo(
    () => Math.max((containerWidth - itemHeight) / 2, MIN_SIDE_PADDING),
    [containerWidth, itemHeight],
  );

  const scrollToIndex = useCallback(
    ({ index, animated }: { index: number; animated: boolean }) => {
      scrollViewRef.current?.scrollTo({
        x: index * itemHeight,
        y: 0,
        animated,
      });
    },
    [itemHeight],
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToIndex,
    }),
    [scrollToIndex],
  );

  const initialOffset = useMemo(
    () => ({
      x: initialIndex * itemHeight,
      y: 0,
    }),
    [initialIndex, itemHeight],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent): void => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [
          {
            nativeEvent: {
              contentOffset: {
                x: scrollOffset,
              },
            },
          },
        ],
        {
          useNativeDriver: true,
          listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            lastOffsetRef.current = event.nativeEvent.contentOffset.x;
          },
        },
      ),
    [scrollOffset],
  );

  const finishScroll = useCallback((): void => {
    onValueScrollSettled(Math.round(lastOffsetRef.current / itemHeight));
    onTouchEnd();
    onScrollEnd();
  }, [itemHeight, onScrollEnd, onTouchEnd, onValueScrollSettled]);

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const velocityX = event.nativeEvent.velocity?.x ?? 0;

      if (Math.abs(velocityX) > 0.05) {
        return;
      }

      finishScroll();
    },
    [finishScroll],
  );

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      horizontal
      testID={testID}
      showsHorizontalScrollIndicator={false}
      scrollEnabled
      bounces={false}
      decelerationRate="fast"
      scrollEventThrottle={16}
      snapToInterval={itemHeight}
      snapToAlignment="start"
      disableIntervalMomentum
      nestedScrollEnabled
      removeClippedSubviews={false}
      contentOffset={initialOffset}
      contentContainerStyle={[
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: 12,
        },
        contentContainerStyle,
      ]}
      onLayout={handleLayout}
      onScroll={onScroll}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onScrollBeginDrag={onScrollStart}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollEnd={finishScroll}
    >
      {data.map((item: WheelValueItem, index: number) => {
        const isSelected = item.value === selectedValue;

        return (
          <View
            key={`${item.value}-${index}`}
            style={{ width: itemHeight, height: PICKER_CARD_HEIGHT }}
          >
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.label}`}
              className="px-1"
              onPress={() => {
                lastOffsetRef.current = index * itemHeight;
                scrollToIndex({ index, animated: true });
              }}
            >
              <View
                className={`h-full items-center justify-center rounded-[20px] border ${
                  isSelected
                    ? 'border-accent bg-accent'
                    : 'border-surface-border bg-surface-elevated'
                }`}
              >
                <Body
                  className={`font-semibold ${
                    isSelected ? 'text-accent-foreground' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </Body>
              </View>
            </InteractivePressable>
          </View>
        );
      })}
    </Animated.ScrollView>
  );
});

export interface WorkoutValuePickerRowProps {
  field: WorkoutValueField;
  options: number[];
  weightValue: number;
  repsValue: number;
  selectedValue: number;
  onFieldChange: (field: WorkoutValueField) => void;
  onChange: (value: number) => void;
}

export function WorkoutValuePickerRow({
  field,
  options,
  weightValue,
  repsValue,
  selectedValue,
  onFieldChange,
  onChange,
}: WorkoutValuePickerRowProps): React.JSX.Element {
  const latestValueRef = React.useRef(selectedValue);

  const data = useMemo<WheelValueItem[]>(
    () =>
      options.map((value) => ({
        value,
        label: formatValue(field, value),
      })),
    [field, options],
  );

  useEffect(() => {
    latestValueRef.current = selectedValue;
  }, [selectedValue]);

  const handleValueChange = (nextValue: number): void => {
    if (nextValue === latestValueRef.current) {
      return;
    }

    latestValueRef.current = nextValue;
    onChange(nextValue);
  };

  const handleSettleIndex = (nextIndex: number): void => {
    const normalizedIndex = Math.max(
      0,
      Math.min(nextIndex, options.length - 1),
    );
    const nextValue = options[normalizedIndex];

    if (nextValue === undefined) {
      return;
    }

    handleValueChange(nextValue);
  };

  return (
    <View>
      <View className="flex-row gap-2 px-1">
        {(['weight', 'reps'] as WorkoutValueField[]).map((candidateField) => {
          const isActive = candidateField === field;

          return (
            <InteractivePressable
              key={candidateField}
              accessibilityRole="button"
              accessibilityLabel={`Adjust ${candidateField}`}
              className={`flex-1 items-center rounded-[18px] px-3 py-3 ${
                isActive ? 'bg-accent' : 'bg-surface-elevated'
              }`}
              onPress={() => onFieldChange(candidateField)}
            >
              <Label
                className={isActive ? 'text-accent-foreground' : 'text-muted'}
              >
                {candidateField === 'weight' ? 'Weight' : 'Reps'}
              </Label>
              <Heading
                className={`mt-1 text-3xl ${
                  isActive ? 'text-accent-foreground' : 'text-foreground'
                }`}
              >
                {formatValue(
                  candidateField,
                  candidateField === 'weight' ? weightValue : repsValue,
                )}
              </Heading>
            </InteractivePressable>
          );
        })}
      </View>

      <Surface className="mt-4 rounded-[24px] px-3 py-4">
        <View className="px-2">
          <Label>{getHeading(field)}</Label>
          <Heading className="mt-1 text-3xl">
            {formatValue(field, selectedValue)}
          </Heading>
        </View>

        <WheelPicker
          data={data}
          value={selectedValue}
          width="100%"
          itemHeight={PICKER_ITEM_WIDTH}
          visibleItemCount={1}
          enableScrollByTapOnItem={false}
          renderOverlay={null}
          renderList={(props) => (
            <HorizontalWheelList
              {...props}
              selectedValue={selectedValue}
              testID={`${field}-wheel-list`}
              onValueScrollSettled={handleSettleIndex}
            />
          )}
          onValueChanged={({ item }) => handleValueChange(item.value)}
        />
      </Surface>
    </View>
  );
}
