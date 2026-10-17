import { describe, it, expect } from 'vitest';
import { cashFlowSelection } from './cashFlowSelection';

describe('Cash Flow drill-down selection', () => {
  it('filters a category within the chart range', () => {
    expect(
      cashFlowSelection({ nodeType: 'subcategory', categoryId: 'groceries' }, '2026-08', '2026-10'),
    ).toEqual({
      categoryId: 'groceries',
      categoryGroupId: undefined,
      uncategorized: false,
      from: '2026-08-01',
      to: '2026-10-31',
    });
  });
  it('filters a group rather than retaining a previous category', () => {
    expect(
      cashFlowSelection({ nodeType: 'expense-group', groupId: 'food' }, '2026-10', '2026-10'),
    ).toMatchObject({ categoryId: undefined, categoryGroupId: 'food', uncategorized: false });
  });
  it.each(['subcategory', 'expense-group'] as const)(
    'explicitly filters uncategorized %s nodes',
    (nodeType) => {
      expect(
        cashFlowSelection({ nodeType, categoryId: null, groupId: null }, '2024-02', '2024-02'),
      ).toMatchObject({ uncategorized: true, from: '2024-02-01', to: '2024-02-29' });
    },
  );
});
