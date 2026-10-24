import type { VehicleVariant } from "./vehicleUtils"

export default function VehicleSprite({
  parked = false,
  variant = "car",
}: {
  parked?: boolean
  variant?: VehicleVariant
}) {
  if (variant === "motorcycle" || variant === "bicycle") {
    return (
      <svg
        aria-hidden="true"
        className={`vehicle-sprite vehicle-${variant}`}
        viewBox="0 0 48 80"
      >
        <circle className="vehicle-tire" cx="24" cy="10" r="7" />
        <circle className="vehicle-tire" cx="24" cy="70" r="7" />
        <path
          className="vehicle-detail"
          d={
            variant === "bicycle"
              ? "M24 17v17m0 0-10 15h20L24 34Zm0 15v14M15 31h18"
              : "M24 17v13l-7 15h14l-7-15m0 15v18M17 26h14"
          }
        />
        {variant === "motorcycle" && (
          <path className="vehicle-body" d="M17 30h14l4 18-11 9-11-9 4-18Z" />
        )}
      </svg>
    )
  }

  if (variant === "truck" || variant === "bus" || variant === "van") {
    return (
      <svg
        aria-hidden="true"
        className={`vehicle-sprite vehicle-${variant} ${
          parked ? "is-parked" : ""
        }`}
        viewBox="0 0 48 80"
      >
        <path
          className="vehicle-tire"
          d="M2 14h5v15H2zM41 14h5v15h-5zM2 52h5v15H2zM41 52h5v15h-5z"
        />
        <rect
          className="vehicle-body"
          height={variant === "truck" ? 48 : 72}
          rx="7"
          width="34"
          x="7"
          y={variant === "truck" ? 29 : 4}
        />
        {variant === "truck" && (
          <path className="vehicle-body" d="M10 4h28l3 22H7l3-22Z" />
        )}
        <path className="vehicle-glass" d="M11 9h26l2 12H9l2-12Z" />
        <path
          className="vehicle-detail"
          d={
            variant === "bus"
              ? "M11 28h26M11 39h26M11 50h26M11 61h26"
              : "M10 29h28M10 59h28"
          }
        />
        <path className="vehicle-light" d="M10 7h7M31 7h7M10 72h7M31 72h7" />
      </svg>
    )
  }

  if (variant === "tractor") {
    return (
      <svg
        aria-hidden="true"
        className={`vehicle-sprite vehicle-tractor ${
          parked ? "is-parked" : ""
        }`}
        viewBox="0 0 48 80"
      >
        <circle className="vehicle-tire" cx="10" cy="54" r="9" />
        <circle className="vehicle-tire" cx="38" cy="54" r="9" />
        <circle className="vehicle-tire" cx="13" cy="16" r="6" />
        <circle className="vehicle-tire" cx="35" cy="16" r="6" />
        <path className="vehicle-body" d="M14 9h20l4 49H10l4-49Z" />
        <path className="vehicle-glass" d="M15 29h18l3 17H12l3-17Z" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className={`vehicle-sprite vehicle-${variant} ${
        parked ? "is-parked" : ""
      }`}
      viewBox="0 0 48 80"
    >
      <path
        className="vehicle-tire"
        d="M3 18h5v14H3zM40 18h5v14h-5zM3 49h5v14H3zM40 49h5v14h-5z"
      />
      <path
        className="vehicle-body"
        d="M14 3h20l7 13 2 43-7 17H12L5 59l2-43 7-13Z"
      />
      <path
        className="vehicle-glass"
        d="m14 10-4 14h28l-4-14H14ZM10 50l3 17h22l3-17H10Z"
      />
      <path className="vehicle-roof" d="M12 28h24l2 18H10l2-18Z" />
      <path className="vehicle-detail" d="M9 19h30M10 58h28M24 28v18" />
      <path className="vehicle-light" d="M9 8h6M33 8h6M8 68h7M33 68h7" />
    </svg>
  )
}
