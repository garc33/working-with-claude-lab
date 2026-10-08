const fs = require('fs');
const { loadApp, APP_PATH, HTML_PATH } = require('./setup/loadApp');

const CSS_PATH = HTML_PATH.replace(/index\.html$/, 'style.css');

function theme() {
  return document.documentElement.getAttribute('data-theme');
}

function toggle() {
  return document.getElementById('theme-toggle');
}

/** The custom property names defined in the CSS rule whose selector is exactly `selector`. */
function tokensIn(css, selector) {
  const start = css.indexOf(selector + ' {');
  expect(start).toBeGreaterThanOrEqual(0);
  const body = css.slice(start, css.indexOf('}', start));
  return (body.match(/--[\w-]+(?=\s*:)/g) || []).sort();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  delete window.matchMedia;
});

describe('theme toggle (TODO-231)', () => {
  test('AC-1: the header has a #theme-toggle button', async () => {
    await loadApp();
    const button = document.querySelector('#app-header #theme-toggle');
    expect(button).not.toBeNull();
    expect(button.getAttribute('type')).toBe('button');
  });

  test('AC-4: with nothing stored the page starts dark and offers light', async () => {
    await loadApp();
    expect(theme()).toBe('dark');
    expect(toggle().textContent).toMatch(/light/i);
  });

  test('AC-4: an unrecognised stored value falls back to dark', async () => {
    localStorage.setItem('ops-theme', 'purple');
    await loadApp();
    expect(theme()).toBe('dark');
  });

  test('AC-4: the OS colour-scheme preference is ignored', async () => {
    window.matchMedia = (query) => ({ matches: query.includes('light'), media: query });
    await loadApp();
    expect(theme()).toBe('dark');
  });

  test('AC-1: clicking switches between dark and light and relabels the button', async () => {
    await loadApp();
    toggle().click();
    expect(theme()).toBe('light');
    expect(toggle().textContent).toMatch(/dark/i);
    toggle().click();
    expect(theme()).toBe('dark');
    expect(toggle().textContent).toMatch(/light/i);
  });

  test('AC-3: clicking saves the choice in localStorage', async () => {
    await loadApp();
    toggle().click();
    expect(localStorage.getItem('ops-theme')).toBe('light');
  });

  test('AC-3: a stored choice is restored on load', async () => {
    localStorage.setItem('ops-theme', 'light');
    await loadApp();
    expect(theme()).toBe('light');
  });

  test('AC-2: colours live only in CSS variables, and both themes define every token', () => {
    const js = fs.readFileSync(APP_PATH, 'utf8');
    expect(js).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);

    const css = fs.readFileSync(CSS_PATH, 'utf8');
    const colourLines = css.split('\n').filter((line) => /#[0-9a-f]{3,8}\b/i.test(line));
    expect(colourLines.length).toBeGreaterThan(0);
    for (const line of colourLines) {
      expect(line.trim()).toMatch(/^--/);
    }

    const dark = tokensIn(css, ':root');
    expect(dark.length).toBeGreaterThan(0);
    expect(tokensIn(css, ':root[data-theme="light"]')).toEqual(dark);
    expect(css).toMatch(/\.chart-svg \.bar \{\s*fill: var\(--/);
  });
});
