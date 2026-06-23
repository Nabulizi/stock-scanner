'use client';

import { type ReactNode } from 'react';
import type { ScanRow } from '@/lib/types';
import { type SortDir, type SortKey } from '@/lib/sort';
import { formatCurrency, formatMarketCap, formatPe, formatPercent, NA } from '@/lib/format';
import { rowFreshness, FRESHNESS_LABEL, type Freshness } from '@/lib/freshness';
import { percentFromHigh } from '@/lib/range';

const FRESHNESS_TITLE: Record<Freshness, string> = {
  fresh: 'Fetched in this scan',
  cached: 'Served from cache; the original retrieval time is shown',
  stale: 'Older than 15 minutes — use Refresh for current data'
};

function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  return (
    <span className={`badge badge-${freshness}`} title={FRESHNESS_TITLE[freshness]}>
      {FRESHNESS_LABEL[freshness]}
    </span>
  );
}

// Stacked identity cell: ticker (primary) over company and industry (muted,
// truncated with a title tooltip). Replaces the former Ticker/Company/Industry
// columns so the table has a single clean left edge.
function IdentityCell({ row, freshness }: { row: ScanRow; freshness: Freshness }) {
  const company = row.companyName ?? NA;
  const industry = row.industry ?? NA;
  return (
    <div className="identity">
      <div className="identity-top">
        <span className="identity-ticker">{row.ticker}</span>
        {/* Hide the badge for fresh rows so "FRESH" doesn't repeat down every
            row; only cached/stale rows get a badge. Legend above explains all. */}
        {freshness !== 'fresh' && <FreshnessBadge freshness={freshness} />}
      </div>
      <div className="identity-company" title={company !== NA ? company : undefined}>
        {company === NA ? <span className="na">{NA}</span> : company}
      </div>
      <div className="identity-industry" title={industry !== NA ? industry : undefined}>
        {industry === NA ? <span className="na">{NA}</span> : industry}
      </div>
    </div>
  );
}

// How far the current price sits below the 52-week high (e.g. "-6.40%"). One
// unambiguous number instead of the old positional bar + confusing range %; the
// full low–high range stays available in the tooltip and screen-reader label.
function PctFromHigh({ row }: { row: ScanRow }) {
  const pct = percentFromHigh(row.currentPrice ?? null, row.week52High);
  if (pct === null) {
    return <span className="na">{NA}</span>;
  }
  const range = `${formatCurrency(row.week52Low, row.currency)} – ${formatCurrency(row.week52High, row.currency)}`;
  return (
    <span
      className="pct-from-high"
      title={`52-week range: ${range}`}
      aria-label={`${formatPercent(pct)} from the 52-week high (range ${range})`}
    >
      {formatPercent(pct)}
    </span>
  );
}

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
  sortable: boolean;
  // Proportional width (percent) for the fixed table layout. Every column
  // scales together so the gaps between them stay uniform at any screen width;
  // the four numeric columns share one width so their values line up evenly.
  width: string;
  truncate?: boolean;
  title?: string;
  // Identity columns render a custom stacked cell (handled in the body loop)
  // instead of `render`, so `render` is optional for them.
  identity?: boolean;
  render?: (row: ScanRow) => ReactNode;
}

const COLUMNS: Column[] = [
  // Merged identity column sorts by ticker only. Sorting by company name is
  // intentionally dropped along with the separate Company column.
  { key: 'ticker', label: 'Symbol', numeric: false, sortable: true, identity: true, width: '20%' },
  { key: 'marketCap', label: 'Market Cap', numeric: true, sortable: true, width: '16%', render: (r) => formatMarketCap(r.marketCap, r.currency) },
  { key: 'currentPrice', label: 'Price', numeric: true, sortable: false, width: '16%', render: (r) => formatCurrency(r.currentPrice ?? null, r.currency) },
  // Derived metric with no backing sort key, so this column is not sortable
  // (sorting lives in lib/sort and only supports raw ScanRow fields).
  { key: 'week52High', label: '% From High', numeric: true, sortable: false, width: '16%', render: (r) => <PctFromHigh row={r} /> },
  { key: 'trailingPE', label: 'P/E', numeric: true, sortable: true, width: '16%', render: (r) => formatPe(r.trailingPE) },
  { key: 'dividendYieldPercent', label: 'Dividend Yield', numeric: true, sortable: true, width: '16%', render: (r) => formatPercent(r.dividendYieldPercent) }
];

function ariaSortValue(active: boolean, dir: SortDir): 'ascending' | 'descending' | 'none' {
  if (!active) return 'none';
  return dir === 'asc' ? 'ascending' : 'descending';
}

interface ResultsTableProps {
  rows: ScanRow[];
  lastUpdatedAt: string | null;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

export default function ResultsTable({ rows, lastUpdatedAt, sortKey, sortDir, onSort }: ResultsTableProps) {
  const updatedLabel = lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : NA;
  const now = Date.now();

  return (
    <>
      <div className="table-head">
        <span className="table-summary">
          {rows.length} {rows.length === 1 ? 'company' : 'companies'} · Updated {updatedLabel}
        </span>
        <div className="freshness-legend" aria-hidden="true">
          <FreshnessBadge freshness="fresh" /> just fetched
          <FreshnessBadge freshness="cached" /> from cache
          <FreshnessBadge freshness="stale" /> &gt; 15 min old
        </div>
      </div>
      <div className="table-wrap" role="region" aria-label="Scan results" tabIndex={0}>
      <table>
        <caption className="sr-only">
          {rows.length} {rows.length === 1 ? 'company' : 'companies'}. Data last updated: {updatedLabel}.
        </caption>
        <colgroup>
          {COLUMNS.map((col, idx) => (
            <col key={`${col.label}-${idx}`} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((col, idx) => {
              const active = col.sortable && col.key === sortKey;
              // Numeric headers put the arrow on the left so the label hugs the
              // right edge, lining up with the right-aligned values below.
              const arrow = (
                <span className={active ? 'arrow arrow-active' : 'arrow'} aria-hidden="true">
                  {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
                </span>
              );
              return (
                <th
                  key={`${col.label}-${idx}`}
                  scope="col"
                  className={col.numeric ? 'num' : undefined}
                  aria-sort={col.sortable ? ariaSortValue(active, sortDir) : undefined}
                >
                  {col.sortable ? (
                    <button type="button" className="sort-btn" onClick={() => onSort(col.key)} title={col.title}>
                      {col.numeric ? (
                        <>
                          {arrow}
                          {col.label}
                        </>
                      ) : (
                        <>
                          {col.label}
                          {arrow}
                        </>
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const freshness = rowFreshness(row, now);
            return (
              <tr key={row.ticker}>
                {COLUMNS.map((col, idx) => {
                  if (col.identity) {
                    return (
                      <td key={`${row.ticker}-${idx}`} className="identity-cell">
                        <IdentityCell row={row} freshness={freshness} />
                      </td>
                    );
                  }
                  const value = col.render ? col.render(row) : null;
                  const cls = [col.numeric ? 'num' : '', col.truncate ? 'truncate' : ''].filter(Boolean).join(' ');
                  const titleAttr = col.truncate && typeof value === 'string' && value !== NA ? value : undefined;
                  return (
                    <td key={`${row.ticker}-${idx}`} className={cls || undefined} title={titleAttr}>
                      {value === NA ? <span className="na">{NA}</span> : value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
