import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function PublicationLoader() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return createPortal(
    <dialog ref={ref} className="publication-loader" aria-labelledby="publication-loader-title"
      onCancel={event => event.preventDefault()}>
      <div role="status" aria-live="polite" aria-atomic="true">
        <span className="demo-spinner" aria-hidden="true"/>
        <h2 id="publication-loader-title">A gravar…</h2>
      </div>
    </dialog>, document.body,
  );
}

