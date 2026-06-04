import { useId } from "react";

/**
 * Segmented control without <button> — avoids native OS chrome when Tailwind preflight is off.
 */
export default function ManagerPillGroup({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}) {
  const uid = useId().replace(/:/g, "");
  const groupName = `mgr-pill-${uid}`;
  const sizeClass = size === "sm" ? "destrova-pill-group--sm" : "destrova-pill-group--md";

  return (
    <div
      className={`destrova-pill-group ${sizeClass}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const id = opt.id ?? opt.value;
        const inputId = `${groupName}-${id}`;
        const checked = value === id;
        return (
          <label key={id} className="destrova-pill-group__item">
            <input
              id={inputId}
              type="radio"
              name={groupName}
              className="destrova-pill-group__input"
              checked={checked}
              onChange={() => onChange(id)}
            />
            <span className="destrova-pill-group__label">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
