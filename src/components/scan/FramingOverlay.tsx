export default function FramingOverlay() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-square w-[86%] max-w-md">
        <span className="absolute top-0 left-0 h-10 w-10 rounded-tl-xl border-t-6 border-l-6 border-white" />
        <span className="absolute top-0 right-0 h-10 w-10 rounded-tr-xl border-t-6 border-r-6 border-white" />
        <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-xl border-b-6 border-l-6 border-white" />
        <span className="absolute right-0 bottom-0 h-10 w-10 rounded-br-xl border-r-6 border-b-6 border-white" />
      </div>
    </div>
  );
}
