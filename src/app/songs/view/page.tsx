"use client";
import { Suspense } from "react";
import SongDetail from "@/views/SongDetail";

export default function SongDetailPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading...</div>}>
      <SongDetail />
    </Suspense>
  );
}
