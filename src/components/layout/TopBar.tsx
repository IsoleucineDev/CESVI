import type { ReactNode } from "react"
import Button from "../ui/Button"
import Icon from "../ui/Icon"

type TopBarProps = {
  onOpenDashboard: () => void
  ribbon: string
  openMenu: string | null
  onSelectRibbon: (tab: string) => void
  onUndo: () => void
  onRedo: () => void
  onExportReport: () => void
  children?: ReactNode
}

export default function TopBar({
  onOpenDashboard,
  ribbon,
  openMenu,
  onSelectRibbon,
  onUndo,
  onRedo,
  onExportReport,
  children,
}: TopBarProps) {
  return (
    <header className="titlebar">
      <div className="brand-area">
        <Button
          className="app-launcher"
          onClick={onOpenDashboard}
          title="Abrir centro de casos"
        >
          <Icon name="dashboard" size={20} />
        </Button>
        <div className="brand-mark">
          <span />
        </div>
        <div className="document-name">
          <b>CESVI · Reconstrucción vial</b>
          <span>EXP-0248 · Guardado</span>
        </div>
      </div>
      <nav className="ribbon-tabs" aria-label="Herramientas principales">
        {[
          "Archivo",
          "Mapeo",
          "Objetos",
          "Indicios",
          "Vehículos",
          "Plantillas",
          "Vista",
        ].map((tab) => (
          <Button
            ariaControls={
              tab === "Objetos" || tab === "Indicios" || tab === "Vehículos"
                ? "catalog-menu"
                : undefined
            }
            ariaExpanded={
              tab === "Objetos" || tab === "Indicios" || tab === "Vehículos"
                ? openMenu === tab
                : undefined
            }
            className={ribbon === tab ? "tab-active" : ""}
            key={tab}
            onClick={() => onSelectRibbon(tab)}
          >
            {tab === "Vehículos" ? "Tipos de vehículos" : tab}
            {(tab === "Objetos" ||
              tab === "Indicios" ||
              tab === "Vehículos") && <Icon name="chevron" size={12} />}
          </Button>
        ))}
      </nav>
      <div className="title-actions">
        <Button
          className="icon-button"
          onClick={onUndo}
          title="Deshacer último elemento"
        >
          <Icon name="undo" />
        </Button>
        <Button
          className="icon-button"
          onClick={onRedo}
          title="Rehacer último elemento"
        >
          <Icon name="redo" />
        </Button>
        <span className="divider" />
        <Button className="share-button" onClick={onExportReport}>
          <Icon name="download" />
          Exportar informe
        </Button>
        <div className="avatar">LM</div>
      </div>
      {children}
    </header>
  )
}
