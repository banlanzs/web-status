"use client";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const yearRange = currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;

  return (
    <footer className="border-t border-slate-200 bg-white/50 py-6">
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-600">
          <p>
            Powered by{" "}
            <a
              href="https://github.com/banlanzs"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-600 transition hover:text-emerald-500 hover:underline"
            >
              banlan
            </a>
          </p>
          <p className="text-xs text-slate-500">
            © {yearRange} All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

