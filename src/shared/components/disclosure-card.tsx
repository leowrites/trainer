import React from 'react';
import { View } from 'react-native';

import { Body, Caption } from './typography';
import { Card } from './card';
import { Surface } from './surface';

export interface DisclosureCardProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  headerMeta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  accessibilityLabel?: string;
}

export function DisclosureCard({
  title,
  expanded,
  onToggle,
  headerMeta,
  actions,
  children,
  className = '',
  headerClassName = '',
  contentClassName = '',
  accessibilityLabel,
}: DisclosureCardProps): React.JSX.Element {
  return (
    <Card
      className={`mb-2 overflow-hidden rounded-xl p-0 ${className}`}
      onPress={onToggle}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        className={`flex-row items-center justify-between px-4 py-3 ${headerClassName}`}
      >
        <View className="flex-1">
          <Body className="font-medium">{title}</Body>
          {headerMeta}
        </View>
        <View className="flex-row items-center gap-2">
          {actions}
          <Caption>{expanded ? '▲' : '▼'}</Caption>
        </View>
      </View>

      {expanded ? (
        <Surface
          variant="elevated"
          className={`px-4 pb-3 pt-2 ${contentClassName}`}
        >
          {children}
        </Surface>
      ) : null}
    </Card>
  );
}
