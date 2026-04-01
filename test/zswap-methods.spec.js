import { expect, test } from '@playwright/test';
import { withHtml } from './base';

const startsWith = (prefix) => new RegExp(`^${prefix}`);
const contains = (needle) => new RegExp(`${needle}`);

function expectEcho(textOrRegexes) {
  return async function(page) {
    const fetcher = page.getByText('Fetch');
    const placeholder = page.getByText('This will be replaced by Zjax');

    await expect(fetcher).toBeVisible();
    await expect(placeholder).toBeVisible();

    await fetcher.click();

    await expect(fetcher).toBeVisible();
    await expect(placeholder).not.toBeVisible();

    const echo = await page.getByText('/echo');
    await expect(echo).toBeVisible();
    for (const textOrRegex of textOrRegexes) {
      await expect(echo).toHaveText(textOrRegex);
    }
  }
}

for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
  const msg = 'hello_zjax';
  test(`z-swap @submit ${method}`, withHtml(
    `
      <form action="/echo" z-swap="@submit.prevent ${method} pre">
        <input type="text" name="msg" value="${msg}"/>
        <input type="submit" value="Fetch (${method})"/>
      </form>
      <pre>This will be replaced by Zjax</pre>
    `,
    expectEcho([
      startsWith(method),
      contains('msg'),
      contains(msg),
    ])
  ));
}

test('z-swap method overrides form method', withHtml(
  `
    <form method="POST" action="/echo" z-swap="@submit.prevent DELETE pre">
      <input type="submit" value="Fetch (form=POST vs zswap=DELETE)"/>
    </form>
    <pre>This will be replaced by Zjax (should be DELETE)</pre>
  `,
  expectEcho(['DELETE /echo?'])
));


test('z-swap endpoint overrides form action', withHtml(
  `
    <form action="../assets/mobydick.html" z-swap="@submit.prevent /echo pre">
      <input type="submit" value="Fetch (form=MobyDick vs zswap=Echo)"/>
    </form>
    <pre>This will be replaced by Zjax (should be Echo)</pre>
  `,
  expectEcho(['GET /echo?'])
));


test('z-swap endpoint overrides href', withHtml(
  `
    <a href="../assets/mobydick.html" z-swap="@click.prevent DELETE /echo pre->p">
      Fetch (href=MobyDick vs zswap=Echo)
    </a>
    <p>This will be replaced by Zjax (should be Echo)</p>
  `,
  expectEcho(['DELETE /echo'])
));
