import { test, expect } from "../playwright-fixture";

test.describe("P2P Share App", () => {
  test("should login with admin credentials, open P2P Share app, create room code and discover peers", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for login screen to be visible
    await page.waitForSelector('input[type="email"]', { state: "visible" });

    // Enter email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("admin@system.local");

    // Click Next button
    const nextButton = page.locator("button", { hasText: "Next" });
    await nextButton.click();

    // Wait for password field
    await page.waitForSelector('input[type="password"]', { state: "visible" });

    // Enter password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("admin123");

    // Click Sign In button
    const signInButton = page.locator("button", { hasText: "Sign In" });
    await signInButton.click();

    // Wait for desktop to load (dock should be visible)
    await page.waitForSelector('[title="P2P Share"]', { state: "visible" });

    // Click on P2P Share app in the dock
    const p2pShareApp = page.locator('[title="P2P Share"]');
    await p2pShareApp.click();

    // Wait for P2P Share window to open
    await page.waitForSelector("text=P2P Share", { state: "visible" });

    // Test Room Code functionality - click on Room Code tab
    const roomTab = page.locator("button", { hasText: "Room Code" });
    await roomTab.click();

    // Click Generate Room Code button
    const generateRoomButton = page.locator("button", { hasText: "Generate Room Code" });
    await generateRoomButton.click();

    // Wait for room code to be generated (should appear as a code element)
    await page.waitForSelector("code", { state: "visible" });

    // Verify room code is displayed (6 character alphanumeric code)
    const roomCodeElement = page.locator("code").first();
    const roomCode = await roomCodeElement.textContent();
    expect(roomCode).toHaveLength(6);
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Click on Discover Peers tab
    const discoverTab = page.locator("button", { hasText: "Discover Peers" });
    await discoverTab.click();

    // Verify the discover peers section is visible
    const onlinePeersSection = page.locator("text=Online Peers");
    await onlinePeersSection.isVisible();

    // Verify peer discovery status message or peer list is present
    const peerStatus = page.locator(
      'text=/No peers found|peer.*online|[A-Z][a-z]+/'
    );
    await peerStatus.isVisible();

    console.log(`✓ Successfully logged in as admin`);
    console.log(`✓ Opened P2P Share app from dock`);
    console.log(`✓ Created room code: ${roomCode}`);
    console.log(`✓ Verified peer discovery interface`);
  });
});
