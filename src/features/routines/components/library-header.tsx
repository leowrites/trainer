import React from 'react';
import { View } from 'react-native';

import { Button, Heading, Input, Muted } from '@shared/components';
import type { Section } from '../types';
import { SectionSwitcher } from './section-switcher';

export function LibraryHeader({
  section,
  exercisesCount,
  routinesCount,
  searchQuery,
  onSearchChange,
  onChangeSection,
  onCreate,
}: {
  section: Section;
  exercisesCount: number;
  routinesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onChangeSection: (section: Section) => void;
  onCreate: () => void;
}): React.JSX.Element {
  const actionLabel = section === 'exercises' ? 'New Exercise' : 'New Routine';

  return (
    <View className="pb-5">
      <View accessibilityRole="header" className="gap-2">
        <Heading className="text-4xl leading-[36px]">Routines</Heading>
        <Muted className="max-w-[300px] text-sm leading-[19px]">
          Search your library, jump into dedicated detail pages, and keep your
          templates organized before the next workout starts.
        </Muted>
      </View>

      <SectionSwitcher
        section={section}
        exercisesCount={exercisesCount}
        routinesCount={routinesCount}
        onChange={onChangeSection}
      />

      <Input
        className="mt-4"
        placeholder={
          section === 'exercises' ? 'Search exercises' : 'Search routines'
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
