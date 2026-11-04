export function nextOffset(
  pageLength: number,
  pageSize: number,
  pageCount: number,
): number | undefined {
  return pageLength === pageSize ? pageCount * pageSize : undefined;
}

export function nextCursor(pageInfo: {
  hasNextPage: boolean;
  endCursor?: string | null;
}): string | undefined {
  return pageInfo.hasNextPage ? (pageInfo.endCursor ?? undefined) : undefined;
}
