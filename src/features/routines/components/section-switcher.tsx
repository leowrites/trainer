import React from 'react';
import { Pressable, View } from 'react-native';

import { Label, Muted } from '@shared/components';
import type { Section } from '../types';

export function SectionSwitcher({
  section,
  schedulesCount,
  exercisesCount,
  routinesCount,
  onChange,
}: {
  section: Section;
  schedulesCount: number;
  exercisesCount: number;
  routinesCount: number;
  onChange: (section: Section) => void;
}): React.JSX.Element {
  return (
    <View className="mt-4 rounded-[24px] border border-surface-border/80 bg-surface-card p-1">
      <View className="flex-row">
        {(
          [
            ['schedules', schedulesCount],
            ['routines', routinesCount],
            ['exercises', exercisesCount],
          ] as const
        ).map(([item, count]) => {
          const active = section === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={item}
              accessibilityState={{ selected: active }}
              className={`flex-1 rounded-[18px] px-4 py-3 ${
                active ? 'bg-surface-elevated' : ''
              }`}
              onPress={() => onChange(item)}
            >
              <Label className={active ? 'text-foreground' : 'text-muted'}>
                {item}
              </Label>
              <Muted className="mt-1 text-xs">{count} total</Muted>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
