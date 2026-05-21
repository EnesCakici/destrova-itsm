/**
 * Kapatilabilir sayfa banner'i (hata / basari).
 * Formlari kilitlemez; kullanici mesaji okuyup islemine devam edebilir.
 */
function PageAlert({ variant, message, onDismiss }) {
  if (!message) {
    return null;
  }

  const toneClass = variant === "success" ? "page-alert--success" : "page-alert--error";

  return (
    <div
      className={`page-alert ${toneClass}`}
      role={variant === "success" ? "status" : "alert"}
      aria-live={variant === "success" ? "polite" : "assertive"}
    >
      <div className="page-alert__message">{message}</div>
      <button type="button" className="page-alert__close btn btn-ghost" onClick={onDismiss} aria-label="Mesaji kapat">
        ×
      </button>
    </div>
  );
}

export default PageAlert;
