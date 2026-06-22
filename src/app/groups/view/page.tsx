"use client";
import { Suspense } from "react";
import GroupDetail from "@/views/GroupDetail";

export default function GroupDetailPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading...</div>}>
      <GroupDetail />
    </Suspense>
  );
}
