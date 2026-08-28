import http.server
import socketserver
import threading
import time
from playwright.sync_api import sync_playwright

PORT = 8087

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def run_server():
    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        httpd.serve_forever()

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto(f"http://localhost:{PORT}/index.html")
    page.wait_for_timeout(1000)

    # Switch to Pomodoro Mode
    page.click("button[data-mode='pomodoro']")
    page.wait_for_timeout(500)

    # Click Deep Focus Button
    page.click("#deepFocusBtn")
    page.wait_for_timeout(800)
    page.screenshot(path="verification_df_pomo_default.png")

    # Open DF Customize Panel
    page.click("#dfCustomizeBtn")
    page.wait_for_timeout(500)

    # Change style to Linear
    page.select_option("#dfPomoProgressStyleSelect", "linear")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_df_pomo_linear.png")

    # Change style to Wave
    page.select_option("#dfPomoProgressStyleSelect", "wave")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_df_pomo_wave.png")

    # Change style to Particles
    page.select_option("#dfPomoProgressStyleSelect", "particles")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_df_pomo_particles.png")

    # Toggle Ring off
    page.evaluate("document.getElementById('dfPomoShowRingToggle').click()")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_df_pomo_noring.png")

    # Exit DF
    page.click("#exitDeepFocus")
    page.wait_for_timeout(500)
    page.screenshot(path="verification_df_pomo_exited.png")

    browser.close()

print("Verification complete!")
