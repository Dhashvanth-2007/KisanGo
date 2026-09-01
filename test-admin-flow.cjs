const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173');
  
  // 1. If role select page is visible, click Farmer
  try {
    await page.waitForSelector('text/Farmer', { timeout: 2000 });
    const farmerBtn = await page.$x("//button[contains(., 'Farmer')]");
    if (farmerBtn.length > 0) {
      await farmerBtn[0].click();
    }
  } catch (e) {
    console.log('Already on auth page maybe.');
  }

  // 2. Wait for mobile input
  await page.waitForSelector('input[type="tel"]');
  console.log('Entering admin phone...');
  await page.type('input[type="tel"]', '8903732621');
  
  // 3. Click Send OTP
  console.log('Clicking Send OTP...');
  const sendBtn = await page.$x("//button[contains(., 'Send OTP')]");
  if (sendBtn.length > 0) {
    await sendBtn[0].click();
  } else {
    console.log('Send OTP button not found!');
  }
  
  // 4. Wait for Admin OTP Panel
  console.log('Waiting for Admin OTP Panel...');
  await page.waitForSelector('text/HACKATHON ADMIN PANEL', { timeout: 10000 });
  await page.waitForTimeout(1000); // Wait for fetch
  
  console.log('Taking screenshot 1...');
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/20a68aa3-5447-42ac-a9b8-5bbfbe98395b/scratch/admin_panel.png' });
  
  // 5. Click Auto Fill
  console.log('Clicking Auto Fill...');
  const autoFillBtn = await page.$x("//button[contains(., 'Auto Fill')]");
  if (autoFillBtn.length > 0) {
    await autoFillBtn[0].click();
  }
  
  await page.waitForTimeout(500); // Wait for state update
  
  // 6. Click Verify
  console.log('Clicking Verify OTP...');
  const verifyBtn = await page.$x("//button[contains(., 'Verify')]");
  if (verifyBtn.length > 0) {
    await verifyBtn[0].click();
  }
  
  // 7. Wait for Admin Dashboard
  console.log('Waiting for Admin Dashboard...');
  await page.waitForSelector('text/HACKATHON ADMIN DASHBOARD', { timeout: 10000 });
  await page.waitForTimeout(1000);
  
  console.log('Taking screenshot 2...');
  await page.screenshot({ path: 'C:/Users/User/.gemini/antigravity/brain/20a68aa3-5447-42ac-a9b8-5bbfbe98395b/scratch/admin_dashboard.png' });
  
  console.log('Done!');
  await browser.close();
})();
