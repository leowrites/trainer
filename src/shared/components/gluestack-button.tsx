import React from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { Button, ButtonText } from '@shared/ui/button';

export interface GluestackButtonProps extends PressableProps {
  variant?: 'primary' | 'ghost';
}

export function GluestackButton({
  variant = 'primary',
  style,
  children,
  ...rest
}: GluestackButtonProps): React.ReactElement {
  const resolvedStyle =
    typeof style === 'function' ? undefined : (style as StyleProp<ViewStyle>);

  return (
    <Button
      action={variant === 'ghost' ? 'default' : 'primary'}
      variant={variant === 'ghost' ? 'link' : 'solid'}
      size="lg"
      className="min-w-[180px]"
      style={resolvedStyle}
      {...rest}
    >
      <ButtonText>
        {typeof children === 'string' || typeof children === 'number'
          ? children
          : null}
      </ButtonText>
    </Button>
  );
}
