// 実際のサーバーとブラウザで、ルームの作成からゲームの成功までを通すテスト。
// 事前に npm run build が必要。部屋は使い捨ての DATA_DIR に作る。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 3941;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SHOTS = 'tools/e2e/shots';
mkdirSync(SHOTS, { recursive: true });

const dataDir = mkdtempSync(join(tmpdir(), 'ito-e2e-'));
const server = spawn(process.execPath, ['src/server/index.ts'], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, HOST_GRACE_MS: '60000' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise<void>((resolve, reject) => {
  server.stdout!.on('data', (chunk) => String(chunk).includes('ito:') && resolve());
  server.on('exit', () => reject(new Error('サーバーが起動しません')));
});

const errors: string[] = [];
let browser: Browser;
try {
  browser = await chromium.launch();
} catch (error) {
  server.kill();
  throw error;
}

async function open(name: string, url: string, viewport = { width: 1280, height: 800 }): Promise<Page> {
  const context = await browser.newContext({ viewport, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${name}: ${m.text()}`);
  });
  await page.goto(url);
  return page;
}

const shot = (page: Page, name: string) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function fillProfile(page: Page, nickname: string) {
  await page.getByPlaceholder('ここにニックネームを入力').fill(nickname);
}

/** 手札の数字 */
async function hand(page: Page): Promise<number[]> {
  return page.getByLabel('手札', { exact: true }).locator('[data-value]').evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.value)));
}

let exitCode = 0;
try {
  // ---- ルームを作る ----
  const host = await open('host', ORIGIN);
  await fillProfile(host, 'ホスト');
  await shot(host, '01-home');
  await button(host, 'ルームを作成').click();
  await host.waitForURL(/\/room\/[a-z]+-[a-z]+-[a-z]+$/);
  const roomUrl = host.url();
  await host.getByText('2人以上になったらゲームを開始できます。').waitFor();

  // ---- ゲストが参加する ----
  const guest = await open('guest', roomUrl, { width: 390, height: 844 });
  await guest.getByText('ニックネームを入力して、ルームに参加してください。').waitFor();
  await fillProfile(guest, 'ゲスト');
  await button(guest, 'ルームに参加').click();
  await guest.getByText('ホストのゲーム開始を待っています。').waitFor();
  await host.getByRole('list', { name: '参加者一覧' }).getByText('ゲスト').waitFor();
  await shot(host, '02-waiting-host');
  await shot(guest, '02-waiting-guest');

  // ---- お題を選ぶ ----
  await button(host, 'ゲーム開始').click();
  await host.getByText('お題の選択').waitFor();
  const firstTopic = guest.getByTestId('topic-card').first();
  await firstTopic.waitFor();
  const title = (await firstTopic.locator('h3').textContent())!;
  await firstTopic.click();
  await guest.getByText('（投票済み）').waitFor();
  await host.getByTestId('topic-card').filter({ hasText: '票: 1' }).waitFor();
  // カードが現れる演出を待ってから撮る
  await host.waitForTimeout(1500);
  await shot(host, '03-choose-topic');
  await host.getByTestId('topic-card').filter({ hasText: title }).click();

  // ---- カードを出す ----
  for (const page of [host, guest]) await page.getByText(`お題：${title}`).first().waitFor();
  await host.waitForTimeout(500);
  const hands = { host: await hand(host), guest: await hand(guest) };
  assert.equal(hands.host.length + hands.guest.length, 2);
  const order = [...hands.host.map((v) => ({ v, page: host })), ...hands.guest.map((v) => ({ v, page: guest }))].sort((a, b) => a.v - b.v);

  // たとえワードを書いて、最初のカードを出す
  const first = order[0];
  await first.page.getByLabel(`手札 ${first.v}`).getByRole('button', { name: 'たとえワードを入力する' }).click();
  await first.page.getByRole('textbox', { name: 'たとえワード' }).fill('お父さんの靴下');
  await button(first.page, '決定').click();
  await first.page.getByLabel(`手札 ${first.v}`).click();
  await button(first.page, '0 番目に出す').click();
  await host.getByTestId('field-card').first().waitFor();
  await shot(host, '04-place-one');

  // 途中で読み込み直しても、手札と場がそのまま
  await guest.reload();
  await guest.getByTestId('field-card').first().waitFor();
  const reloaded = await hand(guest);
  assert.deepEqual(reloaded, first.page === guest ? [] : hands.guest);

  const second = order[1];
  await second.page.getByLabel(`手札 ${second.v}`).click();
  await button(second.page, '1 番目に出す').click();
  await button(host, 'めくりフェーズへ！').click();

  // ---- めくる ----
  await guest.getByText('カードをめくろう！').waitFor();
  await shot(guest, '05-reveal-before');
  for (let i = 0; i < 2; i++) {
    await guest.getByRole('button', { name: /のカードをめくる$/ }).first().click();
    await guest.waitForTimeout(300);
  }
  await host.getByTestId('result').getByText('成功！').waitFor();
  await guest.getByTestId('result').getByText('成功！').waitFor();
  await shot(host, '06-success');

  // ---- 次のゲームはレベル 2 まで選べる ----
  await button(host, 'ロビーに戻る').last().click();
  await host.getByRole('combobox', { name: 'レベル' }).selectOption('2');
  await guest.getByText('レベル 2').waitFor();

  assert.deepEqual(errors, []);
  console.log('e2e: ok');
} catch (error) {
  exitCode = 1;
  console.error(error);
  if (errors.length) console.error('ブラウザのエラー:', errors);
} finally {
  await browser.close();
  server.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
process.exit(exitCode);
