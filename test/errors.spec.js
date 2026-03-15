import { expect, test } from '@playwright/test';
import { expectDialogAfter, withHtml } from './base';

test(`zjax.debug = true`, withHtml(
  `
    <script type="module">
      await zjax;
      zjax.debug = true;
      zjax.parse();
    </script>
    <p>Check the console log</p>
  `,
  async (page) => {
    expect(page.console.log.every(msg => msg.startsWith('ZJAX DEBUG:'))).toBeTruthy();
  }
));

for (const handler of ['404', 'catchAll']) {
  test(`zjax.errors ${handler}`, withHtml(
    `
      <script type="module">
        await zjax;
        zjax.errors = {
          ${handler}($) {
            alert($.response.status + ' ' + $.response.statusText);
          },
        }
      </script>
      <a href="/test-404" z-swap="@click.prevent *">Test 404</a>
    `,
    async (page) => {
      const link = page.getByText('Test 404');
      await expect(link).toBeVisible();
      const [alert] = await expectDialogAfter(page, () => link.click(), 'alert', 'dismiss');
      expect(alert.message()).toEqual('404 Not Found');
    }
  ));
}
