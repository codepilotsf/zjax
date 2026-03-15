import { expect, test } from '@playwright/test';
import { withHtml } from './base';

const fetcher = 'Fetch Moby Dick';
const placeholder = 'be replaced by Zjax';
const mobySnippet = 'Oh, Death, why canst thou not sometimes be timely?';
const mobyTitle = 'Herman Melville - Moby-Dick';

async function initialState(page) {
  page.fetcher = page.getByText(fetcher);
  page.placeholder = page.getByText(placeholder);
  page.mobyDick = page.getByText(mobySnippet);
  page.mobyDick.title = page.getByText(mobyTitle);

  await expect(page.fetcher).toBeVisible();
  await expect(page.placeholder).toBeVisible();
  await expect(page.mobyDick).not.toBeVisible();
  await expect(page.mobyDick.title).not.toBeVisible();
}

export async function runFetchAction(page, action) {
  // disable transitions because otherwise things will stay visible for some split-second
  await page.evaluate('window.zjax.transitions = false;');
  await Promise.all([
    page.waitForResponse('**'),
    action(page),
  ]);
}

function expectMobyDickAfter(action, {
  expectTitle = false,
  fetcherStays = true,
  placeholderStays = false,
} = {}) {
  return async (page) => {
    await initialState(page);
    await runFetchAction(page, action);

    if (fetcherStays) {
      await expect(page.fetcher).toBeVisible();
    }
    else {
      await expect(page.fetcher).not.toBeVisible()
    }

    if (placeholderStays) {
      await expect(page.placeholder).toBeVisible();
    }
    else {
      await expect(page.placeholder).not.toBeVisible()
    }

    await expect(page.mobyDick).toBeVisible();
    if (expectTitle) {
      await expect(page.mobyDick.title).toBeVisible();
    }
  }
}

function noChange(action) {
  return async (page) => {
    await initialState(page);
    await action(page);
    await initialState(page);
  }
}

/* 
  -----------------
  Test mouse events
  -----------------
*/
for (const [event, action] of [
  ['@click', ({ fetcher }) => fetcher.click()],
  ['@dblclick', ({ fetcher }) => fetcher.dblclick()],
  ['@auxclick', ({ fetcher }) => fetcher.click({ button: 'middle' })],
  ['@contextmenu', ({ fetcher }) => fetcher.click({ button: 'right' })],
  ['@mousemove', ({ fetcher }) => fetcher.hover()],
  ['@mouseover', ({ fetcher }) => fetcher.hover()],
  ['@mouseenter', ({ fetcher }) => fetcher.hover()],
  ['@mouseup', ({ fetcher, mouse }) => fetcher.hover().then(() => mouse.up())],
  ['@mousedown', ({ fetcher, mouse }) => fetcher.hover().then(() => mouse.down())],
  ['@mouseout', ({ fetcher, mouse }) => fetcher.hover().then(() => mouse.move(0, 0))],
  ['@mouseleave', ({ fetcher, mouse }) => fetcher.hover().then(() => mouse.move(0, 0))],
]) {
  test(`z-swap ${event}`, withHtml(
    `
      <button z-swap="${event} /test/assets/mobydick.html p">
        Fetch Moby Dick ${event}
      </button>
      <p>This will be replaced by Zjax</p>
    `,
    expectMobyDickAfter(action)
  ));
}

/* 
  --------------------
  Test keyboard events
  --------------------
*/
for (const [event, keys, expectXAfter] of [
  ['.any', 'Shift', expectMobyDickAfter],
  ['.enter', 'Enter', expectMobyDickAfter],
  ['.ctrl.enter', 'Enter', noChange],
  ['.alt.enter', 'Enter', noChange],
  ['.meta.enter', 'Enter', noChange],
  ['.shift.enter', 'Enter', noChange],
  ['.shift.enter', 'Shift+Enter', expectMobyDickAfter],
  ['.shift.enter', 'Control+Alt+Shift+Enter', expectMobyDickAfter], // unwanted modifier should still trigger
  ['.ctrl.alt.shift.meta.space', 'Control+Alt+Shift+Space', noChange],
  ['.ctrl.alt.shift.meta.space', 'Control+Alt+Shift+Meta+Space', expectMobyDickAfter],
  ['.ctrl.alt.shift.space', 'Control+Alt+Shift+Meta+Space', expectMobyDickAfter],
]) {
  test(`z-swap key${event} given ${keys}`, withHtml(
    `
      <div z-swap="@keyup.window${event} /test/assets/mobydick.html p">
        Fetch Moby Dick @keyup${event} 
      </div>
      <p>This will be replaced by Zjax</p>
    `,
    expectXAfter(page => page.keyboard.press(keys))
  ));
}

/* 
  ---------------------------
  Test mouse + keyboard combo
  ---------------------------
*/
for (const [wantedModifiers, givenModifiers, expectXAfter] of [
  ['.ctrl', [], noChange],
  ['.alt', [], noChange],
  ['.meta', [], noChange],
  ['.shift', [], noChange],
  ['.shift', ['Shift'], expectMobyDickAfter],
  ['', ['Shift'], expectMobyDickAfter], // unwanted modifier should still trigger
  ['.ctrl.alt.shift.meta', ['Control', 'Alt', 'Shift'], noChange],
  ['.ctrl.alt.shift.meta', ['Control', 'Alt', 'Shift', 'Meta'], expectMobyDickAfter],
  ['.ctrl.alt.shift', ['Control', 'Alt', 'Shift', 'Meta'], expectMobyDickAfter],
]) {
  test(`z-swap hover${wantedModifiers} given [${givenModifiers}]`, withHtml(
    `
      <div z-swap="@mouseenter${wantedModifiers} /test/assets/mobydick.html p">
        Fetch Moby Dick @mouseenter${wantedModifiers}
      </div>
      <p>This will be replaced by Zjax</p>
    `,
    expectXAfter(({ fetcher }) => fetcher.hover({ modifiers: givenModifiers }))
  ));
}

/*
  -----------
  Test @mount
  -----------
*/
test('z-swap @mount', withHtml(
  `
    <p z-swap="@mount /test/assets/mobydick.html p">
      This will immediately be replaced by Zjax
    </p>
  `,
  async (page) => await expect(page.getByText(mobySnippet)).toBeVisible()
));

/*
  -------------------------
  Test swapping from/to '*'
  -------------------------
*/
for (const [swapType, fetchOptions] of [
  ['p->*', { fetcherStays: false }],
  ['*->p', { expectTitle: true }],
  ['*->*', { expectTitle: true, fetcherStays: false }],
]) {
  test(`z-swap ${swapType}`, withHtml(
    `
      <a href="../assets/mobydick.html" z-swap="@click.prevent ${swapType}">Fetch Moby Dick</a>
      <p>This will be replaced by Zjax</p>
    `,
    expectMobyDickAfter(({ fetcher }) => fetcher.click(), fetchOptions)
  ));
}

/*
  ----------------------------
  Test swap type/response type
  ----------------------------
*/
const isSorted = (arr) => arr.every((val, i) => i === 0 || val >= arr[i - 1]);
for (const [responseType, response] of [
  ['inner', 'em+i'],
  ['outer', 'p:has(>em+i)'],
]) {
  const bContainingResponse = `b:has(>${response.replace(':has(', '').replace(')', '')})`;
  for (const [swapType, expectedResult, cssSelector] of [
    ['inner', [fetcher, mobySnippet], `a+${bContainingResponse}+hr`],
    ['outer', [fetcher, mobySnippet], `a+${response}+hr`],
    ['before', [fetcher, mobySnippet, placeholder], `a+${response}+b+hr`],
    ['after', [fetcher, placeholder, mobySnippet], `a+b+${response}+hr`],
    ['prepend', [fetcher, mobySnippet, placeholder], `a+${bContainingResponse}+hr`],
    ['append', [fetcher, placeholder, mobySnippet], `a+${bContainingResponse}+hr`],
    ['delete', [fetcher], `a+hr`],
    ['none', [fetcher, placeholder], `a+b+hr`],
  ]) {
    test(`z-swap ${responseType}->${swapType}`, withHtml(
      `
        <a z-swap="@click /test/assets/moby-snip.html p|${responseType}->b|${swapType}">Fetch Moby Dick</a>
        <b id="snip">This may be replaced by Zjax</b>
        <hr>
      `,
      async (page) => {
        const action = ({ fetcher }) => fetcher.click();
        if (['delete', 'none'].includes(swapType)) {
          await initialState(page);
          await runFetchAction(page, action);
        }
        else {
          await expectMobyDickAfter(action, {
            placeholderStays: expectedResult.includes(placeholder),
          })(page);
        }

        const pageContents = await page.locator(cssSelector).innerText();
        const positions = expectedResult.map(text => pageContents.indexOf(text));
        expect(isSorted(positions)).toBe(true);
      }
    ));
  }
}

/*
  --------------------------------
  Test swapping to empty/only node
  --------------------------------
*/
for (const [swapType, expectedResult] of [
  ['before', 'a+div>em+i+p'],
  ['after', 'a+div>p+em+i'],
  ['prepend', 'a+div>p>em+i'],
  ['append', 'a+div>p>em+i'],
]) {
  test(`z-swap on empty/only node: ${swapType}`, withHtml(
    `
      <a href="../assets/moby-snip.html" z-swap="@click.prevent p|inner->p|${swapType}">Fetch Moby Dick</a>
      <div><p></p></div>
    `,
    async (page) => {
      page.fetcher = page.getByText(fetcher);
      const mobyDick = page.getByText(mobySnippet);

      await expect(page.fetcher).toBeVisible();
      await runFetchAction(page, ({ fetcher }) => fetcher.click());
      await expect(page.locator(expectedResult)).toBeAttached();
      await expect(mobyDick).toBeVisible();
    }
  ));
}

/*
  ---------------------------------
  Test swapping with another z-swap
  ---------------------------------
*/
test(`z-swap with z-swap`, withHtml(
  `
    <a href="/test/assets/flip.html" z-swap="@click.prevent a,div|inner->div|append">Flip</a>
    <div id="accumulator"></div>
  `,
  async (page) => {
    const clicker = page.getByRole('link');
    const accumulator = page.locator('#accumulator');

    async function clickThenExpect(text) {
      await runFetchAction(page, () => clicker.click());
      await expect(accumulator.filter({ hasText: text })).toBeVisible();
    }

    await clickThenExpect('Flip');
    await clickThenExpect('FlipFlop');
    await clickThenExpect('FlipFlopFlip');
    await clickThenExpect('FlipFlopFlipFlop');
    await clickThenExpect('FlipFlopFlipFlopFlip');
    await clickThenExpect('FlipFlopFlipFlopFlipFlop');
  }
));

/*
  ------------------
  Test zjax.parse()
  ------------------
*/
test(`zjax.parse()`, withHtml(
  `
    <script type="module">
      const button = document.createElement("button");
      button.textContent = "Fetch Moby Dick";
      button.setAttribute("z-swap", "@click /test/assets/mobydick.html p");
      document.body.appendChild(button);
      await zjax;
      zjax.parse(button);
    </script>
    <p>This will be replaced by Zjax.</p>
  `,
  expectMobyDickAfter(({ fetcher }) => fetcher.click())
));
