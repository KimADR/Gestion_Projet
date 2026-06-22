interface Column {
  header: string;
  accessor: string;
  render?: (value: any, row: any) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface TableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  striped?: boolean;
}

export function Table({
  columns,
  data,
  loading,
  emptyMessage = 'No data found',
  className = '',
  striped = true,
}: TableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-secondary-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-light text-lg">{emptyMessage}</p>
      </div>
    );
  }

  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`overflow-x-auto rounded-lg border border-border ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-surface-subtle border-b border-border">
            {columns.map((col) => (
              <th
                key={col.accessor}
                className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-foreground ${alignClass[col.align || 'left']}`}
                style={col.width ? { width: col.width } : {}}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`border-b border-border hover:bg-surface-subtle transition-colors duration-200 ${
                striped && idx % 2 !== 0 ? 'bg-surface' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.accessor}
                  className={`px-6 py-4 text-sm text-foreground ${alignClass[col.align || 'left']}`}
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
