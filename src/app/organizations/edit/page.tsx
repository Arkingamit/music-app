"use client";
import { Suspense } from "react";
import OrganizationEdit from "@/views/OrganizationEdit";

export default function OrganizationEditPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading...</div>}>
      <OrganizationEdit />
    </Suspense>
  );
}
