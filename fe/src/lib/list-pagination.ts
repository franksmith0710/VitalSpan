import { useCallback, useEffect, useMemo, useState } from "react";

export type ListPaginationState = {
  page: number;
  pageSize: number;
  offset: number;
  onPageChange: (page: number, pageSize?: number) => void;
  resetPage: () => void;
};

export function useListPagination(pageSizeDefault = 20, resetDeps: unknown[] = []): ListPaginationState {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when filter deps change
  }, resetDeps);

  const onPageChange = useCallback((nextPage: number, nextSize?: number) => {
    if (nextSize !== undefined && nextSize !== pageSize) {
      setPageSize(nextSize);
      setPage(1);
      return;
    }
    setPage(nextPage);
  }, [pageSize]);

  const resetPage = useCallback(() => setPage(1), []);

  return useMemo(
    () => ({
      page,
      pageSize,
      offset: (page - 1) * pageSize,
      onPageChange,
      resetPage,
    }),
    [page, pageSize, onPageChange, resetPage],
  );
}
