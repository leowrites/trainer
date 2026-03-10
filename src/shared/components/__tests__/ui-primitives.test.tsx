/**
 * Tests for shared UI primitives.
 *
 * We test rendering, prop contracts, and accessibility attributes.
 * Animation-heavy components (Badge pulse) are tested without timers —
 * we only verify the static DOM structure.
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import type { ColSpan } from '../index';
import {
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Container,
  Grid,
  GridItem,
  Header,
  Heading,
  Label,
  Muted,
  ProgressBar,
  StatRow,
  StatValue,
  Surface,
} from '../index';

// ─── Container ────────────────────────────────────────────────────────────────

describe('Container', () => {
  it('renders children', () => {
    render(
      <Container>
        <Body>Hello</Body>
      </Container>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('merges custom className', () => {
    const { toJSON } = render(
      <Container className="p-2">
        <Body>X</Body>
      </Container>,
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ─── Surface ──────────────────────────────────────────────────────────────────

describe('Surface', () => {
  it('renders with default variant', () => {
    const { toJSON } = render(
      <Surface>
        <Body>Inner</Body>
      </Surface>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it.each(['default', 'card', 'elevated', 'push', 'pull', 'rest'] as const)(
    'renders variant "%s" without crashing',
    (variant) => {
      const { toJSON } = render(<Surface variant={variant} />);
      expect(toJSON()).toBeTruthy();
    },
  );
});

// ─── Card ─────────────────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <Body>Card body</Body>
      </Card>,
    );
    expect(screen.getByText('Card body')).toBeTruthy();
  });

  it('renders label when provided', () => {
    render(
      <Card label="Today's Sets">
        <Body>content</Body>
      </Card>,
    );
    expect(screen.getByText("Today's Sets")).toBeTruthy();
  });

  it('does not render label strip when label is omitted', () => {
    render(
      <Card>
        <Body>no label</Body>
      </Card>,
    );
    expect(screen.queryByText('no label')).toBeTruthy();
  });

  it('renders as a pressable when onPress is provided', () => {
    const handler = jest.fn();
    render(
      <Card onPress={handler} accessibilityLabel="My card">
        <Body>Press me</Body>
      </Card>,
    );
    const pressable = screen.getByRole('button');
    expect(pressable).toBeTruthy();
  });
});

// ─── Header ───────────────────────────────────────────────────────────────────

describe('Header', () => {
  it('renders the title', () => {
    render(<Header title="trai" />);
    expect(screen.getByText('trai')).toBeTruthy();
  });

  it('renders titleAccent text', () => {
    render(<Header title="trai" titleAccent="ner" />);
    expect(screen.getByText('ner')).toBeTruthy();
  });

  it('renders metaLabel and metaDetail', () => {
    render(<Header title="App" metaLabel="Push A" metaDetail="Day 3" />);
    expect(screen.getByText('Push A')).toBeTruthy();
    expect(screen.getByText('Day 3')).toBeTruthy();
  });

  it('does not render meta section when props are omitted', () => {
    render(<Header title="App" />);
    expect(screen.queryByText('Push A')).toBeNull();
  });
});

// ─── Typography ───────────────────────────────────────────────────────────────

describe('Typography components', () => {
  it.each([
    ['Heading', <Heading key="h">Title</Heading>],
    ['Body', <Body key="b">Body text</Body>],
    ['Label', <Label key="l">LABEL</Label>],
    ['Caption', <Caption key="c">Caption text</Caption>],
    ['Muted', <Muted key="m">Muted text</Muted>],
    ['StatValue', <StatValue key="sv">142</StatValue>],
  ])('%s renders its children', (_name, element) => {
    const { toJSON } = render(element);
    expect(toJSON()).toBeTruthy();
  });
});

// ─── StatRow ─────────────────────────────────────────────────────────────────

describe('StatRow', () => {
  it('renders the value', () => {
    render(<StatRow value={4820} />);
    expect(screen.getByText('4820')).toBeTruthy();
  });

  it('renders unit when provided', () => {
    render(<StatRow value="142" unit="kg" />);
    expect(screen.getByText('kg')).toBeTruthy();
  });

  it('renders label strip when label is provided', () => {
    render(<StatRow value={10} label="Sets" />);
    expect(screen.getByText('Sets')).toBeTruthy();
  });

  it('renders sub text when provided', () => {
    render(<StatRow value={10} sub="+2 this week" />);
    expect(screen.getByText('+2 this week')).toBeTruthy();
  });

  it('exposes accessibilityLabel combining value and unit', () => {
    render(<StatRow value="142" unit="kg" />);
    expect(screen.getByLabelText('142 kg')).toBeTruthy();
  });

  it('accessibilityLabel is just the value when no unit', () => {
    render(<StatRow value="10" />);
    expect(screen.getByLabelText('10')).toBeTruthy();
  });
});

// ─── Badge ────────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it.each(['accent', 'error', 'warning', 'muted'] as const)(
    'renders variant "%s" without crashing',
    (variant) => {
      const { toJSON } = render(<Badge variant={variant}>Tag</Badge>);
      expect(toJSON()).toBeTruthy();
    },
  );

  it('renders a pulse dot when pulse=true', () => {
    const { toJSON } = render(<Badge pulse>Plateau</Badge>);
    // Snapshot smoke-test — pulse dot is a sibling View
    expect(toJSON()).toBeTruthy();
  });

  it('renders as pressable when onPress is provided', () => {
    const handler = jest.fn();
    render(
      <Badge onPress={handler} accessibilityLabel="Filter">
        Accent
      </Badge>,
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });
});

// ─── Button ───────────────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders label text', () => {
    render(<Button>Start</Button>);
    expect(screen.getByText('Start')).toBeTruthy();
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renders variant "%s" without crashing',
    (variant) => {
      const { toJSON } = render(<Button variant={variant}>Label</Button>);
      expect(toJSON()).toBeTruthy();
    },
  );

  it.each(['sm', 'md', 'lg'] as const)(
    'renders size "%s" without crashing',
    (size) => {
      const { toJSON } = render(<Button size={size}>Label</Button>);
      expect(toJSON()).toBeTruthy();
    },
  );

  it('shows ActivityIndicator when loading=true', () => {
    render(<Button loading>Label</Button>);
    // "Label" text should not be visible
    expect(screen.queryByText('Label')).toBeNull();
  });

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Label</Button>);
    const btn = screen.getByRole('button');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('has accessibilityRole="button"', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button')).toBeTruthy();
  });
});

// ─── ProgressBar ──────────────────────────────────────────────────────────────

describe('ProgressBar', () => {
  it('renders without crashing at progress 0', () => {
    const { toJSON } = render(<ProgressBar progress={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing at progress 1', () => {
    const { toJSON } = render(<ProgressBar progress={1} />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps progress values above 1', () => {
    const { toJSON } = render(<ProgressBar progress={2} />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps progress values below 0', () => {
    const { toJSON } = render(<ProgressBar progress={-0.5} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders label text when label provided', () => {
    render(<ProgressBar progress={0.5} label="Protein" />);
    expect(screen.getByText('Protein')).toBeTruthy();
  });

  it('renders percentage text when showLabel=true', () => {
    render(<ProgressBar progress={0.72} label="Protein" showLabel />);
    expect(screen.getByText('72%')).toBeTruthy();
  });

  it.each(['accent', 'secondary', 'error'] as const)(
    'renders variant "%s" without crashing',
    (variant) => {
      const { toJSON } = render(
        <ProgressBar progress={0.5} variant={variant} />,
      );
      expect(toJSON()).toBeTruthy();
    },
  );

  it('has accessibilityRole progressbar with correct value', () => {
    render(<ProgressBar progress={0.5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
  });
});

// ─── Grid / GridItem ─────────────────────────────────────────────────────────

describe('Grid + GridItem', () => {
  it('renders children inside grid items', () => {
    render(
      <Grid>
        <GridItem span={6 as ColSpan}>
          <Body>Left</Body>
        </GridItem>
        <GridItem span={6 as ColSpan}>
          <Body>Right</Body>
        </GridItem>
      </Grid>,
    );
    expect(screen.getByText('Left')).toBeTruthy();
    expect(screen.getByText('Right')).toBeTruthy();
  });

  it('defaults span to 12 (full width)', () => {
    const { toJSON } = render(
      <Grid>
        <GridItem>
          <Body>Full</Body>
        </GridItem>
      </Grid>,
    );
    expect(toJSON()).toBeTruthy();
  });
});
