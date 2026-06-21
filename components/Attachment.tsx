import Image from "next/image";

// A stored attachment is a PDF when its path ends in .pdf (otherwise an image).
export function isPdf(path: string | null | undefined): boolean {
  return !!path && path.toLowerCase().endsWith(".pdf");
}

// Renders a stored attachment as either an image snippet or a tall, tappable
// PDF preview. Shared by the bet and insight cards. The inline PDF preview is
// non-interactive so the whole card opens it in a new tab; a fallback shows
// when the browser can't render PDFs inline (e.g. iOS Safari).
export function Attachment({
  url,
  path,
  label,
}: {
  url: string;
  path: string | null | undefined;
  label: string;
}) {
  const pdf = isPdf(path);

  return (
    <>
      <p className="mono mt-3 text-[9px] uppercase tracking-wide text-[#8b8794]">
        {label}
        {pdf ? " (PDF)" : ""}
      </p>

      {pdf ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-1 block overflow-hidden rounded-xl border border-[#e5e2ee] bg-[#f5f3fa]"
        >
          <object
            data={`${url}#toolbar=0&navpanes=0&view=FitH`}
            type="application/pdf"
            aria-label={`${label} PDF preview`}
            className="pointer-events-none block h-[360px] w-full sm:h-[460px]"
          >
            <div className="flex h-[360px] w-full flex-col items-center justify-center gap-2 text-[#8b8794] sm:h-[460px]">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v5h5" />
                <path d="M14 3H6v18h12V8z" />
                <path d="M9 13h6M9 17h6" />
              </svg>
              <span className="text-xs font-semibold">Tap to open the PDF</span>
            </div>
          </object>
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#15131f] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-md">
            Open PDF
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </span>
        </a>
      ) : (
        <Image
          src={url}
          alt={label}
          width={800}
          height={500}
          unoptimized
          className="mt-1 w-full rounded-xl border border-[#e5e2ee]"
        />
      )}
    </>
  );
}
