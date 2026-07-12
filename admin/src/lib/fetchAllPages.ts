// PostgREST tronca ogni risposta (tabelle e RPC) a max-rows: qualunque
// lettura "tutte le righe" va paginata fino a esaurimento.
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const CHUNK = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += CHUNK) {
    const { data } = await page(from, from + CHUNK - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < CHUNK) break;
  }
  return rows;
}
