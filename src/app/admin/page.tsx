"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const AdminDashboard = dynamic(() => import("@/views/AdminDashboard"), {
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary rounded w-64" />
        <div className="h-12 bg-secondary rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-secondary rounded" />
          <div className="h-32 bg-secondary rounded" />
          <div className="h-32 bg-secondary rounded" />
        </div>
      </div>
      
    </div>
  ),
  ssr: false,
});

export default function AdminPage() {
  return (
    <Suspense>
      <AdminDashboard />
    </Suspense>
  );
}
