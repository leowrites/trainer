import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ProfileScreen } from '../screens/profile-screen';

describe('ProfileScreen', () => {
  it('renders the placeholder content with shared typography', () => {
    render(<ProfileScreen />);

    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('Track your health & analytics')).toBeTruthy();
  });
});
