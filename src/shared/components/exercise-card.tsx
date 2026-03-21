/**
 * Calling spec
 *
 * use when:
 * - a screen needs the app's standard exercise block shell
 * - the exercise block should expose a title, secondary status text, and a
 *   timer or metadata action on the right
 *
 * does:
 * - renders the shared exercise card layout used by workout and template flows
 * - exposes a platform-aware overflow menu for per-exercise actions
 * - keeps the card body fully caller-defined via `children`
 *
 * does not:
 * - manage exercise data or navigation by itself
 * - assume any specific exercise row contents
 */

import React from 'react';
import { ActionSheetIOS, Alert, Platform, Text, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { InteractivePressable } from './interactive-pressable';
import { Body, Heading, Muted } from './typography';

export interface ExerciseCardMenuAction {
  label: string;
  onPress: () => void;
  style?: 'default' | 'destructive';
}

export interface ExerciseCardProps {
  title: string;
  subtitle: string;
  metaLabel: string;
  isMetaActive: boolean;
  onPressMeta: () => void;
  metaAccessibilityLabel: string;
  metaAccessibilityHint?: string;
  onPressTitle?: () => void;
  titleAccessibilityLabel?: string;
  menuAccessibilityLabel?: string;
  menuActions?: ExerciseCardMenuAction[];
  children: React.ReactNode;
}

export function ExerciseCard({
  title,
  subtitle,
  metaLabel,
  isMetaActive,
  onPressMeta,
  metaAccessibilityLabel,
  metaAccessibilityHint,
  onPressTitle,
  titleAccessibilityLabel,
  menuAccessibilityLabel,
  menuActions = [],
  children,
}: ExerciseCardProps): React.JSX.Element {
  const { colorMode } = useTheme();

  const handleOpenOptions = (): void => {
    if (menuActions.length === 0) {
      return;
    }

    if (Platform.OS === 'ios') {
      const options = [...menuActions.map((action) => action.label), 'Cancel'];
      const cancelButtonIndex = options.length - 1;
      const destructiveButtonIndex = menuActions.findIndex(
        (action) => action.style === 'destructive',
      );

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options,
          cancelButtonIndex,
          destructiveButtonIndex:
            destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
          userInterfaceStyle: colorMode,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelButtonIndex) {
            return;
          }

          menuActions[buttonIndex]?.onPress();
        },
      );
      return;
    }

    Alert.alert(title, undefined, [
      ...menuActions.map((action) => ({
        text: action.label,
        style:
          action.style === 'destructive'
            ? ('destructive' as const)
            : ('default' as const),
        onPress: action.onPress,
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View className="mt-3 overflow-hidden rounded-[22px] bg-surface-card p-4">
      <View className="relative border-b border-surface-border/80 pb-3">
        <View className="flex-row items-center justify-between gap-3">
          {onPressTitle ? (
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={titleAccessibilityLabel ?? title}
              className="flex-1"
              onPress={onPressTitle}
            >
              <Heading className="text-lg leading-[20px]">{title}</Heading>
            </InteractivePressable>
          ) : (
            <View className="flex-1">
              <Heading className="text-lg leading-[20px]">{title}</Heading>
            </View>
          )}

          {menuActions.length > 0 ? (
            <InteractivePressable
              accessibilityRole="button"
              accessibilityLabel={
                menuAccessibilityLabel ?? `Options for ${title}`
              }
              className="h-8 w-8 items-center justify-center rounded-[10px] bg-surface-card"
              onPress={handleOpenOptions}
            >
              <Text className="font-mono text-sm tracking-[-1px] text-muted">
                ...
              </Text>
            </InteractivePressable>
          ) : null}
        </View>
        <View className="mt-3 flex-row items-center justify-between gap-3">
          <Muted className="flex-1 text-sm">{subtitle}</Muted>
          <InteractivePressable
            accessibilityRole="button"
            accessibilityLabel={metaAccessibilityLabel}
            accessibilityHint={metaAccessibilityHint}
            className={`rounded-[12px] px-3 py-2 ${
              isMetaActive ? 'bg-secondary/10' : 'bg-surface-elevated'
            }`}
            onPress={onPressMeta}
          >
            <Body
              className={`text-sm font-semibold ${
                isMetaActive ? 'text-secondary' : 'text-foreground'
              }`}
            >
              {metaLabel}
            </Body>
          </InteractivePressable>
        </View>
      </View>
      {children}
    </View>
  );
}
