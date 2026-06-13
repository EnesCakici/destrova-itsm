import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { IconPlus } from "../../shared/DestrovaIcons";
import { useAdminWorkspace } from "./AdminWorkspaceContext";
import { SAAS_BUTTON } from "../adminTokens";

const ITEM_IDS = [
  { id: "addUser", modal: "addUser", section: "usersRoles", labelKey: "quickAdd.addUser" },
  { id: "addProduct", modal: "addProduct", section: "productsCatalog", labelKey: "quickAdd.addProduct" },
  { id: "addVersion", modal: "addVersion", section: "productsCatalog", labelKey: "quickAdd.addVersion" },
];

export default function AdminQuickAdd() {
  const { t } = useTranslation("admin");
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
        title={t("quickAdd.label")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`h-10 ${SAAS_BUTTON.primaryMd}`}
      >
        <IconPlus className="h-4 w-4" />
        {t("quickAdd.label")}
      </button>
      {open ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: coords.top, right: coords.right, width: 240, zIndex: 9999 }}
          role="menu"
          className="rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg ring-1 ring-slate-900/[0.04]"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {t("quickAdd.label")}
          </p>
          <div className="flex flex-col gap-0.5">
            {ITEM_IDS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => handlePick(item)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-100 hover:bg-slate-50"
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600"
                  aria-hidden
                >
                  <IconPlus className="h-3.5 w-3.5" />
                </span>
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
