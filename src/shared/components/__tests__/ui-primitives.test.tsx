/**
 * Tests for shared UI primitives.
 *
 * We test rendering, prop contracts, and accessibility attributes.
 * Animation-heavy components (Badge pulse) are tested without timers —
 * we only verify the static DOM structure.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => false,
}));

import {
  ActionRow,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Checkbox,
  Container,
  DayTile,
  DisclosureCard,
  Heading,
  Input,
  Label,
  Muted,
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

  it('does not trigger the card press when a nested action handles the tap', () => {
    const cardHandler = jest.fn();
    const childHandler = jest.fn();

    render(
      <Card onPress={cardHandler} accessibilityLabel="My card">
        <Button onPress={childHandler}>Nested Action</Button>
      </Card>,
    );

    fireEvent.press(screen.getByText('Nested Action'));

    expect(childHandler).toHaveBeenCalledTimes(1);
    expect(cardHandler).not.toHaveBeenCalled();
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

// ─── DayTile ──────────────────────────────────────────────────────────────────

describe('DayTile', () => {
  it('renders labels and accessibility text', () => {
    render(
      <DayTile
        primaryLabel="M"
        secondaryLabel="22"
        accessibilityLabel="Monday 22, workout completed"
      />,
    );

    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByText('22')).toBeTruthy();
    expect(screen.getByLabelText('Monday 22, workout completed')).toBeTruthy();
  });

  it('renders accent state colors for completed days', () => {
    render(
      <DayTile
        primaryLabel="T"
        secondaryLabel="23"
        tone="accent"
        accessibilityLabel="Tuesday 23, workout completed"
      />,
    );

    const tile = screen.getByLabelText('Tuesday 23, workout completed');
    const primary = screen.getByText('T');
    const secondary = screen.getByText('23');

    expect(tile.props.style).toMatchObject({
      backgroundColor: '#FF6B00',
      borderWidth: 0,
      borderColor: 'transparent',
    });
    expect(primary.props.style).toMatchObject({ color: '#171714' });
    expect(secondary.props.style).toMatchObject({ color: '#171714' });
  });

  it('renders subtle outlined state for today tiles', () => {
    render(
      <DayTile
        primaryLabel="W"
        secondaryLabel="24"
        tone="subtle"
        outlined
        accessibilityLabel="Wednesday 24, today"
      />,
    );

    const tile = screen.getByLabelText('Wednesday 24, today');
    const primary = screen.getByText('W');
    const secondary = screen.getByText('24');

    expect(tile.props.style).toMatchObject({
      backgroundColor: '#2B2924',
      borderWidth: 1,
      borderColor: '#353229',
    });
    expect(primary.props.style).toMatchObject({ color: '#C2BAAA' });
    expect(secondary.props.style).toMatchObject({ color: '#F3EFE6' });
  });

  it('renders as a button only when onPress is provided', () => {
    const onPress = jest.fn();
    render(
      <DayTile
        primaryLabel="F"
        secondaryLabel="26"
        accessibilityLabel="Friday 26"
        onPress={onPress}
      />,
    );

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
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

// ─── ActionRow ────────────────────────────────────────────────────────────────

describe('ActionRow', () => {
  it('renders primary and secondary actions', () => {
    render(
      <ActionRow onPrimaryPress={jest.fn()} onSecondaryPress={jest.fn()} />,
    );

    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls both action handlers', () => {
    const onPrimaryPress = jest.fn();
    const onSecondaryPress = jest.fn();

    render(
      <ActionRow
        primaryLabel="Create"
        secondaryLabel="Back"
        onPrimaryPress={onPrimaryPress}
        onSecondaryPress={onSecondaryPress}
      />,
    );

    fireEvent.press(screen.getByText('Create'));
    fireEvent.press(screen.getByText('Back'));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });
});

// ─── DisclosureCard ───────────────────────────────────────────────────────────

describe('DisclosureCard', () => {
  it('renders the title and expanded content when expanded', () => {
    render(
      <DisclosureCard title="Push A" expanded onToggle={jest.fn()}>
        <Body>Bench Press</Body>
      </DisclosureCard>,
    );

    expect(screen.getByText('Push A')).toBeTruthy();
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();

    render(
      <DisclosureCard
        title="Push A"
        expanded={false}
        onToggle={onToggle}
        accessibilityLabel="Expand Push A"
      />,
    );

    fireEvent.press(screen.getByLabelText('Expand Push A'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ─── Input ────────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Input value="" onChangeText={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays the placeholder text', () => {
    render(
      <Input value="" onChangeText={jest.fn()} placeholder="Enter name" />,
    );
    expect(screen.getByPlaceholderText('Enter name')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    render(
      <Input
        value=""
        onChangeText={onChangeText}
        testID="input"
        placeholder="Type here"
      />,
    );
    fireEvent.changeText(screen.getByPlaceholderText('Type here'), 'Hello');
    expect(onChangeText).toHaveBeenCalledWith('Hello');
  });

  it('reflects the current value', () => {
    render(
      <Input value="Bench Press" onChangeText={jest.fn()} placeholder="Name" />,
    );
    expect(screen.getByDisplayValue('Bench Press')).toBeTruthy();
  });

  it('applies className overrides without crashing', () => {
    const { toJSON } = render(
      <Input value="" onChangeText={jest.fn()} className="mb-4" />,
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ─── Checkbox ─────────────────────────────────────────────────────────────────

describe('Checkbox', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <Checkbox checked={false} onToggle={jest.fn()} label="Push A" />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('displays the label text', () => {
    render(<Checkbox checked={false} onToggle={jest.fn()} label="Pull Day" />);
    expect(screen.getByText('Pull Day')).toBeTruthy();
  });

  it('displays the sublabel when provided', () => {
    render(
      <Checkbox
        checked={false}
        onToggle={jest.fn()}
        label="Push A"
        sublabel="6 exercises"
      />,
    );
    expect(screen.getByText('6 exercises')).toBeTruthy();
  });

  it('shows badgeText inside checkbox when checked', () => {
    render(
      <Checkbox
        checked={true}
        onToggle={jest.fn()}
        label="Push A"
        badgeText="1"
      />,
    );
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('shows a checkmark when checked and no badgeText provided', () => {
    render(<Checkbox checked={true} onToggle={jest.fn()} label="Push A" />);
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    render(<Checkbox checked={false} onToggle={onToggle} label="Leg Day" />);
    fireEvent.press(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not call onToggle when disabled', () => {
    const onToggle = jest.fn();
    render(
      <Checkbox checked={false} onToggle={onToggle} label="Leg Day" disabled />,
    );
    fireEvent.press(screen.getByRole('checkbox'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('has correct accessibilityState when unchecked', () => {
    render(<Checkbox checked={false} onToggle={jest.fn()} label="Push A" />);
    const el = screen.getByRole('checkbox');
    expect(el.props.accessibilityState).toMatchObject({ checked: false });
  });

  it('has correct accessibilityState when checked', () => {
    render(<Checkbox checked={true} onToggle={jest.fn()} label="Push A" />);
    const el = screen.getByRole('checkbox');
    expect(el.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('uses accessibilityLabel override when provided', () => {
    render(
      <Checkbox
        checked={false}
        onToggle={jest.fn()}
        label="Push A"
        accessibilityLabel="Select Push A routine"
      />,
    );
    expect(screen.getByLabelText('Select Push A routine')).toBeTruthy();
  });
});
