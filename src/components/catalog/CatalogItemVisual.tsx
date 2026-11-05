import Icon from "../ui/Icon"
import VehicleSprite from "../ui/VehicleSprite"
import {
  type DroppedItem,
  getDroppedItemIcon,
  getMaterialType,
  getVehicleVariant,
} from "../../types/scenario"

export default function CatalogItemVisual({
  kind,
  label,
}: {
  kind: DroppedItem["kind"]
  label: string
}) {
  if (kind === "vehicle" || kind === "static-vehicle") {
    return (
      <span
        className={`catalog-item-visual catalog-vehicle-visual material-${getMaterialType(
          label,
          kind,
        )}`}
      >
        <VehicleSprite
          parked={kind === "static-vehicle"}
          variant={getVehicleVariant(label)}
        />
      </span>
    )
  }

  return (
    <span
      className={`catalog-item-visual catalog-${kind}-visual material-${getMaterialType(
        label,
        kind,
      )} ${kind === "animal" ? "catalog-animal-stamp" : ""}`}
    >
      <Icon name={getDroppedItemIcon(kind, label)} size={13} />
    </span>
  )
}
