"use client";
import { Suspense } from "react";
import SongEdit from "@/views/SongEdit";

export default function SongEditPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading...</div>}>
      <SongEdit />
    </Suspense>
  );
}
