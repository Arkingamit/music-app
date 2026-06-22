"use client";
import { Suspense } from "react";
import GroupEdit from "@/views/GroupEdit";

export default function GroupEditPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading...</div>}>
      <GroupEdit />
    </Suspense>
  );
}
