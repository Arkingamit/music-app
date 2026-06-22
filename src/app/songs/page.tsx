"use client";
import React, { Suspense } from "react";
import SongList from "@/views/SongList";

export default function SongsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading songs...</div>}>
      <SongList />
    </Suspense>
  );
}
