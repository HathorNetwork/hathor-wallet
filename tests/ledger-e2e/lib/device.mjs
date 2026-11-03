/**
 * Drives the emulated device through Speculos's REST API: reads the screen
 * text and presses buttons, so a flow can approve prompts and assert what
 * the device showed.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Device {
  constructor(apiUrl) {
    this.api = apiUrl.replace(/\/$/, '');
  }

  async screen() {
    const res = await fetch(`${this.api}/events?currentscreenonly=true`);
    const { events = [] } = await res.json();
    return events.map((e) => e.text).filter(Boolean);
  }

  async press(button) {
    await fetch(`${this.api}/button/${button}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'press-and-release' }),
    });
  }

  /** Waits until the screen satisfies `predicate(texts)`; returns the texts. */
  async waitForScreen(predicate, { timeout = 20000, interval = 200, what = 'screen' } = {}) {
    const end = Date.now() + timeout;
    let last = [];
    while (Date.now() < end) {
      try {
        last = await this.screen();
        if (predicate(last)) return last;
      } catch (_e) { /* emulator still starting */ }
      await sleep(interval);
    }
    throw new Error(`timed out waiting for ${what}; last screen: ${JSON.stringify(last)}`);
  }

  waitForText(text, opts = {}) {
    return this.waitForScreen((t) => t.some((x) => x.includes(text)), { what: `"${text}"`, ...opts });
  }

  /** Presses `button` and waits for the screen to change. */
  async step(button) {
    const before = JSON.stringify(await this.screen());
    await this.press(button);
    return this.waitForScreen((t) => JSON.stringify(t) !== before, { timeout: 5000, what: 'screen change' })
      .catch(() => this.screen());
  }

  /**
   * Walks a confirmation flow that begins with `firstText`, pressing right
   * and recording every screen until one says `stopText`, then presses both
   * buttons on it. Returns the screens seen, in order.
   */
  async walkAndConfirm(firstText, { stopText = 'Approve', maxSteps = 30, timeout = 30000 } = {}) {
    const screens = [await this.waitForText(firstText, { timeout })];
    for (let i = 0; i < maxSteps; i += 1) {
      const current = screens[screens.length - 1];
      if (current.some((x) => x === stopText)) {
        await this.press('both');
        return screens;
      }
      screens.push(await this.step('right'));
    }
    throw new Error(`"${stopText}" not reached after ${maxSteps} steps: ${JSON.stringify(screens)}`);
  }

  /**
   * Joins a paged field (bnnn_paging) back together: on Nano S Plus a long
   * value is split over several screens, each titled e.g. "Address (1/2)".
   */
  static field(screens, title) {
    const parts = [];
    for (const s of screens) {
      if (!s.length) continue;
      const head = s[0].replace(/\s*\(\d+\/\d+\)$/, '');
      if (head === title) parts.push(s.slice(1).join(''));
    }
    return parts.join('');
  }
}
