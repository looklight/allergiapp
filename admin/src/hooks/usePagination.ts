import { useState, useCallback } from 'react';

const PAGE_SIZE = 25;

export function usePagination<T>({
  fetchPage,
}: {
  fetchPage: (pageNum: number) => Promise<T[]>;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    const data = await fetchPage(pageNum);
    setHasMore(data.length > PAGE_SIZE);
    const pageItems = data.slice(0, PAGE_SIZE);

    if (append) {
      setItems((prev) => [...prev, ...pageItems]);
    } else {
      setItems(pageItems);
    }
    setLoading(false);
  }, [fetchPage]);

  const reset = useCallback(() => {
    setPage(0);
    load(0);
  }, [load]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, true);
  }, [page, load]);

  return { items, setItems, loading, hasMore, loadMore, reset };
}

export { PAGE_SIZE };
