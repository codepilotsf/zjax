import { test, expect } from '@playwright/test';
import { withHtml } from './base';

test(`z-swap on click`, withHtml(
  `
    <a href="../assets/mobydick.html" z-swap="@click.prevent p">Fetch Moby Dick</a>
    <p>This will be replaced by Zjax</p>
  `,
  async (page) => {
    const fetcher = page.getByText('Fetch Moby Dick');
    const placeholder = page.getByText('This will be replaced by Zjax');
    const mobyDick = page.getByText('Oh, Death, why canst thou not sometimes be timely?');

    await expect(fetcher).toBeVisible();
    await expect(placeholder).toBeVisible();
    await expect(mobyDick).not.toBeVisible();

    await fetcher.click();

    await expect(fetcher).toBeVisible();
    await expect(placeholder).not.toBeVisible();
    await expect(mobyDick).toBeVisible();
  },
));
