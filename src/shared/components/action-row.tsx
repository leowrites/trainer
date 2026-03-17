import React from 'react';
import { View } from 'react-native';

import { Button } from './button';

export interface ActionRowProps {
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  secondaryDisabled?: boolean;
  className?: string;
}

export function ActionRow({
  primaryLabel = 'Save',
  secondaryLabel = 'Cancel',
  onPrimaryPress,
  onSecondaryPress,
  primaryLoading = false,
  primaryDisabled = false,
  secondaryDisabled = false,
  className = '',
}: ActionRowProps): React.JSX.Element {
  return (
    <View className={`mt-4 flex-row gap-2 ${className}`}>
      <Button
        className="flex-1"
        onPress={onPrimaryPress}
        loading={primaryLoading}
        disabled={primaryDisabled || primaryLoading}
      >
        {primaryLabel}
      </Button>
      <Button
        variant="ghost"
        className="flex-1"
        onPress={onSecondaryPress}
        disabled={secondaryDisabled}
      >
        {secondaryLabel}
      </Button>
    </View>
  );
}
