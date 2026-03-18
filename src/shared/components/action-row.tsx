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
    <View className={`mt-5 gap-2 ${className}`}>
      <Button
        className="w-full"
        onPress={onPrimaryPress}
        loading={primaryLoading}
        disabled={primaryDisabled || primaryLoading}
      >
        {primaryLabel}
      </Button>
      <View className="items-end">
        <Button
          variant="ghost"
          size="sm"
          className="px-1"
          onPress={onSecondaryPress}
          disabled={secondaryDisabled}
        >
          {secondaryLabel}
        </Button>
      </View>
    </View>
  );
}
