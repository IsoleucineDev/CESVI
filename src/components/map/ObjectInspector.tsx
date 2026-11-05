import Button from "../ui/Button"
import Icon from "../ui/Icon"

export default function ObjectInspector({
  isOpen,
  onClose,
  onOpen,
}: {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
}) {
  if (!isOpen) {
    return (
      <Button
        className="inspector-reopen"
        onClick={onOpen}
        title="Abrir propiedades de Vehículo 1"
      >
        <Icon name="car" size={16} />
        <span>Vehículo 1</span>
        <Icon name="chevron" size={13} />
      </Button>
    )
  }

  return (
    <div className="object-inspector">
      <div className="inspector-head">
        <div>
          <span className="object-tag">VEHÍCULO 01</span>
          <b>Nissan Versa 2021</b>
        </div>
        <Button
          className="icon-button subtle"
          onClick={onClose}
          title="Colapsar propiedades"
        >
          <Icon name="close" size={16} />
        </Button>
      </div>
      <div className="inspector-grid">
        <label>
          <span>Tipo</span>
          <select defaultValue="Automóvil">
            <option>Automóvil</option>
            <option>Camión</option>
            <option>Motocicleta</option>
          </select>
        </label>
        <label>
          <span>Velocidad</span>
          <div className="field-with-unit">
            <input defaultValue="42" />
            <i>km/h</i>
          </div>
        </label>
        <label>
          <span>Dirección</span>
          <select defaultValue="Noreste">
            <option>Noreste</option>
            <option>Norte</option>
            <option>Este</option>
          </select>
        </label>
        <label>
          <span>Frenado</span>
          <div className="field-with-unit">
            <input defaultValue="8.4" />
            <i>m</i>
          </div>
        </label>
      </div>
    </div>
  )
}
