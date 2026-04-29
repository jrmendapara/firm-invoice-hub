import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  LucideIcon,
} from "lucide-react";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  /** Unique column id */
  id: string;
  /** Header label */
  header: ReactNode;
  /** Render the cell for a given row */
  cell: (row: T) => ReactNode;
  /** Mobile card label override (defaults to header text if header is a string) */
  mobileLabel?: string;
  /** Sort accessor; if provided the column becomes sortable */
  sortAccessor?: (row: T) => string | number | null | undefined;
  /** Tailwind class applied to th + td (alignment, width) */
  className?: string;
  /** Hide column on mobile card view (still searchable). */
  hideOnMobile?: boolean;
}

export interface DataTableFilterOption {
  label: string;
  value: string;
}

export interface DataTableFilter {
  id: string;
  label: string;
  value: string;
  options: DataTableFilterOption[];
  onChange: (value: string) => void;
}

export interface DataTableEmpty {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Stable key for each row */
  rowKey: (row: T) => string;
  /** Click anywhere on the row */
  onRowClick?: (row: T) => void;
  /** Optional global text search */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Function returning text used to match a row against the search input */
  searchAccessor?: (row: T) => string;
  /** Optional dropdown filters */
  filters?: DataTableFilter[];
  /** Initial sort */
  initialSort?: { columnId: string; direction: SortDirection };
  /** Pagination size options (defaults to [10,25,50,100]) */
  pageSizeOptions?: number[];
  /** Initial page size (defaults to 25) */
  initialPageSize?: number;
  empty: DataTableEmpty;
  /** Optional totals row (shown only on desktop). Receives the filtered+sorted (un-paginated) rows. */
  footer?: (rows: T[]) => ReactNode;
  /** Mobile card title accessor (bold heading on each card) */
  mobileTitle?: (row: T) => ReactNode;
  /** Mobile card subtitle accessor */
  mobileSubtitle?: (row: T) => ReactNode;
  /** Mobile card right-side accent (status badge, amount, etc.) */
  mobileAside?: (row: T) => ReactNode;
  /** Min width for the desktop table (default 860px) */
  minWidth?: number;
  className?: string;
}

function compareValues(a: unknown, b: unknown): number {
  const aNil = a === null || a === undefined || a === "";
  const bNil = b === null || b === undefined || b === "";
  if (aNil && bNil) return 0;
  if (aNil) return 1;
  if (bNil) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  searchable = true,
  searchPlaceholder = "Search...",
  searchAccessor,
  filters,
  initialSort,
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 25,
  empty,
  footer,
  mobileTitle,
  mobileSubtitle,
  mobileAside,
  minWidth = 860,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortColumnId, setSortColumnId] = useState<string | null>(initialSort?.columnId ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSort?.direction ?? "asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sortableColumns = useMemo(
    () => new Map(columns.filter((c) => c.sortAccessor).map((c) => [c.id, c.sortAccessor!])),
    [columns],
  );

  const filtered = useMemo(() => {
    if (!search.trim() || !searchAccessor) return data;
    const q = search.trim().toLowerCase();
    return data.filter((row) => searchAccessor(row).toLowerCase().includes(q));
  }, [data, search, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sortColumnId) return filtered;
    const accessor = sortableColumns.get(sortColumnId);
    if (!accessor) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const cmp = compareValues(accessor(a), accessor(b));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortColumnId, sortDirection, sortableColumns]);

  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = start + pageSize;
  const paged = sorted.slice(start, end);

  // Reset to first page whenever the underlying filtered set or pageSize changes
  useEffect(() => {
    setPage(0);
  }, [search, pageSize, filters?.map((f) => f.value).join("|")]);

  const handleSort = (columnId: string) => {
    if (!sortableColumns.has(columnId)) return;
    if (sortColumnId === columnId) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumnId(columnId);
      setSortDirection("asc");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar: search + filters */}
      {(searchable || filters?.length) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {searchable && (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search"
              />
            </div>
          )}
          {filters && filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <Select key={f.id} value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger className="h-10 min-w-[150px] sm:w-auto">
                    <SelectValue placeholder={f.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {paged.length === 0 ? (
          <Card>
            <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />
          </Card>
        ) : (
          paged.map((row) => (
            <Card
              key={rowKey(row)}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer active:bg-accent/60",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              <CardContent className="space-y-2 p-4">
                {(mobileTitle || mobileAside) && (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {mobileTitle && <div className="truncate font-semibold">{mobileTitle(row)}</div>}
                      {mobileSubtitle && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{mobileSubtitle(row)}</div>
                      )}
                    </div>
                    {mobileAside && <div className="shrink-0 text-right">{mobileAside(row)}</div>}
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  {columns
                    .filter((c) => !c.hideOnMobile)
                    .map((c) => (
                      <div key={c.id} className="flex flex-col">
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {c.mobileLabel ?? (typeof c.header === "string" ? c.header : c.id)}
                        </dt>
                        <dd className="truncate font-medium tabular-nums">{c.cell(row)}</dd>
                      </div>
                    ))}
                </dl>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardContent className="overflow-x-auto p-0">
          <Table style={{ minWidth }}>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {columns.map((c) => {
                  const isSortable = sortableColumns.has(c.id);
                  const isSorted = sortColumnId === c.id;
                  const Icon = isSorted ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return (
                    <TableHead key={c.id} className={cn(c.className)}>
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(c.id)}
                          className={cn(
                            "inline-flex items-center gap-1 select-none hover:text-foreground",
                            isSorted ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {c.header}
                          <Icon className={cn("h-3.5 w-3.5", isSorted ? "opacity-100" : "opacity-50")} />
                        </button>
                      ) : (
                        c.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0">
                    <EmptyState
                      icon={empty.icon}
                      title={empty.title}
                      description={empty.description}
                      action={empty.action}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    className={cn(
                      "even:bg-muted/30 hover:bg-accent/60",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.id} className={c.className}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
            {footer && sorted.length > 0 && <TableFooter>{footer(sorted)}</TableFooter>}
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalRows > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium tabular-nums text-foreground">{start + 1}</span>
            {"–"}
            <span className="font-medium tabular-nums text-foreground">{Math.min(end, totalRows)}</span> of{" "}
            <span className="font-medium tabular-nums text-foreground">{totalRows}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[72px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs tabular-nums text-muted-foreground">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}