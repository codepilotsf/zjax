import { expect, test } from '@playwright/test';
import { expectDialogAfter, withHtml } from './base';

test('z-action', withHtml(
  `
    <script type="module">
      await zjax;
      zjax.actions = {
        go($) {
          $.redirect($().getAttribute('href'));
        },
        menu: {
          showAll($) {
            $.all('[hidden]').forEach(item => item.hidden = false);
          },
          hide($) {
            $('nav').hidden = true;
          },
        },
      }
    </script>
    <button z-action="@click.stop menu.showAll">Go To...</button>
    <nav hidden z-action="@[keydown.document.escape,click.outside] menu.hide, @beforeunload.window.prevent $.event.returnValue=''">
      <button href="../assets/mobydick.html" z-action="@click go">Moby Dick</button>
      <button href="../assets/flip.html" z-action="@click go">Flip-Flop</button>
    </nav>
  `,
  async (page) => {
    const btnGoto = page.getByRole('button', { name: 'Go To...' });
    const nav = page.locator('nav');

    await expect(btnGoto).toBeVisible();
    await expect(nav).toBeHidden();

    async function showNav() {
      await btnGoto.click();
      await expect(nav).toBeVisible();

    }

    await showNav();
    await page.mouse.click(0,0);
    await expect(nav).toBeHidden();

    await showNav();
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();

    await showNav();
    const btnMoby = page.getByRole('button', { name: 'Moby Dick' });
    await expect(btnMoby).toBeVisible();

    await expectDialogAfter(page, () => btnMoby.click(), 'beforeunload', 'dismiss');
    await expect(page).toHaveURL('test/out/z-action.html'); // dismiss -> stay on same page
    await expect(btnGoto).toBeVisible();
    await expect(nav).toBeVisible();

    await expectDialogAfter(page, () => btnMoby.click(), 'beforeunload', 'accept');
    await expect(page).toHaveURL('/test/assets/mobydick.html');
    await expect(page.getByText('Herman Melville - Moby-Dick')).toBeVisible();

    await page.goBack();
    await expect(btnGoto).toBeVisible();
    await expect(nav).toBeHidden();
  }
));

/*
  -----------------------------------
  Test click.outside vs. click.window
  -----------------------------------
*/
for (const [event, expectedIncrement] of [
  ['@[click.stop, click.outside]', '1'],
  ['@[click.stop, click.window]', '1'],
  ['@[click, click.outside]', '1'],
  ['@[click, click.window]', '2'],
]) {
  test(`z-action ${event}`, withHtml(
    `
      <script type="module">
        await zjax;
        zjax.actions = {
          increment($) {
            $('#counter').textContent = parseInt($('#counter').textContent) + 1;
          }
        }
      </script>
      <button id="counter" z-action="${event} increment">0</button>
      <span>${event} increment the counter</span>
    `,
    async (page) => {
      const counter = page.locator('#counter');
      await expect(counter).toBeVisible();
      await expect(counter).toHaveText('0');
      await counter.click();
      await expect(counter).toHaveText(expectedIncrement);
    }
  ));
}

/*
  ------------------------
  Test debounce/delay/once
  ------------------------
*/
test(`z-action timing`, withHtml(
  `
    <script type="module">
      await zjax;
      zjax.actions = {
        counter($) {
          $().textContent = parseInt($().textContent) + 1 || 1;
        },
        clear($) {
          $.all('button').forEach(button => button.textContent = 0);
        }
      }
    </script>
    ${['@click', '@click.once', '@click.delay.999ms', '@click.debounce.1s'].map(event => 
      `<button z-action="${event} counter">${event}</button>`
    ).join('<br>')}
  `,
  async (page) => {
    const buttons = page.getByRole('button');
    const untimed = buttons.nth(0);
    const onced = buttons.nth(1)
    const delayed = buttons.nth(2);
    const debounced = buttons.nth(3);

    expect(untimed).toBeVisible();
    expect(onced).toBeVisible();
    expect(delayed).toBeVisible();
    expect(debounced).toBeVisible();

    await untimed.dblclick();
    await expect(untimed).toHaveText('2');

    await onced.dblclick();
    await expect(onced).toHaveText('1');

    await delayed.dblclick();
    await expect(delayed).toHaveText(/delay/);
    await expect(delayed).toHaveText('2');

    await debounced.dblclick();
    await expect(debounced).toHaveText(/debounce/);
    /* TODO: fix debounce */
    // await expect(debounced).toHaveText('1');

    await untimed.dblclick();
    await expect(untimed).toHaveText('4');

    await onced.dblclick();
    await expect(onced).toHaveText('1');

    await delayed.dblclick();
    await expect(delayed).toHaveText('2');
    await expect(delayed).toHaveText('4');

    await debounced.dblclick();
    // await expect(debounced).toHaveText('1');
    // await expect(debounced).toHaveText('2');
  }
));
