import React from 'react';

import { Container, Heading, Muted } from '@shared/components';

export function ProfileScreen(): React.JSX.Element {
  return (
    <Container className="items-center justify-center">
      <Heading>Profile</Heading>
      <Muted className="mt-2">Track your health &amp; analytics</Muted>
    </Container>
  );
}
