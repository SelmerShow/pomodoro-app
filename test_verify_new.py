import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto("http://127.0.0.1:8085/index.html")
        await page.wait_for_timeout(1000)

        # 1. Switch to Pomodoro Mode
        await page.click("button[data-mode='pomodoro']")
        await page.wait_for_timeout(500)
        await page.screenshot(path="verification_pomo_timeline.png")

        # 2. Start Pomodoro Etüt
        await page.click("#pomoMainStartPause")
        await page.wait_for_timeout(1500)
        await page.screenshot(path="verification_pomo_running.png")

        # 3. Change Progress Style to Fill
        await page.click("#settingsBtn")
        await page.wait_for_timeout(500)
        await page.select_option("#mainProgressStyleSelect", "fill")
        await page.wait_for_timeout(500)
        await page.click("#closeSettings")
        await page.screenshot(path="verification_pomo_fill.png")

        await browser.close()

asyncio.run(run())
