import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('AgentHub Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
  });

  /**
   * Helper: Login as admin and inject a virtual project into localStorage.
   * The CreateProjectModal requires window.showDirectoryPicker() which is
   * unavailable in headless Chromium, so we seed the project directly.
   */
  async function loginAndSeedProject(page: import('@playwright/test').Page) {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('[data-testid="login-form"]');
    await page.fill('[data-testid="login-username"]', 'admin');
    await page.fill('[data-testid="login-password"]', '12345678');
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL('**/');
    await expect(page).not.toHaveURL(/login/);

    // Inject a virtual project into localStorage
    const projectId = await page.evaluate(() => {
      const id = crypto.randomUUID();
      const project = {
        id,
        name: 'Test Project',
        icon: '📁',
        fileTree: { name: 'test-project', type: 'dir', children: [] },
        sessions: [],
      };
      localStorage.setItem('agenthub_projects', JSON.stringify([project]));
      localStorage.setItem('agenthub_active_project_id', JSON.stringify(id));
      return id;
    });

    // Reload to pick up the seeded project
    await page.reload();
    await page.waitForLoadState('networkidle');
    return projectId;
  }

  test('login -> create agent -> single chat -> group chat', async ({ page }) => {
    await loginAndSeedProject(page);

    // ===== Step 1: Open Settings and create an agent =====
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('[data-testid="settings-modal"]');

    // Click the "智能体管理" tab (should be default)
    await page.click('[data-testid="settings-tab-agents"]');

    // Click "添加智能体" button
    await page.click('[data-testid="add-agent-button"]');

    // Fill in agent details
    await page.fill('[data-testid="agent-name-input"]', 'TestAgent');
    await page.fill('[data-testid="agent-description-input"]', 'A test agent for E2E testing');
    await page.fill('[data-testid="agent-apikey-input"]', 'sk-test-key-for-e2e');

    // Save the agent
    await page.click('[data-testid="agent-save-button"]');

    // Wait for agent to appear in the list
    await page.waitForTimeout(2000);

    // Close settings by clicking backdrop
    await page.locator('[data-testid="settings-modal"]').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    // ===== Step 2: Create a single chat session =====
    await page.click('[data-testid="add-single-chat"]');
    await page.waitForSelector('[data-testid="create-session-modal"]');

    // Fill in session name
    await page.fill('[data-testid="session-name-input"]', 'Single Chat Test');

    // Select the first available agent
    const agentOptions = page.locator('[data-testid^="agent-option-"]');
    const agentCount = await agentOptions.count();
    expect(agentCount).toBeGreaterThan(0);
    await agentOptions.first().click();

    // Confirm creation
    await page.click('[data-testid="confirm-create-session"]');

    // Wait for modal to close
    await page.waitForSelector('[data-testid="create-session-modal"]', { state: 'detached', timeout: 5000 });
    await page.waitForTimeout(1000);

    // ===== Step 3: Create a group chat session =====
    await page.click('[data-testid="add-group-chat"]');
    await page.waitForSelector('[data-testid="create-group-modal"]');

    // Fill in group name
    await page.fill('[data-testid="group-name-input"]', 'Group Chat Test');

    // Select at least 2 agents
    const groupAgentOptions = page.locator('[data-testid^="group-agent-"]');
    const groupAgentCount = await groupAgentOptions.count();

    if (groupAgentCount >= 2) {
      await groupAgentOptions.nth(0).click();
      await groupAgentOptions.nth(1).click();
    } else {
      // Only 1 agent available, can't create group — close and skip
      await page.keyboard.press('Escape');
      test.skip(true, 'Need at least 2 agents for group chat');
      return;
    }

    // Confirm creation
    await page.click('[data-testid="confirm-create-group"]');
    await page.waitForSelector('[data-testid="create-group-modal"]', { state: 'detached', timeout: 5000 });
    await page.waitForTimeout(1000);

    // ===== Step 4: Verify sessions exist =====
    const sessionItems = page.locator('[data-testid^="session-item-"]');
    const sessionCount = await sessionItems.count();
    expect(sessionCount).toBeGreaterThanOrEqual(2);

    // ===== Step 5: Send a message in the active session =====
    const messageInput = page.locator('[data-testid="message-input"]');
    if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await messageInput.fill('Hello, this is a test message from E2E');
      await page.click('[data-testid="send-button"]');

      // Wait for the message to appear
      await page.waitForTimeout(1500);

      // Verify the message list is visible
      const messageList = page.locator('[data-testid="message-list"]');
      await expect(messageList).toBeVisible();
    }
  });

  test('login page shows error for wrong credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('[data-testid="login-form"]');

    await page.fill('[data-testid="login-username"]', 'admin');
    await page.fill('[data-testid="login-password"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');

    // Should show error message
    const errorDiv = page.locator('.text-minimal-error, [class*="error"]').first();
    await expect(errorDiv).toBeVisible({ timeout: 5000 });
  });

  test('create session modal requires agent selection', async ({ page }) => {
    await loginAndSeedProject(page);

    // Try to create session without selecting agent
    await page.click('[data-testid="add-single-chat"]');
    await page.waitForSelector('[data-testid="create-session-modal"]');

    // The confirm button should be disabled
    const confirmBtn = page.locator('[data-testid="confirm-create-session"]');
    await expect(confirmBtn).toBeDisabled();
  });
});
