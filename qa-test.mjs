import puppeteer from 'puppeteer';

(async () => {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Capturar logs de la consola del juego
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('DEBUG') || text.includes('ERROR') || msg.type() === 'error') {
      console.log(`[GAME CONSOLE] ${msg.type().toUpperCase()}: ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[GAME ERROR] ${err.toString()}`);
  });

  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  console.log("Navigating to http://127.0.0.1:5173/ ...");
  await page.goto('http://127.0.0.1:5173/');
  
  console.log("Waiting for game to load...");
  await wait(3000); // Wait for the menu

  console.log("Clicking through menus...");
  const clicked = await page.evaluate(async () => {
    const clickText = (text) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.toUpperCase().includes(text.toUpperCase()));
      if (btn) { btn.click(); return true; }
      return false;
    };
    
    // Intro screen
    clickText('TOCAR');
    await new Promise(r => setTimeout(r, 1000));
    
    // Main menu
    if (clickText('Jugar') || clickText('Nueva')) {
      return true;
    }
    return false;
  });
  
  if (clicked) {
    console.log("Started game, waiting for Level 1 to load...");
    await wait(4000); 
    await page.screenshot({ path: 'screenshot.png' });
    console.log("Screenshot saved to screenshot.png");
  } else {
    console.log("Could not find Play button automatically. Dumping HTML...");
    console.log(await page.content());
  }

  await browser.close();
  console.log("Done.");
})();
