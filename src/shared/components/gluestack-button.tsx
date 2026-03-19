import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Button, ButtonText } from '@shared/ui/button';

export interface GluestackButtonProps {
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function GluestackButton({
  variant = 'primary',
  style,
  children,
  disabled = false,
  ...rest
}: GluestackButtonProps): React.ReactElement {
  const textClassName =
    variant === 'ghost' ? 'text-foreground' : 'text-accent-foreground';

  return (
    <Button
      action={variant === 'ghost' ? 'default' : 'primary'}
      variant={variant === 'ghost' ? 'link' : 'solid'}
      size="lg"
      className="min-w-[180px]"
      style={style as StyleProp<ViewStyle>}
      disabled={disabled}
      {...rest}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <ButtonText className={textClassName}>{children}</ButtonText>
      ) : (
        children
      )}
    </Button>
  );
}
