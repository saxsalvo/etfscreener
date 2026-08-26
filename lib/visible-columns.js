export function mergeVisibleColumns(savedColumns, defaultColumns) {
  const validSaved = Array.isArray(savedColumns)
    ? savedColumns.filter((key) => defaultColumns.includes(key))
    : [];

  const next = [...validSaved];
  for (const key of defaultColumns) {
    if (!next.includes(key)) next.push(key);
  }

  return next;
}
