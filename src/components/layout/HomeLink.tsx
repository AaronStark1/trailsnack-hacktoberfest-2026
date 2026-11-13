import { useState, type MouseEvent, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import ConfirmDialog from "../ui/ConfirmDialog.tsx";
import { useScanStore } from "../../stores/scanStore.ts";

interface Props {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * Link to the home page ("/"). Home is a separate document from the app shell,
 * so this is a real navigation — which would silently drop an assessment that
 * only lives in memory. On the Assess screen it therefore asks first.
 */
export default function HomeLink({ children, className, ...rest }: Props) {
  const { pathname } = useLocation();
  const hasDraft = useScanStore((s) => s.draft !== null);
  const [asking, setAsking] = useState(false);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!hasDraft || !pathname.startsWith("/assess")) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setAsking(true);
  }

  return (
    <>
      <a href="/" className={className} onClick={onClick} {...rest}>
        {children}
      </a>
      {asking && (
        <ConfirmDialog
          title="Leave this assessment?"
          body="Going to the home page clears an assessment that has not been saved to the Field Log."
          confirmLabel="Go home"
          onCancel={() => setAsking(false)}
          onConfirm={() => window.location.assign("/")}
        />
      )}
    </>
  );
}
