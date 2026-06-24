const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport to a wide desktop for best layout
    await page.setViewport({ width: 1200, height: 1600 });

    const targetUrl = process.argv[2] || 'https://catalystscan.bostontechindia.in/dashboard/flyer.html';
    console.log(`Loading flyer page from ${targetUrl}...`);
    await page.goto(targetUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
    });

    // Wait extra for fonts to load
    await new Promise(r => setTimeout(r, 3000));

    const outputPath = path.join(__dirname, 'CatalystScan_v2.0_Flyer.pdf');
    
    console.log('Generating PDF...');
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: false
    });

    console.log(`PDF saved to: ${outputPath}`);
    await browser.close();
    console.log('Done!');
})();
