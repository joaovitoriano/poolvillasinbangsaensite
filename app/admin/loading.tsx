export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[#fbfaf6]" aria-busy="true" aria-label="Loading management area / กำลังโหลดพื้นที่จัดการ">
      <div className="hidden h-screen w-60 bg-[#001e33] md:fixed md:block" />
      <div className="motion-safe:animate-pulse px-4 py-6 sm:px-6 md:ml-60 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1320px] space-y-6">
          <div className="h-20 max-w-xl bg-[#e9e4dc]" />
          <div className="grid gap-4 sm:grid-cols-3"><div className="h-16 bg-[#e9e4dc]"/><div className="h-16 bg-[#e9e4dc]"/><div className="h-16 bg-[#e9e4dc]"/></div>
          <div className="h-[55vh] border border-[#ddd6ca] bg-[#f1eee8]" />
        </div>
      </div>
    </main>
  );
}
