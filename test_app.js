const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:8080/index.html...');
  await page.goto('http://localhost:8080/index.html');
  await page.waitForTimeout(1000);

  // 1. Screenshot SAAT mode (Clock mode)
  await page.screenshot({ path: 'screenshot_clock_mode.png' });
  console.log('Saved screenshot_clock_mode.png');

  // 2. Open Deep Focus in Clock mode & click ÖZELLEŞTİR
  await page.click('#deepFocusBtn');
  await page.waitForTimeout(600);
  await page.click('#dfCustomizeBtn');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshot_clock_df_customize.png' });
  console.log('Saved screenshot_clock_df_customize.png');

  // Exit Deep Focus
  await page.click('#exitDeepFocus');
  await page.waitForTimeout(600);

  // 3. Switch to POMODORO mode
  await page.click('button[data-mode="pomodoro"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshot_pomodoro_mode.png' });
  console.log('Saved screenshot_pomodoro_mode.png');

  // 4. Open Deep Focus in POMODORO mode & click ÖZELLEŞTİR
  await page.click('#deepFocusBtn');
  await page.waitForTimeout(600);
  await page.click('#dfCustomizeBtn');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshot_pomodoro_df_customize.png' });
  console.log('Saved screenshot_pomodoro_df_customize.png');

  // Exit Deep Focus
  await page.click('#exitDeepFocus');
  await page.waitForTimeout(600);

  // 5. Open Settings Drawer
  await page.click('#settingsBtn');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshot_settings_drawer.png' });
  console.log('Saved screenshot_settings_drawer.png');

  await browser.close();
  console.log('Verification finished successfully.');
})();
