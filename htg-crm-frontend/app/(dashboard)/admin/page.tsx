"use client";

export default function AdminPage() {
  return <AdminPlaceholder title="System Administration" />;
}

function AdminPlaceholder({ title }: { title: string }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">This Admin section is coming soon.</p>
    </section>
  );
}
