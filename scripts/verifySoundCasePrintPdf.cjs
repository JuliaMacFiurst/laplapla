const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.PRINT_LAB_URL || 'http://127.0.0.1:3000/internal/quest-print-lab';
const TMP = path.join(ROOT, 'tmp/pdfs/sound-case-001-regression');
const OUTPUT = path.join(ROOT, 'output/pdf');
const GOLDEN = path.join(ROOT, 'tests/fixtures/sound-case-001-print');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';
const REQUIRE_QUARTZ = process.env.REQUIRE_QUARTZ === '1';
const REPORT_PATH = path.join(TMP, 'verification-report.json');
const stageLabels = {
  '01': 'Открыть STAGE 01 — Sound Cards',
  '02': 'Открыть STAGE 02 — Vibrating Cards',
  '04': 'Открыть STAGE 04 — Broken Rhythm',
  '05': 'Открыть STAGE 05 — Scattered Sand',
  '07': 'Открыть STAGE 07 — Expert Club',
  REWARD: 'Открыть наградные Investigator Cards',
};
const fixtures = {
  ru: ['Анна', 'Леон', 'Вера', 'Эстер', 'Алиса', 'Габи', 'Марк', 'Илай', 'Никита'],
  en: ['Anna', 'Leon', 'Vera', 'Esther', 'Alice', 'Gabi', 'Mark', 'Eli', 'Nikita'],
  he: ['אנה', 'לאון', 'ורה', 'אסתר', 'אליסה', 'גבי', 'מארק', 'איליי', 'ניקיטה'],
};

async function executablePath() {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    if (!fs.existsSync(process.env.CHROME_EXECUTABLE_PATH)) throw new Error(`CHROME_EXECUTABLE_PATH does not exist: ${process.env.CHROME_EXECUTABLE_PATH}`);
    return process.env.CHROME_EXECUTABLE_PATH;
  }
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(mac)) return mac;
  const bundled = await require('@sparticuz/chromium').executablePath();
  if (!bundled || !fs.existsSync(bundled)) throw new Error('No Chromium executable is available');
  return bundled;
}

function requireCommand(command) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
  } catch {
    throw new Error(`Required PDF tool is missing: ${command}`);
  }
}

async function setInput(page, input, value) {
  await input.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await input.type(value);
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})));
  });
}

async function configureLocale(page, locale) {
  await page.emulateMediaType('screen');
  const localeButtons = await page.$$('.quest-print-lab__locale button');
  await localeButtons[{ ru: 0, en: 1, he: 2 }[locale]].click();
  for (let index = 2; index < 8; index += 1) await page.click('.quest-print-lab__add-participant');
  await setInput(page, await page.$('.quest-print-lab__lead input'), fixtures[locale][0]);
  const inputs = await page.$$('.quest-print-lab__participant input');
  for (let index = 0; index < inputs.length; index += 1) await setInput(page, inputs[index], fixtures[locale][index + 1]);
}

async function exportStage(page, stage, locale) {
  await page.emulateMediaType('screen');
  await page.click(`button[aria-label="${stageLabels[stage]}"]`);
  await waitForAssets(page);
  await page.emulateMediaType('print');
  const output = path.join(TMP, `${locale}-${stage}.pdf`);
  await page.pdf({ path: output, format: 'A4', printBackground: true, preferCSSPageSize: true });
  return output;
}

async function compareImages(actual, expected, { meanThreshold, changedFractionThreshold, label }) {
  const a = await sharp(actual).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const e = await sharp(expected).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.info.width !== e.info.width || a.info.height !== e.info.height) throw new Error(`Snapshot dimensions differ: ${actual}`);
  let difference = 0;
  let changedChannels = 0;
  const diff = Buffer.alloc(a.data.length);
  for (let index = 0; index < a.data.length; index += 1) {
    const channelDifference = Math.abs(a.data[index] - e.data[index]);
    difference += channelDifference;
    if (channelDifference > 20) changedChannels += 1;
    diff[index] = Math.min(255, channelDifference * 4);
  }
  const meanAbsoluteDifference = difference / a.data.length;
  const changedFraction = changedChannels / a.data.length;
  if (meanAbsoluteDifference > meanThreshold || changedFraction > changedFractionThreshold) {
    const diffPath = path.join(TMP, `${label}-diff.png`);
    await sharp(diff, { raw: a.info }).png().toFile(diffPath);
    throw new Error(`Visual regression in ${label}: mean ${meanAbsoluteDifference.toFixed(3)} > ${meanThreshold} or changed fraction ${changedFraction.toFixed(4)} > ${changedFractionThreshold}`);
  }
  return { meanAbsoluteDifference: Number(meanAbsoluteDifference.toFixed(3)), changedFraction: Number(changedFraction.toFixed(4)) };
}

function renderPoppler(pdf, pageNumber, outputBase) {
  execFileSync('pdftoppm', ['-f', String(pageNumber), '-l', String(pageNumber), '-png', '-r', '72', pdf, outputBase]);
  return `${outputBase}-${pageNumber}.png`;
}

function renderQuartz(pdf, pageNumber, output) {
  if (process.platform !== 'darwin' || !fs.existsSync('/usr/bin/sips')) {
    if (REQUIRE_QUARTZ) throw new Error('Quartz rendering is required but macOS sips is unavailable');
    return null;
  }
  const splitPattern = output.replace(/\.png$/, '-page-%d.pdf');
  const split = splitPattern.replace('%d', String(pageNumber));
  execFileSync('pdfseparate', ['-f', String(pageNumber), '-l', String(pageNumber), pdf, splitPattern]);
  execFileSync('/usr/bin/sips', ['-s', 'format', 'png', split, '--out', output], { stdio: 'ignore' });
  return output;
}

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.mkdirSync(GOLDEN, { recursive: true });
  for (const command of ['pdftoppm', 'pdfinfo', 'pdfimages', 'pdfseparate', 'pdfunite']) requireCommand(command);
  if (REQUIRE_QUARTZ && process.platform !== 'darwin') throw new Error('REQUIRE_QUARTZ=1 can only run on macOS');
  const browser = await puppeteer.launch({ executablePath: await executablePath(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const reports = {};
  const ruSections = [];

  for (const locale of ['ru', 'en', 'he']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1100, deviceScaleFactor: 1 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await configureLocale(page, locale);

    if (locale === 'ru') {
      for (const stage of ['01', '02', '04', '05', '07', 'REWARD']) ruSections.push(await exportStage(page, stage, locale));
    } else {
      await exportStage(page, '04', locale);
      await exportStage(page, 'REWARD', locale);
    }

    await page.emulateMediaType('screen');
    await page.click(`button[aria-label="${stageLabels['04']}"]`);
    await waitForAssets(page);
    await page.emulateMediaType('print');
    const stage4Geometry = await page.evaluate(() => Array.from(document.querySelectorAll('.quest-stage-4-cards-sheet--back .quest-stage-4-cut-object')).map((cut) => {
      const card = cut.querySelector('.quest-stage-4-card');
      const pattern = cut.querySelector('.quest-stage-4-card__back-pattern');
      const cutRect = cut.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const patternRect = pattern.getBoundingClientRect();
      const pxToMm = 25.4 / 96;
      return {
        widthMm: cardRect.width * pxToMm,
        heightMm: cardRect.height * pxToMm,
        insideCut: cardRect.left >= cutRect.left && cardRect.top >= cutRect.top && cardRect.right <= cutRect.right && cardRect.bottom <= cutRect.bottom,
        localPattern: pattern.getAttribute('viewBox') === '0 0 88 56' && patternRect.left >= cardRect.left && patternRect.top >= cardRect.top && patternRect.right <= cardRect.right && patternRect.bottom <= cardRect.bottom && patternRect.width > cardRect.width * 0.95 && patternRect.height > cardRect.height * 0.95,
        direction: card.getAttribute('dir'),
      };
    }));

    await page.emulateMediaType('screen');
    await page.click(`button[aria-label="${stageLabels.REWARD}"]`);
    await waitForAssets(page);
    await page.emulateMediaType('print');
    const rewardGeometry = await page.evaluate(() => Array.from(document.querySelectorAll('[data-collectible-card="front"]')).map((card) => {
      const cut = card.closest('.collectible-card-cut-area').getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const name = card.querySelector('.investigator-card__name').getBoundingClientRect();
      const title = card.querySelector('.investigator-card__title').getBoundingClientRect();
      return {
        name: card.querySelector('.investigator-card__name').textContent,
        widthMm: cardRect.width * 25.4 / 96,
        heightMm: cardRect.height * 25.4 / 96,
        insideCut: cardRect.left >= cut.left && cardRect.top >= cut.top && cardRect.right <= cut.right && cardRect.bottom <= cut.bottom,
        textSeparated: title.top >= name.bottom,
        printHeroVisible: getComputedStyle(card.querySelector('.investigator-card__hero-print')).display !== 'none',
        cssBackgroundRemoved: getComputedStyle(card.querySelector('.investigator-card__hero')).backgroundImage === 'none',
        direction: card.getAttribute('dir'),
      };
    }));

    const rewardPdf = path.join(TMP, `${locale}-REWARD.pdf`);
    const stage4Pdf = path.join(TMP, `${locale}-04.pdf`);
    const rewardPoppler = renderPoppler(rewardPdf, 1, path.join(TMP, `${locale}-reward-poppler`));
    const stage4Poppler = renderPoppler(stage4Pdf, 2, path.join(TMP, `${locale}-stage4-poppler`));
    const goldenReward = path.join(GOLDEN, `${locale}-reward-front.png`);
    const goldenStage4 = path.join(GOLDEN, `${locale}-stage4-back.png`);
    if (UPDATE) {
      fs.copyFileSync(rewardPoppler, goldenReward);
      fs.copyFileSync(stage4Poppler, goldenStage4);
    }
    const popplerRewardDifference = await compareImages(rewardPoppler, goldenReward, { meanThreshold: 8, changedFractionThreshold: 0.16, label: `${locale}-reward-poppler` });
    const popplerStage4Difference = await compareImages(stage4Poppler, goldenStage4, { meanThreshold: 5, changedFractionThreshold: 0.12, label: `${locale}-stage4-poppler` });

    const quartzReward = renderQuartz(rewardPdf, 1, path.join(TMP, `${locale}-reward-quartz.png`));
    const quartzStage4 = renderQuartz(stage4Pdf, 2, path.join(TMP, `${locale}-stage4-quartz.png`));
    const quartzRewardDifference = quartzReward ? await compareImages(quartzReward, goldenReward, { meanThreshold: 14, changedFractionThreshold: 0.25, label: `${locale}-reward-quartz` }) : null;
    const quartzStage4Difference = quartzStage4 ? await compareImages(quartzStage4, goldenStage4, { meanThreshold: 4.5, changedFractionThreshold: 0.08, label: `${locale}-stage4-quartz` }) : null;

    const imageTable = execFileSync('pdfimages', ['-list', rewardPdf], { encoding: 'utf8' });
    const hasOpaquePrintHeroes = (imageTable.match(/image\s+1200\s+1245\s+/g) || []).length === 9;
    const hasLargeSoftMask = /smask\s+1200\s+1245\s+/.test(imageTable);
    const expectedDirection = locale === 'he' ? 'rtl' : 'ltr';
    if (!rewardGeometry.every((card) => Math.abs(card.widthMm - 63) < 0.05 && Math.abs(card.heightMm - 88) < 0.05 && card.insideCut && card.textSeparated && card.printHeroVisible && card.cssBackgroundRemoved && card.direction === expectedDirection)) throw new Error(`${locale}: reward geometry, text, physical size, or RTL regression`);
    if (stage4Geometry.length !== 24 || !stage4Geometry.every((card) => Math.abs(card.widthMm - 88) < 0.05 && Math.abs(card.heightMm - 56) < 0.05 && card.insideCut && card.localPattern && card.direction === expectedDirection)) throw new Error(`${locale}: Stage 4 local pattern, boundary, physical size, or RTL regression`);
    if (!hasOpaquePrintHeroes || hasLargeSoftMask) throw new Error(`${locale}: printable hero is not an opaque raster`);

    reports[locale] = { rewardGeometry, stage4Geometry, hasOpaquePrintHeroes, hasLargeSoftMask, popplerRewardDifference, popplerStage4Difference, quartzRewardDifference, quartzStage4Difference };
    await page.close();
  }
  await browser.close();

  const fullPdf = path.join(OUTPUT, 'sound-case-001-full-ru.pdf');
  execFileSync('pdfunite', [...ruSections, fullPdf]);
  const info = execFileSync('pdfinfo', [fullPdf], { encoding: 'utf8' });
  if (!/^Pages:\s+24$/m.test(info)) throw new Error(`Expected 24 pages in ${fullPdf}`);
  if (!/^Page size:\s+594\.9\d* x 841\.9\d* pts \(A4\)$/m.test(info)) throw new Error(`Expected exact A4 pages in ${fullPdf}`);
  const result = { fullPdf, pageCount: 24, pageSize: 'A4 210×297 mm', quartzRequired: REQUIRE_QUARTZ, reports };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  fs.mkdirSync(TMP, { recursive: true });
  fs.writeFileSync(path.join(TMP, 'failure.log'), `${error.stack || error}\n`);
  console.error(error);
  process.exit(1);
});
