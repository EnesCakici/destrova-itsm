import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconPlus } from "../../shared/DestrovaIcons";
import { useAdminWorkspace } from "./AdminWorkspaceContext";
import { ADMIN_COLORS } from "../adminTokens";

/**
 * Topbar Quick Add dropdown for Admin.
 *
 * Each item opens a dedicated modal via `useAdminWorkspace().openModal(...)`.
 * The destination view is navigated to so the resulting entity has visible context.
 */
const ITEMS = [
  { id: "addUser",    label: "Add user",            modal: "addUser",    section: "usersRoles" },
  { id: "addProduct", label: "Add product",         modal: "addProduct", section: "productsCatalog" },
  { id: "addVersion", label: "Add product version", modal: "addVersion", section: "productsCatalog" },
];

export default function AdminQuickAdd() {
  const { openModal, navigateTo } = useAdminWorkspace();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return undefined;
    const reposition = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setCoords({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    reposition();
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const handlePick = (item) => {
    setOpen(false);
    navigateTo(item.section);
    openModal(item.modal);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Quick add"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-xl border-0 px-4 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(15,14,71,0.28)] transition-[transform,filter] duration-150 ease-out hover:brightness-[1.05] active:scale-[0.98]"
        style={{ background: `linear-gradient(135deg, ${ADMIN_COLORS.dark}, ${ADMIN_COLORS.ink})` }}
      >
        <IconPlus className="h-4 w-4" />
        Quick add
      </button>
      {open ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: coords.top, right: coords.right, width: 240, zIndex: 9999 }}
          role="menu"
          className="rounded-xl bg-white p-1.5 shadow-[0_24px_60px_-18px_rgba(15,14,71,0.36)] ring-1 ring-slate-900/[0.06]"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ADMIN_COLORS.muted }}>
            Quick add
          </p>
          <div className="flex flex-col gap-0.5">
            {ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => handlePick(item)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors duration-100 hover:bg-[rgba(39,39,87,0.06)]"
                style={{ color: ADMIN_COLORS.dark }}
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ color: ADMIN_COLORS.dark, backgroundColor: "rgba(39,39,87,0.08)" }}
                  aria-hidden
                >
                  <IconPlus className="h-3.5 w-3.5" />
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
