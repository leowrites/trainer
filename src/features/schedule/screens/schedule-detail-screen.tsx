import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Text, View } from 'react-native';
import type DraggableFlatListType from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';

import type { Routine } from '@core/database/types';
import { useTheme } from '@core/theme/theme-context';
import { useRoutines } from '@features/routines';
import {
  Body,
  Button,
  Card,
  Container,
  Heading,
  Input,
  InteractivePressable,
  Label,
  Meta,
  Muted,
  Surface,
} from '@shared/components';
import { useReducedMotionPreference } from '@shared/hooks';
import { configureInteractionLayoutAnimation } from '@shared/utils';
import { RoutinePickerSheet } from '../components/routine-picker-sheet';
import { useScheduleEntries } from '../hooks/use-schedule-entries';
import type { NewScheduleInput } from '../hooks/use-schedules';
import { useSchedules } from '../hooks/use-schedules';
import type { ScheduleStackParamList } from '../types';

function DraftRoutineRow({
  routine,
  drag,
  isActive,
  onRemove,
}: {
  routine: Routine;
  drag: () => void;
  isActive: boolean;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={`Reorder ${routine.name}`}
      className="mb-3"
      delayLongPress={150}
      onLongPress={drag}
    >
      <Surface
        variant="card"
        className={`rounded-[22px] border px-4 py-4 ${
          isActive
            ? 'border-accent/60 bg-surface-elevated'
            : 'border-surface-border/80 bg-surface-card'
        }`}
      >
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Body className="font-medium">{routine.name}</Body>
          </View>

          <InteractivePressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${routine.name}`}
            className="px-2 py-2"
            onPress={onRemove}
          >
            <Muted className="text-sm">Remove</Muted>
          </InteractivePressable>
        </View>
      </Surface>
    </InteractivePressable>
  );
}

export function ScheduleDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  ScheduleStackParamList,
  'ScheduleDetail'
>): React.JSX.Element {
  const DraggableFlatList = useMemo(
    () =>
      require('react-native-draggable-flatlist')
        .default as typeof DraggableFlatListType,
    [],
  );
  const { tokens } = useTheme();
  const {
    schedules,
    hasLoaded,
    refresh: refreshSchedules,
    createSchedule,
    updateSchedule,
    setActiveSchedule,
    deleteSchedule,
  } = useSchedules();
  const { routines, refresh: refreshRoutines } = useRoutines();
  const scheduleId = route.params?.scheduleId;
  const { entries: scheduleEntries, refresh: refreshScheduleEntries } =
    useScheduleEntries(scheduleId);
  const selectedSchedule =
    schedules.find((schedule) => schedule.id === scheduleId) ?? null;
  const [name, setName] = useState('');
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<string[]>([]);
  const [isRoutinePickerOpen, setIsRoutinePickerOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(scheduleId === undefined);
  const [error, setError] = useState<string | null>(null);
  const cancelActionRef = useRef<() => void>(() => undefined);
  const saveActionRef = useRef<() => void>(() => undefined);
  const prefersReducedMotion = useReducedMotionPreference();

  const handleCancel = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback((): void => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Schedule name is required.');
      setIsEditingName(true);
      return;
    }

    setError(null);

    const input: NewScheduleInput = {
      name: trimmedName,
      routineIds: selectedRoutineIds,
    };

    if (selectedSchedule === null) {
      createSchedule(input);
    } else {
      updateSchedule(selectedSchedule.id, input);
    }

    navigation.goBack();
  }, [
    createSchedule,
    name,
    navigation,
    selectedRoutineIds,
    selectedSchedule,
    updateSchedule,
  ]);

  cancelActionRef.current = handleCancel;
  saveActionRef.current = handleSave;

  const handleArchive = useCallback((): void => {
    if (selectedSchedule === null) {
      return;
    }

    Alert.alert(
      'Archive Schedule',
      `Archive ${selectedSchedule.name}? It will be removed from active rotation but kept for history.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            deleteSchedule(selectedSchedule.id);
            navigation.goBack();
          },
        },
      ],
    );
  }, [deleteSchedule, navigation, selectedSchedule]);

  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackVisible: false,
      headerLeft: () => (
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          className="px-1 py-1"
          onPress={() => cancelActionRef.current()}
        >
          <Text className="font-mono text-base text-foreground">Cancel</Text>
        </InteractivePressable>
      ),
      headerRight: () => (
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          className="px-1 py-1"
          onPress={() => saveActionRef.current()}
        >
          <Text className="font-mono text-base text-secondary">Save</Text>
        </InteractivePressable>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      refreshSchedules();
      refreshRoutines();
      refreshScheduleEntries();
    }, [refreshRoutines, refreshScheduleEntries, refreshSchedules]),
  );

  useEffect(() => {
    if (scheduleId === undefined) {
      setName('');
      setSelectedRoutineIds([]);
      setIsRoutinePickerOpen(false);
      setIsEditingName(true);
      setError(null);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (scheduleId === undefined) {
      return;
    }

    if (selectedSchedule === null) {
      if (hasLoaded) {
        navigation.goBack();
      }
      return;
    }

    setName(selectedSchedule.name);
    setSelectedRoutineIds(scheduleEntries.map((entry) => entry.routine_id));
    setIsRoutinePickerOpen(false);
    setIsEditingName(false);
    setError(null);
  }, [hasLoaded, navigation, scheduleId, scheduleEntries, selectedSchedule]);

  const selectedRoutines = useMemo(
    () =>
      selectedRoutineIds
        .map((routineId) =>
          routines.find((routine) => routine.id === routineId),
        )
        .filter((routine): routine is Routine => routine !== undefined),
    [routines, selectedRoutineIds],
  );

  const draftTitle = name.trim() || selectedSchedule?.name || 'New Schedule';

  const listHeader = (
    <View>
      {isEditingName ? (
        <Input
          className="mb-4"
          placeholder="Push / Pull Rotation"
          value={name}
          onChangeText={setName}
          onEndEditing={() => setIsEditingName(false)}
          autoCapitalize="words"
        />
      ) : (
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel="Edit schedule name"
          className="flex-row items-center gap-3"
          onPress={() => {
            configureInteractionLayoutAnimation(prefersReducedMotion);
            setIsEditingName(true);
          }}
        >
          <Heading className="font-heading text-4xl leading-[36px]">
            {draftTitle}
          </Heading>
          <Feather name="edit-2" size={18} color={tokens.textPrimary} />
        </InteractivePressable>
      )}

      <Card className="mt-4 rounded-[24px] px-5 py-5">
        <View className="flex-row items-center justify-between gap-3">
          <Label
            className={selectedSchedule?.is_active ? 'text-secondary' : ''}
          >
            {selectedSchedule?.is_active ? 'Active' : 'Inactive'}
          </Label>
          <Meta>
            {selectedRoutines.length} routine
            {selectedRoutines.length === 1 ? '' : 's'}
          </Meta>
        </View>
        {selectedSchedule && selectedSchedule.is_active === 0 ? (
          <Button
            className="mt-4 w-full"
            variant="secondary"
            onPress={() => setActiveSchedule(selectedSchedule.id)}
          >
            Set Active
          </Button>
        ) : null}
      </Card>

      <View className="mt-5 mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Heading>Rotation order</Heading>
        </View>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setIsRoutinePickerOpen(true)}
        >
          Add Routine
        </Button>
      </View>
    </View>
  );

  const detailFooter = (
    <View className="pt-4 pb-7">
      {selectedSchedule ? (
        <Button className="w-full" variant="danger" onPress={handleArchive}>
          Archive Schedule
        </Button>
      ) : null}
      {error ? <Muted className="mt-4 text-error">{error}</Muted> : null}
    </View>
  );

  return (
    <Container edges={['left', 'right']}>
      <View>
        <DraggableFlatList
          data={selectedRoutines}
          keyExtractor={(item) => item.id}
          activationDistance={8}
          style={{ height: '100%' }}
          onDragEnd={({ data }) => {
            setSelectedRoutineIds(data.map((routine) => routine.id));
          }}
          renderItem={({ item, drag, isActive }: RenderItemParams<Routine>) => (
            <DraftRoutineRow
              routine={item}
              drag={drag}
              isActive={isActive}
              onRemove={() => {
                configureInteractionLayoutAnimation(prefersReducedMotion);
                setSelectedRoutineIds((current) =>
                  current.filter((routineId) => routineId !== item.id),
                );
              }}
            />
          )}
          ListHeaderComponent={listHeader}
          ListFooterComponent={detailFooter}
          ListEmptyComponent={
            <Muted className="mt-4 rounded-[18px] border border-dashed border-surface-border px-4 py-4 text-sm leading-[18px]">
              No routines added yet. Use Add Routine to start building this
              rotation.
            </Muted>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      <RoutinePickerSheet
        visible={isRoutinePickerOpen}
        routines={routines}
        selectedRoutineIds={selectedRoutineIds}
        onClose={() => setIsRoutinePickerOpen(false)}
        onAddRoutines={(routineIds) => {
          configureInteractionLayoutAnimation(prefersReducedMotion);
          setSelectedRoutineIds((current) => [
            ...current,
            ...routineIds.filter((routineId) => !current.includes(routineId)),
          ]);
        }}
      />
    </Container>
  );
}
