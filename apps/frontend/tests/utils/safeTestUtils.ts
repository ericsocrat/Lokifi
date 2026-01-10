import { act, fireEvent, render } from '@testing-library/react';
import type { ReactElement } from 'react';

export async function safeRender(ui: ReactElement) {
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(ui);
  });
  // Flush any effects queued after initial mount
  await act(async () => {});
  // Non-null assertion safe after render
  return result!;
}

export async function safeClick(element: Element) {
  await act(async () => {
    fireEvent.click(element);
    await Promise.resolve();
  });
}

export async function safeChange(element: Element, value: unknown) {
  await act(async () => {
    fireEvent.change(element as HTMLInputElement, { target: { value } });
    await Promise.resolve();
  });
}
