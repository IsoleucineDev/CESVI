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
  onExportUnity?: () => void
  exportDisabled?: boolean
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
  onExportUnity,
  exportDisabled = false,
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
        <Button
          className={`share-button ${exportDisabled ? "disabled" : ""}`}
          disabled={exportDisabled}
          onClick={onExportReport}
          title={exportDisabled ? "Completa el peritaje (100%) para exportar el informe" : "Exportar informe pericial en PDF"}
        >
          <Icon name="download" />
          Exportar informe
        </Button>
        {onExportUnity && (
          <Button
            className={`share-button ${exportDisabled ? "disabled" : ""}`}
            disabled={exportDisabled}
            onClick={onExportUnity}
            title={exportDisabled ? "Completa el peritaje (100%) para exportar el modelo Unity" : "Exportar modelo Unity JSON"}
          >
            <Icon name="download" />
            JSON Unity
          </Button>
        )}
        <div className="avatar">LM</div>
      </div>
      {children}
    </header>
  )
}
