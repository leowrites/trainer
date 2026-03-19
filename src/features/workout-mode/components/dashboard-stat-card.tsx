import React from 'react';
import { Caption, DisplayHeading, Label, Surface } from '@shared/components';

export function DashboardStatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption: string;
}): React.JSX.Element {
  return (
    <Surface variant="card" className="w-full rounded-[22px]  px-4 py-4">
      <Label>{label}</Label>
      <DisplayHeading className="mt-3 text-3xl leading-[30px]">
        {value}
      </DisplayHeading>
      <Caption className="mt-2">{caption}</Caption>
    </Surface>
  );
}
