/* eslint-disable no-undef */
const fs = require('fs');
const path = require('path');

describe('component spacing micro-tuning contract', () => {
  test('contains literal spacing values for button, modal, and card internals', () => {
    const cssPath = path.join(__dirname, 'App.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('.ui-button.secondary');
    expect(css).toContain('padding: 0 12px 0 8px;');

    expect(css).toContain('.profile-card');
    expect(css).toContain('gap: var(--space-3);');

    expect(css).toContain('.copy-row');
    expect(css).toContain('margin-top: 10px;');

    expect(css).toContain('.modal-scroll');
    expect(css).toContain('margin: var(--space-3) 0 var(--space-2);');

    expect(css).toContain('.modal-actions');
    expect(css).toContain('margin-top: var(--space-3);');
  });
});
