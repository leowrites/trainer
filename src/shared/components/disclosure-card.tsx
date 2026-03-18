import React from 'react';
import { View } from 'react-native';

import { Body, Caption, Meta } from './typography';
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
      className={`mb-3 overflow-hidden p-0 ${className}`}
      onPress={onToggle}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        className={`flex-row items-start justify-between gap-3 px-5 py-4 ${headerClassName}`}
      >
        <View className="flex-1">
          <Body className="font-heading text-lg leading-tight">{title}</Body>
          {headerMeta}
        </View>
        <View className="flex-row items-center gap-2">
          {actions}
          <Meta className="text-muted">{expanded ? 'OPEN' : 'MORE'}</Meta>
          <Caption>{expanded ? '▲' : '▼'}</Caption>
        </View>
      </View>

      {expanded ? (
        <Surface
          variant="elevated"
          className={`border-t border-surface-border px-5 pb-4 pt-3 ${contentClassName}`}
        >
          {children}
        </Surface>
      ) : null}
    </Card>
  );
}
