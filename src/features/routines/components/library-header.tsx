import React from 'react';
import { View } from 'react-native';

import { Button, Heading, Input, Muted } from '@shared/components';
import type { Section } from '../types';
import { SectionSwitcher } from './section-switcher';

export function LibraryHeader({
  section,
  schedulesCount,
  exercisesCount,
  routinesCount,
  searchQuery,
  onSearchChange,
  onChangeSection,
  onCreate,
  children,
}: {
  section: Section;
  schedulesCount: number;
  exercisesCount: number;
  routinesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onChangeSection: (section: Section) => void;
  onCreate: () => void;
  children?: React.ReactNode;
}): React.JSX.Element {
  const actionLabel =
    section === 'schedules'
      ? 'New Schedule'
      : section === 'routines'
        ? 'New Routine'
        : 'New Exercise';

  return (
    <View className="pb-5">
      <View accessibilityRole="header" className="gap-2">
        <Heading className="text-4xl leading-[36px]">Plan</Heading>
        <Muted className="max-w-[300px] text-sm leading-[19px]">
          Keep schedules, routines, and exercises aligned before the next
          workout starts.
        </Muted>
      </View>

      <SectionSwitcher
        section={section}
        schedulesCount={schedulesCount}
        exercisesCount={exercisesCount}
        routinesCount={routinesCount}
        onChange={onChangeSection}
      />

      {children}

      <Input
        className="mt-4"
        placeholder={
          section === 'schedules'
            ? 'Search schedules'
            : section === 'routines'
              ? 'Search routines'
              : 'Search exercises'
        }
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button className="mt-4 w-full" onPress={onCreate}>
        {actionLabel}
      </Button>
    </View>
  );
}
