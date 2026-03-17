import React from 'react';

import { Box } from '@shared/ui/box';
import { Heading } from '@shared/ui/heading';
import { Text } from '@shared/ui/text';

export function HistoryScreen(): React.JSX.Element {
  return (
    <Box className="flex-1 items-center justify-center bg-surface px-4">
      <Heading size="2xl" bold className="text-white mb-2">
        History
      </Heading>
      <Text className="text-white/60 text-sm" size="sm">
        Review your past workouts
      </Text>
    </Box>
  );
}
