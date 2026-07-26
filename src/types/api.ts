export type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}

export type ApiFailure = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PaginatedData<T> = {
  items: T[]
  pagination: PaginationMeta
}

export type SortOrder = "asc" | "desc"

export type ListQuery = {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}
