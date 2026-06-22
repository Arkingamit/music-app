"use client";
import { Suspense } from "react";
import GroupAdd from "@/views/GroupAdd";

export default function GroupAddPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading...</div>}>
      <GroupAdd />
    </Suspense>
  );
}
