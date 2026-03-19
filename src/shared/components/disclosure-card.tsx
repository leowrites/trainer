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
      className={`mb-3 overflow-hidden p-0 ${className}`}
      onPress={onToggle}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        className={`flex-row items-start justify-between gap-4 px-5 py-5 ${headerClassName}`}
      >
        <View className="flex-1">
          <Body className="font-heading text-lg leading-tight">{title}</Body>
          {headerMeta}
        </View>
        <View className="flex-row items-center gap-2">
          {actions}
          <Caption className="uppercase tracking-[1.2px] text-muted-foreground">
            {expanded ? 'Hide' : 'View'}
          </Caption>
          <Caption className="text-muted-foreground">
            {expanded ? '▲' : '▼'}
          </Caption>
        </View>
      </View>

      {expanded ? (
        <Surface
          variant="card"
          className={`border-t border-surface-border/70 px-5 pb-5 pt-4 ${contentClassName}`}
        >
          {children}
        </Surface>
      ) : null}
    </Card>
  );
}
