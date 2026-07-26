import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { AppError } from "@/lib/errors"
import type { ApiResponse, PaginatedData, PaginationMeta } from "@/types/api"

export function apiSuccess<T>(data: T, message?: string, status = 200) {
  const body: ApiResponse<T> = { success: true, data, message }
  return NextResponse.json(body, { status })
}

export function apiPaginated<T>(items: T[], pagination: PaginationMeta, status = 200) {
  const body: ApiResponse<PaginatedData<T>> = {
    success: true,
    data: { items, pagination },
  }
  return NextResponse.json(body, { status })
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    const body: ApiResponse<never> = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: z.flattenError(error),
      },
    }
    return NextResponse.json(body, { status: 422 })
  }

  if (error instanceof AppError) {
    const body: ApiResponse<never> = {
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    }
    return NextResponse.json(body, { status: error.status })
  }

  console.error("Unhandled API error:", error)
  const body: ApiResponse<never> = {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  }
  return NextResponse.json(body, { status: 500 })
}

export function buildPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
