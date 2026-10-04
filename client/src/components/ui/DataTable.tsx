import {
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import { Package, Search, ChevronLeft, ChevronRight, Filter, ChevronDown, Check, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export const dataTableFeatures = tableFeatures({});

interface FilterOption {
  label: string;
  value: string;
}

interface FilterProps {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface DataTableProps {
  columns: any[];
  data: any[];
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  
  // Searching
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;

  // Filtering
  filters?: FilterProps[];

  // Pagination
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;

  // Custom Top Actions
  actions?: React.ReactNode;
}

export function DataTable({
  columns,
  data,
  isLoading,
  isFetching,
  error,
  onRetry,
  emptyMessage = 'No data found.',
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  actions,
}: DataTableProps) {
  const table = useTable({ features: dataTableFeatures, data: data as any, columns: columns as any });

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
          {error} {onRetry && <button onClick={onRetry} className="ml-2 font-semibold underline">Retry</button>}
        </div>
      )}
      {/* Top Toolbar */}
      {(onSearchChange || filters.length > 0 || actions) && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {onSearchChange && (
              <div className="relative flex-1 sm:min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
            
            {filters.map((f) => (
              <DropdownMenu key={f.key}>
                <DropdownMenuTrigger>
                  <button className="flex items-center bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none">
                    <Filter className="w-4 h-4 text-muted-foreground mr-2" />
                    <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis mr-2 max-w-[120px]">
                      {f.value ? (f.options.find(o => o.value === f.value)?.label || f.value) : f.label}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => f.onChange('')} className="cursor-pointer">
                    <span className={clsx("flex-1", !f.value && "font-semibold")}>{f.label}</span>
                    {!f.value && <Check className="w-4 h-4 text-primary ml-2" />}
                  </DropdownMenuItem>
                  {f.options.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => f.onChange(opt.value)}
                      className="cursor-pointer"
                    >
                      <span className={clsx("flex-1", f.value === opt.value && "font-semibold")}>{opt.label}</span>
                      {f.value === opt.value && <Check className="w-4 h-4 text-primary ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
          
          {actions && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {actions}
            </div>
          )}
          {isFetching && !isLoading && <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="w-3 h-3 animate-spin" />Refreshing</span>}
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[200px]">
          {isLoading ? (
            <div className="w-full h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b border-border">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3.5 font-semibold text-muted-foreground whitespace-nowrap">
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={clsx(
                        'hover:bg-accent/30 transition-colors',
                        (row.original as any).isActive === false && 'opacity-50',
                        (row.original as any).isSelected && 'bg-primary/5'
                      )}
                    >
                      {row.getAllCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Container */}
      {onPageChange && totalPages !== undefined && totalPages > 0 && (
        <div className="flex flex-wrap gap-3 items-center justify-between px-4 py-3 bg-card rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            {onPageSizeChange && <label className="text-sm text-muted-foreground">Rows <select aria-label="Rows per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="ml-1 rounded-lg border border-border bg-background px-2 py-1">{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>}
            <button
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => onPageChange(page! - 1)}
              className="p-2 rounded-lg border border-border text-foreground hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              aria-label="Next page"
              disabled={page === totalPages}
              onClick={() => onPageChange(page! + 1)}
              className="p-2 rounded-lg border border-border text-foreground hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
