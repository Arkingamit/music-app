"use client";
import { Suspense } from "react";
import OrganizationDetail from "@/views/OrganizationDetail";

export default function OrganizationDetailPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading...</div>}>
      <OrganizationDetail />
    </Suspense>
  );
}
