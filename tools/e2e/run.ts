// 実際のサーバーとブラウザで、ルームの作成からゲームの成功までを通すテスト。
// 事前に npm run build が必要。部屋は使い捨ての DATA_DIR に作る。
// E2E_ORIGIN を指定すると、起動済みのサーバー (本番など) に対して流す。部屋は 24 時間で自動的に消える
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

const PORT = 3941;
const REMOTE = process.env.E2E_ORIGIN;
const ORIGIN = REMOTE ?? `http://127.0.0.1:${PORT}`;
const SHOTS = 'tools/e2e/shots';
mkdirSync(SHOTS, { recursive: true });

const dataDir = mkdtempSync(join(tmpdir(), 'ito-e2e-'));
let server: ChildProcess | null = null;
if (!REMOTE) {
  const child = spawn(process.execPath, ['src/server/index.ts'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, HOST_GRACE_MS: '60000' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  server = child;
  await new Promise<void>((resolve, reject) => {
    child.stdout!.on('data', (chunk) => String(chunk).includes('ito:') && resolve());
    child.on('exit', () => reject(new Error('サーバーが起動しません')));
  });
}

const errors: string[] = [];
let browser: Browser;
try {
  browser = await chromium.launch();
} catch (error) {
  server?.kill();
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

/** マウスでドラッグして、カードの間の位置 index に落とす。「ここに出す」はドラッグを始めてから現れる */
async function dragToSlot(page: Page, source: ReturnType<Page['locator']>, index: number) {
  await source.hover();
  await page.mouse.down();
  const box = (await source.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 - 10, { steps: 5 });
  const slot = button(page, `${index} 番目に出す`);
  await slot.waitFor();
  await slot.hover();
  await page.mouse.up();
}

async function fillProfile(page: Page, nickname: string) {
  await page.getByLabel('ニックネーム', { exact: true }).fill(nickname);
}

/** 手札の数字 */
async function hand(page: Page): Promise<number[]> {
  return page
    .getByLabel('手札', { exact: true })
    .locator('[data-value]')
    .evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.value)));
}

let exitCode = 0;
try {
  // ---- ルームを作る ----
  const host = await open('host', ORIGIN);
  await fillProfile(host, 'ホスト');
  await shot(host, '01-home');
  {
    const phone = await open('phone', ORIGIN, { width: 390, height: 844 });
    await shot(phone, '01-home-phone');
    await phone.context().close();
  }
  await button(host, 'ルームを作成').click();
  await host.waitForURL(/\/room\/[a-z]+-[a-z]+-[a-z]+-[a-z0-9]{4}$/);
  const roomUrl = host.url();
  await host.getByText('2人以上で開始できます。').waitFor();

  // ---- ゲスト 2 人が参加する (1 人はスマホ) ----
  const guest = await open('guest', roomUrl, { width: 390, height: 844 });
  await guest.getByText('ニックネームを入力して、ルームに参加してください。').waitFor();
  await fillProfile(guest, 'ゲスト');
  await button(guest, 'ルームに参加').click();
  await guest.getByText('ホストのゲーム開始を待っています。').waitFor();
  const guest2 = await open('guest2', roomUrl);
  await fillProfile(guest2, 'ゲスト2');
  await button(guest2, 'ルームに参加').click();
  await guest2.getByText('ホストのゲーム開始を待っています。').waitFor();
  const members = host.getByRole('list', { name: '参加者一覧' });
  for (const name of ['ゲスト', 'ゲスト2']) await members.getByText(name, { exact: true }).waitFor();
  await shot(host, '02-waiting-host');
  await shot(guest, '02-waiting-guest');

  // ルームの QR コード (QR を作る部品は、開いたときに読み込む)
  await button(guest, 'QRコード').click();
  await guest.getByRole('img', { name: 'ルームのQRコード' }).waitFor();
  assert.ok(await guest.getByText(roomUrl, { exact: true }).isVisible());
  await guest.waitForTimeout(500);
  await shot(guest, '02-qr-guest');
  await guest.keyboard.press('Escape');
  const players = [host, guest, guest2];

  // ---- お題を選ぶ: 3 人とも同じお題に投票すると決まる ----
  await button(host, 'ゲーム開始').click();
  for (const page of players) await page.getByText('お題の選択').waitFor();
  const firstTopic = guest.getByTestId('topic-card').first();
  await firstTopic.waitFor();
  const title = (await firstTopic.locator('h3').textContent())!;
  await firstTopic.click();
  await guest.getByText('（投票済み）').waitFor();
  await host.getByTestId('topic-card').filter({ hasText: '票: 1' }).waitFor();
  // カードが現れる演出を待ってから撮る
  await host.waitForTimeout(1500);
  await shot(host, '03-choose-topic');
  await shot(guest, '03-choose-topic-guest');
  await guest2.getByTestId('topic-card').filter({ hasText: title }).click();
  await host.getByTestId('topic-card').filter({ hasText: '票: 2' }).waitFor();
  await host.getByTestId('topic-card').filter({ hasText: title }).click();

  // ---- カードを出す ----
  for (const page of players) await page.getByText(`お題：${title}`).first().waitFor();
  await host.waitForTimeout(500);
  const hands = new Map<Page, number[]>();
  for (const page of players) hands.set(page, await hand(page));
  const order = players.flatMap((page) => hands.get(page)!.map((v) => ({ v, page }))).sort((a, b) => a.v - b.v);
  assert.equal(order.length, 3);
  assert.equal(new Set(order.map((c) => c.v)).size, 3);

  // まだ出していない人に 3 人とも並ぶ
  for (const name of ['ホスト', 'ゲスト', 'ゲスト2']) await host.getByTestId('waiting-for').getByText(name, { exact: true }).waitFor();

  for (const [index, card] of order.entries()) {
    if (index === 0) {
      // 最初のカードには、たとえワードを書いてから出す
      await card.page.getByLabel(`手札 ${card.v}`).getByRole('button', { name: 'たとえワードを入力する' }).click();
      await card.page.getByRole('textbox', { name: 'たとえワード' }).fill('お父さんの靴下');
      await button(card.page, '決定').click();
    }
    if (index === order.length - 1 && card.page !== guest) {
      // 最後のカードは、手札からドラッグして出す (スマホの大きさの guest 以外)
      await dragToSlot(card.page, card.page.getByLabel(`手札 ${card.v}`), index);
    } else {
      await card.page.getByLabel(`手札 ${card.v}`).click();
      await button(card.page, `${index} 番目に出す`).click();
    }
    for (const page of players) await page.getByTestId('field-card').nth(index).waitFor();
    if (index === 0) {
      await shot(host, '04-place-one');
      await guest.waitForTimeout(800);
      await shot(guest, '04-place-one-guest');
      // 途中で読み込み直しても、手札と場がそのまま
      await guest.reload();
      await guest.getByTestId('field-card').first().waitFor();
      assert.deepEqual(await hand(guest), card.page === guest ? [] : hands.get(guest));
    }
  }

  // 場に出した自分のカードを、ドラッグで右端へ動かし、左端へ戻す (PC の大きさの人のカードで)
  const mover = order.find((card) => card.page !== guest)!;
  const ownFieldCard = () =>
    mover.page
      .getByTestId('field-card')
      .filter({ has: mover.page.locator(`[data-value="${mover.v}"]`) })
      .locator('[draggable="true"]');
  const fieldValues = () => host.getByTestId('field-card').evaluateAll((els) => els.map((el) => el.getAttribute('data-card-id')));
  const before = await fieldValues();
  await dragToSlot(mover.page, ownFieldCard(), 3);
  await host.waitForFunction(
    (prev) => [...document.querySelectorAll('[data-testid="field-card"]')].map((el) => el.getAttribute('data-card-id')).join() !== prev,
    before.join(),
  );
  const movedRight = (await fieldValues()).join();
  await dragToSlot(mover.page, ownFieldCard(), 0);
  await host.waitForFunction(
    (prev) => [...document.querySelectorAll('[data-testid="field-card"]')].map((el) => el.getAttribute('data-card-id')).join() !== prev,
    movedRight,
  );
  // 小さい順に戻すため、動かしたカードを元の位置へ
  const target = order.indexOf(mover);
  if (target !== 0) await dragToSlot(mover.page, ownFieldCard(), target + 1);
  await host.waitForFunction(
    (expected) =>
      [...document.querySelectorAll('[data-testid="field-card"]')].map((el) => el.getAttribute('data-card-id')).join() === expected,
    before.join(),
  );

  await button(host, 'めくりフェーズへ！').click();

  // ---- めくる: 3 人がそれぞれ 1 枚ずつ ----
  for (const page of players) await page.getByText('カードをめくろう！').waitFor();
  await shot(guest, '05-reveal-before');
  for (const page of [guest, guest2, host]) {
    await page
      .getByRole('button', { name: /のカードをめくる$/ })
      .first()
      .click();
    await page.waitForTimeout(300);
  }
  for (const page of players) await page.getByTestId('result').getByText('成功！').waitFor();
  await shot(host, '06-success');
  await shot(guest, '06-success-guest');

  // ---- 次のゲームはレベル 2 まで選べる ----
  await button(host, 'ロビーに戻る').last().click();
  await host.getByRole('combobox', { name: 'レベル' }).selectOption('2');
  for (const page of [guest, guest2]) await page.getByText('レベル 2').waitFor();

  // ---- 参加を締め切ると、新しく来た人は参加できない ----
  await button(host, '参加を締め切る').click();
  await guest.getByText('参加を締め切っています').waitFor();
  const stranger = await open('stranger', roomUrl, { width: 390, height: 844 });
  await stranger.getByText('このルームは参加を締め切っています。').waitFor();
  assert.equal(await stranger.getByLabel('ニックネーム', { exact: true }).count(), 0);
  await shot(stranger, '07-locked-stranger');
  await button(host, '受付を再開する').click();
  await stranger.getByLabel('ニックネーム', { exact: true }).waitFor();

  assert.deepEqual(errors, []);
  console.log('e2e: ok');
} catch (error) {
  exitCode = 1;
  console.error(error);
  if (errors.length) console.error('ブラウザのエラー:', errors);
} finally {
  await browser.close();
  server?.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
process.exit(exitCode);
