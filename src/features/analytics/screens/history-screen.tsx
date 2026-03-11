import React from 'react';

import { Container, Heading, Muted } from '@shared/components';

export function HistoryScreen(): React.JSX.Element {
  return (
    <Container className="items-center justify-center">
      <Heading>History</Heading>
      <Muted className="mt-2">Review your past workouts</Muted>
    </Container>
  );
}
