import React from 'react';

import { Box } from '@shared/ui/box';
import { Heading } from '@shared/ui/heading';
import { Text } from '@shared/ui/text';

export function ProfileScreen(): React.JSX.Element {
  return (
    <Box className="flex-1 items-center justify-center bg-surface px-4">
      <Heading size="2xl" bold className="text-white mb-2">
        Profile
      </Heading>
      <Text className="text-white/60 text-center" size="sm">
        Track your health &amp; analytics
      </Text>
    </Box>
  );
}
