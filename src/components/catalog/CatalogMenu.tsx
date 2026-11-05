import Button from "../ui/Button"
import Icon from "../ui/Icon"
import CatalogItemVisual from "./CatalogItemVisual"
import {
  type DroppedItem,
  type MenuKey,
  catalogMenus,
  getCatalogItemKind,
} from "../../types/scenario"

export default function CatalogMenu({
  menuKey,
  onClose,
  onSelect,
}: {
  menuKey: MenuKey
  onClose: () => void
  onSelect: (
    item: string,
    kind: DroppedItem["kind"],
    placeOnMap: boolean,
  ) => void
}) {
  const menu = catalogMenus[menuKey]

  return (
    <div className="catalog-menu" id="catalog-menu">
      <div className="catalog-menu-head">
        <div>
          <span className="eyebrow">{menu.eyebrow}</span>
          <div className="catalog-title">{menu.title}</div>
          <p>{menu.description}</p>
        </div>
        <Button className="icon-button" onClick={onClose} title="Cerrar menú">
          <Icon name="close" size={17} />
        </Button>
      </div>
      <div
        className={`catalog-sections catalog-sections-${menu.sections.length}`}
      >
        {menu.sections.map((section) => (
          <div className="catalog-section" key={section.title}>
            <div className="catalog-section-title">
              <span>
                <Icon name={section.icon} size={17} />
              </span>
              <b>{section.title}</b>
            </div>
            {section.groups.map((group) => (
              <div className="catalog-group" key={group.label}>
                <span>{group.label}</span>
                <div className="catalog-items">
                  {group.items.map((item) => (
                    <Button
                      className={`catalog-item ${
                        menuKey !== "Indicios" ? "is-draggable" : ""
                      }`}
                      draggable={menuKey !== "Indicios"}
                      key={item}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "copy"
                        event.dataTransfer.setData(
                          "application/x-cesvi-item",
                          JSON.stringify({
                            label: item,
                            kind: getCatalogItemKind(menuKey, group.label),
                          }),
                        )
                      }}
                      onClick={() =>
                        onSelect(
                          item,
                          getCatalogItemKind(menuKey, group.label),
                          menuKey !== "Indicios",
                        )
                      }
                      title={
                        menuKey !== "Indicios"
                          ? "Arrastrar al mapa"
                          : "Seleccionar indicio"
                      }
                    >
                      {menuKey !== "Indicios" && (
                        <CatalogItemVisual
                          kind={getCatalogItemKind(menuKey, group.label)}
                          label={item}
                        />
                      )}
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
