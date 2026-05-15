from pathlib import Path
import re

from playwright.sync_api import expect, sync_playwright


BASE_URL = "http://127.0.0.1:3000"
FORBIDDEN_COPY = [
    "Aksi cepat",
    "Modul ini memakai aksi",
    "student.fullName",
    "class.name",
    "value.value",
]


def assert_no_forbidden_copy(page):
    body = page.locator("body").inner_text()
    for text in FORBIDDEN_COPY:
        assert text not in body, f"Forbidden copy still visible: {text}"


def main():
    screenshots = Path(__file__).resolve().parents[1] / "test-results"
    screenshots.mkdir(exist_ok=True)
    console_errors = []
    request_failures = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("requestfailed", lambda request: request_failures.append(f"{request.url}: {request.failure}"))

        page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.locator('input[type="email"]').wait_for(timeout=30000)
        page.locator('input[type="email"]').fill("admin@madani-nidham.local")
        page.locator('input[type="password"]').fill("password")
        submit = page.get_by_role("button", name="Masuk", exact=True)
        expect(submit).to_be_enabled(timeout=30000)
        submit.click()
        expect(page).to_have_url(re.compile(r".*/dashboard"), timeout=30000)
        page.get_by_text("Isi absensi").first.wait_for(timeout=30000)

        routes = [
            ("/dashboard", "Isi absensi"),
            ("/students", "Tambah murid"),
            ("/attendance", "Catat absensi"),
            ("/journals", "Tulis jurnal"),
            ("/milestones", "Checklist perkembangan"),
            ("/reports", "Draft raport"),
            ("/announcements", "Tulis pengumuman"),
            ("/agendas", "Agenda bulan ini"),
            ("/registrations", "Pipeline pendaftaran"),
            ("/settings", "Pengaturan sekolah"),
            ("/users", "Akun baru"),
        ]

        for path, expected in routes:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("domcontentloaded")
            page.get_by_text(expected).first.wait_for(timeout=30000)
            assert_no_forbidden_copy(page)

        for path, name in [
            ("/dashboard", "dashboard"),
            ("/attendance", "attendance"),
            ("/students", "students"),
            ("/registrations", "registrations"),
        ]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("domcontentloaded")
            page.screenshot(path=str(screenshots / f"{name}-desktop.png"), full_page=True)

        page.set_viewport_size({"width": 390, "height": 900})
        for path, name in [
            ("/dashboard", "dashboard"),
            ("/attendance", "attendance"),
            ("/students", "students"),
            ("/registrations", "registrations"),
        ]:
            page.goto(f"{BASE_URL}{path}")
            page.wait_for_load_state("domcontentloaded")
            assert_no_forbidden_copy(page)
            page.screenshot(path=str(screenshots / f"{name}-mobile.png"), full_page=True)

        browser.close()

    if console_errors:
        raise AssertionError("Console errors: " + " | ".join(console_errors))

    print("dashboard redesign smoke ok")


if __name__ == "__main__":
    main()
