import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})

        print("Navigating to http://localhost:8080/index.html...")
        await page.goto("http://localhost:8080/index.html")
        await page.wait_for_timeout(1000)

        # 1. Screenshot SAAT mode (Clock mode)
        await page.screenshot(path="screenshot_clock_mode.png")
        print("Saved screenshot_clock_mode.png")

        # 2. Open Deep Focus in Clock mode & click ÖZELLEŞTİR
        await page.click("#deepFocusBtn")
        await page.wait_for_timeout(600)
        await page.click("#dfCustomizeBtn")
        await page.wait_for_timeout(600)
        await page.screenshot(path="screenshot_clock_df_customize.png")
        print("Saved screenshot_clock_df_customize.png")

        # Exit Deep Focus
        await page.click("#exitDeepFocus")
        await page.wait_for_timeout(600)

        # 3. Switch to POMODORO mode
        await page.click("button[data-mode='pomodoro']")
        await page.wait_for_timeout(800)
        await page.screenshot(path="screenshot_pomodoro_mode.png")
        print("Saved screenshot_pomodoro_mode.png")

        # 4. Open Deep Focus in POMODORO mode & click ÖZELLEŞTİR
        await page.click("#deepFocusBtn")
        await page.wait_for_timeout(600)
        await page.click("#dfCustomizeBtn")
        await page.wait_for_timeout(600)
        await page.screenshot(path="screenshot_pomodoro_df_customize.png")
        print("Saved screenshot_pomodoro_df_customize.png")

        # Exit Deep Focus
        await page.click("#exitDeepFocus")
        await page.wait_for_timeout(600)

        # 5. Open Settings Drawer
        await page.click("#settingsBtn")
        await page.wait_for_timeout(600)
        await page.screenshot(path="screenshot_settings_drawer.png")
        print("Saved screenshot_settings_drawer.png")

        await browser.close()
        print("Verification finished successfully.")

asyncio.run(run())
