import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 800})
        await page.goto('http://localhost:8085/index.html')

        # Switch to Pomodoro mode
        await page.click('button[data-mode="pomodoro"]')
        await page.wait_for_timeout(500)
        await page.screenshot(path='verification_final_pomo.png')

        # Test accordion collapse
        await page.click('#pomoConfigHeader')
        await page.wait_for_timeout(400)
        await page.screenshot(path='verification_accordion_collapsed.png')

        # Test accordion expand
        await page.click('#pomoConfigHeader')
        await page.wait_for_timeout(400)

        # Select progress style 'linear'
        await page.select_option('#mainProgressStyleSelect', 'linear')
        await page.wait_for_timeout(400)
        await page.screenshot(path='verification_style_linear.png')

        # Select progress style 'wave'
        await page.select_option('#mainProgressStyleSelect', 'wave')
        await page.wait_for_timeout(400)
        await page.screenshot(path='verification_style_wave.png')

        # Deep focus mode screenshot
        await page.click('#deepFocusBtn')
        await page.wait_for_timeout(500)
        await page.screenshot(path='verification_final_df.png')

        await browser.close()

asyncio.run(run())
