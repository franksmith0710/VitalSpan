import { useCallback, useEffect, useMemo, useState } from "react";

/** 列表默认每页条数（10 的倍数） */
export const LIST_PAGE_SIZE_DEFAULT = 20;

/** 列表每页条数选项（统一 10 的倍数） */
export const LIST_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];

export type ListPaginationState = {
  page: number;
  pageSize: number;
  offset: number;
  onPageChange: (page: number, pageSize?: number) => void;
  resetPage: () => void;
};

export function useListPagination(
  pageSizeDefault = LIST_PAGE_SIZE_DEFAULT,
  resetDeps: unknown[] = [],
): ListPaginationState {
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

/** 对已加载列表做前端分页切片（API 无 limit/offset 时使用） */
export function sliceListPage<T>(items: T[], offset: number, pageSize: number): T[] {
  return items.slice(offset, offset + pageSize);
}
