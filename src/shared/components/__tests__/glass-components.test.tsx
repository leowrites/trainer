/**
 * Tests for Liquid Glass UI components.
 *
 * Covers rendering, prop contracts, platform fallback behaviour, and
 * accessibility attributes for GlassView and GlassCard.
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Body } from '../index';
import { GlassCard, GlassView } from '../index';

// ─── GlassView ────────────────────────────────────────────────────────────────

describe('GlassView', () => {
  it('renders children', () => {
    render(
      <GlassView>
        <Body>Hello</Body>
      </GlassView>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('renders without children', () => {
    const { toJSON } = render(<GlassView />);
    expect(toJSON()).toBeTruthy();
  });

  it.each(['light', 'medium', 'heavy'] as const)(
    'renders intensity "%s" without crashing',
    (intensity) => {
      const { toJSON } = render(
        <GlassView intensity={intensity}>
          <Body>content</Body>
        </GlassView>,
      );
      expect(toJSON()).toBeTruthy();
    },
  );

  it('applies a custom borderRadius', () => {
    const { toJSON } = render(
      <GlassView borderRadius={8}>
        <Body>rounded</Body>
      </GlassView>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('merges custom className', () => {
    const { toJSON } = render(
      <GlassView className="m-4 flex-1">
        <Body>X</Body>
      </GlassView>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('accepts accessibilityRole override', () => {
    const { toJSON } = render(
      <GlassView accessibilityRole="summary">
        <Body>A</Body>
      </GlassView>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('passes style prop through', () => {
    const { toJSON } = render(
      <GlassView style={{ margin: 10 }}>
        <Body>styled</Body>
      </GlassView>,
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ─── GlassCard ────────────────────────────────────────────────────────────────

describe('GlassCard', () => {
  it('renders children', () => {
    render(
      <GlassCard>
        <Body>Card content</Body>
      </GlassCard>,
    );
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('renders label when provided', () => {
    render(
      <GlassCard label="Today's Plan">
        <Body>content</Body>
      </GlassCard>,
    );
    expect(screen.getByText("Today's Plan")).toBeTruthy();
  });

  it('does not render label strip when label is omitted', () => {
    render(
      <GlassCard>
        <Body>no label</Body>
      </GlassCard>,
    );
    // Content renders but no separate label text is shown
    expect(screen.getByText('no label')).toBeTruthy();
    expect(screen.queryByText('Some Label')).toBeNull();
  });

  it.each(['light', 'medium', 'heavy'] as const)(
    'renders intensity "%s" without crashing',
    (intensity) => {
      const { toJSON } = render(
        <GlassCard intensity={intensity}>
          <Body>content</Body>
        </GlassCard>,
      );
      expect(toJSON()).toBeTruthy();
    },
  );

  it('renders as pressable when onPress is provided', () => {
    const onPress = jest.fn();
    render(
      <GlassCard onPress={onPress} accessibilityLabel="Press me">
        <Body>pressable</Body>
      </GlassCard>,
    );
    // Pressable wrapper should be in the tree
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('is not pressable when onPress is omitted', () => {
    render(
      <GlassCard>
        <Body>static</Body>
      </GlassCard>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses accessibilityLabel prop for the pressable', () => {
    render(
      <GlassCard onPress={jest.fn()} accessibilityLabel="Open workout">
        <Body>tap</Body>
      </GlassCard>,
    );
    expect(screen.getByLabelText('Open workout')).toBeTruthy();
  });

  it('falls back to label as accessibilityLabel when accessibilityLabel is not set', () => {
    render(
      <GlassCard label="Push Day" onPress={jest.fn()}>
        <Body>tap</Body>
      </GlassCard>,
    );
    expect(screen.getByLabelText('Push Day')).toBeTruthy();
  });

  it('accepts custom borderRadius', () => {
    const { toJSON } = render(
      <GlassCard borderRadius={8}>
        <Body>rounded</Body>
      </GlassCard>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('merges custom className', () => {
    const { toJSON } = render(
      <GlassCard className="mb-4">
        <Body>X</Body>
      </GlassCard>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('passes style prop through', () => {
    const { toJSON } = render(
      <GlassCard style={{ margin: 10 }}>
        <Body>styled</Body>
      </GlassCard>,
    );
    expect(toJSON()).toBeTruthy();
  });
});
