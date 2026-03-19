import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { Body } from '@shared/components';
import type { ActiveWorkoutSet } from '../types';
import {
  SWIPE_ACTION_WIDTH,
  parseDecimalNumber,
  parseWholeNumber,
} from '../utils/formatters';

export function WorkoutSetRow({
  exerciseName,
  setItem,
  index,
  onDelete,
  onUpdateReps,
  onUpdateWeight,
  onToggleLogged,
}: {
  exerciseName: string;
  setItem: ActiveWorkoutSet;
  index: number;
  onDelete: () => void;
  onUpdateReps: (reps: number) => void;
  onUpdateWeight: (weight: number) => void;
  onToggleLogged: (isCompleted: boolean) => void;
}): React.JSX.Element {
  const { tokens } = useTheme();
  const [repsText, setRepsText] = useState(String(setItem.reps));
  const [weightText, setWeightText] = useState(String(setItem.weight));
  const translateX = React.useRef(new Animated.Value(0)).current;
  const offsetRef = React.useRef(0);
  const dragStartOffsetRef = React.useRef(0);
  const [isDeleteActionVisible, setIsDeleteActionVisible] = useState(false);

  useEffect(() => {
    setRepsText(String(setItem.reps));
  }, [setItem.reps]);

  useEffect(() => {
    setWeightText(String(setItem.weight));
  }, [setItem.weight]);

  const handlePersistReps = useCallback((): void => {
    onUpdateReps(parseWholeNumber(repsText));
  }, [onUpdateReps, repsText]);

  const handlePersistWeight = useCallback((): void => {
    onUpdateWeight(parseDecimalNumber(weightText));
  }, [onUpdateWeight, weightText]);

  const closeSwipe = useCallback((): void => {
    offsetRef.current = 0;
    setIsDeleteActionVisible(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const openSwipe = useCallback((): void => {
    offsetRef.current = -SWIPE_ACTION_WIDTH;
    setIsDeleteActionVisible(true);
    Animated.spring(translateX, {
      toValue: -SWIPE_ACTION_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onPanResponderGrant: () => {
          dragStartOffsetRef.current = offsetRef.current;
        },
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          (gestureState.dx < -6 ||
            (offsetRef.current < 0 && gestureState.dx > 6)),
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = Math.max(
            -SWIPE_ACTION_WIDTH,
            Math.min(0, dragStartOffsetRef.current + gestureState.dx),
          );
          translateX.setValue(nextOffset);
          setIsDeleteActionVisible(nextOffset < -4);
        },
        onPanResponderRelease: (_, gestureState) => {
          const finalOffset = Math.max(
            -SWIPE_ACTION_WIDTH,
            Math.min(0, dragStartOffsetRef.current + gestureState.dx),
          );

          if (finalOffset <= -SWIPE_ACTION_WIDTH / 2) {
            openSwipe();
            return;
          }

          closeSwipe();
        },
        onPanResponderTerminate: closeSwipe,
      }),
    [closeSwipe, openSwipe, translateX],
  );

  return (
    <View className="mb-2.5 overflow-hidden rounded-[16px]">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${exerciseName} set ${index + 1}`}
        accessibilityElementsHidden={!isDeleteActionVisible}
        importantForAccessibility={
          isDeleteActionVisible ? 'yes' : 'no-hide-descendants'
        }
        testID={`delete-set-${setItem.id}`}
        className="absolute bottom-0 right-0 top-0 w-[72px] items-center justify-center rounded-[16px] bg-error"
        onPress={() => {
          closeSwipe();
          onDelete();
        }}
      >
        <Body className="text-sm font-semibold text-error-foreground">
          Delete
        </Body>
      </Pressable>

      <Animated.View
        className="flex-row items-center gap-2 rounded-[16px]  bg-surface-elevated px-3 py-3"
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-card">
          <Body className="text-sm font-semibold text-foreground">
            {index + 1}
          </Body>
        </View>
        <TextInput
          className="h-11 flex-1 rounded-[12px]  bg-surface-card px-3 py-0 font-body text-sm text-foreground"
          value={repsText}
          onChangeText={setRepsText}
          onEndEditing={handlePersistReps}
          onSubmitEditing={handlePersistReps}
          keyboardType="number-pad"
          returnKeyType="done"
          accessibilityLabel={`${exerciseName} set ${index + 1} reps`}
          placeholderTextColor={tokens.textMuted}
        />
        <TextInput
          className="h-11 flex-1 rounded-[12px]  bg-surface-card px-3 py-0 font-body text-sm text-foreground"
          value={weightText}
          onChangeText={setWeightText}
          onEndEditing={handlePersistWeight}
          onSubmitEditing={handlePersistWeight}
          keyboardType="decimal-pad"
          returnKeyType="done"
          accessibilityLabel={`${exerciseName} set ${index + 1} weight`}
          placeholderTextColor={tokens.textMuted}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${setItem.isCompleted ? 'Unlog' : 'Log'} ${exerciseName} set ${index + 1}`}
          className={`h-11 min-w-[58px] items-center justify-center rounded-[12px] border px-3 ${
            setItem.isCompleted
              ? 'border-accent bg-accent'
              : 'border-surface-border bg-surface-card'
          }`}
          onPress={() => onToggleLogged(!setItem.isCompleted)}
        >
          <Text
            className={`font-body text-sm font-semibold ${
              setItem.isCompleted ? 'text-accent-foreground' : 'text-foreground'
            }`}
          >
            Log
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
