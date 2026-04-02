import Link from "next/link";

export function CheckinHeader({ operatorEmail }: { operatorEmail: string }) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">Check-in</span>
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Terminal
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/checkin/history" className="hover:underline">
            Gecmis
          </Link>
          <span className="text-gray-500">{operatorEmail}</span>
        </div>
      </div>
    </header>
  );
}
