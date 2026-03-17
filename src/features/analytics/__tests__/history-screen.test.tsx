import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { HistoryScreen } from '../screens/history-screen';

describe('HistoryScreen', () => {
  it('renders the placeholder content with shared typography', () => {
    render(<HistoryScreen />);

    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText('Review your past workouts')).toBeTruthy();
  });
});
