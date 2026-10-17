import { afterAll, beforeAll, it, expect } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from '../db/index.js';
import { accounts, categories, categoryGroups, transactions } from '../db/schema.js';
import { transactionsRouter } from './transactions.js';
let server: Server;
let url: string;
beforeAll(async () => {
  migrate(db, { migrationsFolder: './src/db/migrations' });
  db.insert(accounts).values({ id: 'bank', name: 'Bank', type: 'checking' }).run();
  db.insert(categoryGroups).values({ id: 'food', name: 'Food' }).run();
  db.insert(categories)
    .values([
      { id: 'groceries', name: 'Groceries', groupId: 'food' },
      { id: 'dining', name: 'Dining', groupId: 'food' },
    ])
    .run();
  db.insert(transactions)
    .values([
      { id: 'g', accountId: 'bank', date: '2026-10-03', amount: -100, categoryId: 'groceries' },
      { id: 'd', accountId: 'bank', date: '2026-10-03', amount: -200, categoryId: 'dining' },
      { id: 'u', accountId: 'bank', date: '2026-10-03', amount: -300 },
      { id: 'old', accountId: 'bank', date: '2026-09-03', amount: -400 },
      { id: 'adjust', accountId: 'bank', date: '2026-10-03', amount: -500, isAdjustment: 1 },
      {
        id: 'transfer',
        accountId: 'bank',
        date: '2026-10-03',
        amount: -600,
        transferTransactionId: 'other-side',
      },
      { id: 'parent', accountId: 'bank', date: '2026-10-03', amount: -700, isParent: 1 },
      {
        id: 'child',
        accountId: 'bank',
        date: '2026-10-03',
        amount: -700,
        categoryId: 'groceries',
        parentTransactionId: 'parent',
      },
      { id: 'upart', accountId: 'bank', date: '2026-10-03', amount: -800, isParent: 1 },
      {
        id: 'uchild',
        accountId: 'bank',
        date: '2026-10-03',
        amount: -800,
        parentTransactionId: 'upart',
      },
    ])
    .run();
  const app = express();
  app.use('/transactions', transactionsRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.on('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/transactions`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
async function ids(query: string) {
  const response = await fetch(`${url}?from=2026-10-01&to=2026-10-31&${query}`);
  expect(response.status).toBe(200);
  const rows = (await response.json()) as { id: string }[];
  return rows.map((r) => r.id).sort();
}
it('filters category and group selections, including splits', async () => {
  expect(await ids('category_id=groceries')).toEqual(['g', 'parent']);
  expect(await ids('category_group_id=food')).toEqual(['d', 'g', 'parent']);
});
it('uncategorized selection excludes categorized entries, other dates, transfers, adjustments and categorized-only splits', async () => {
  expect(await ids('uncategorized=1')).toEqual(['u', 'upart']);
});
