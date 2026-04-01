import { expect, test } from '@playwright/test';
import { withHtml } from './base';

test(`zjax + turbo`, withHtml(
  `
    <script type="module" src="https://cdn.jsdelivr.net/npm/@hotwired/turbo@latest/dist/turbo.es2017-esm.min.js"></script>
    <a href="../assets/mobydick.html">Fetch Moby Dick</a>
  `,
  async (page) => {
    const fetcher = page.fetcher = page.getByText('Fetch Moby Dick');
    const mobyDick = page.getByText('Oh, Death, why canst thou not sometimes be timely?');

    await expect(fetcher).toBeVisible();
    await expect(mobyDick).not.toBeVisible();

    await fetcher.click();

    await expect(fetcher).not.toBeVisible();
    await expect(mobyDick).toBeVisible();
  }
));
