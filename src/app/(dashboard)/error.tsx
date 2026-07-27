"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isForbidden = /permission/i.test(error.message);

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{isForbidden ? "Access denied" : "Something went wrong"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.message || "An unexpected error occurred. Please try again."}
            </p>
          </div>
          <div className="flex gap-2">
            {!isForbidden && (
              <Button variant="outline" onClick={reset}>
                Try again
              </Button>
            )}
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
