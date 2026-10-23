import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  ArrowRight, Bike, Bone, BrickWall, Building, Bus, Car, CarFront, Caravan, ChevronDown, CircleDot,
  Construction, Container, Cylinder, Droplet, Droplets, Fence, Footprints, Fuel, Gem, GlassWater,
  Hammer, Mountain, Motorbike, Package, PawPrint, Route, Scooter, Search, Signpost, Sparkles, Tractor,
  TreePine, Truck, User, Wrench, X,
} from "lucide-react";
import {
  CATALOG_TABS, CATEGORY_LABEL, catalogItems, describeDefaults,
  type CatalogCategory, type CatalogItem, type IconKey, type SceneElement,
} from "./catalogData";

type LucideIcon = ComponentType<{ size?: number; "aria-hidden"?: boolean; className?: string }>;

const ICONS: Record<IconKey, LucideIcon> = {
  wall: BrickWall, fence: Fence, sign: Signpost, pole: Cylinder, building: Building, tree: TreePine,
  rock: Mountain, beam: Construction, tire: CircleDot, car: Car, carfront: CarFront, truck: Truck,
  bus: Bus, moto: Motorbike, scooter: Scooter, bike: Bike, tractor: Tractor, wrench: Wrench,
  caravan: Caravan, container: Container, user: User, paw: PawPrint, droplet: Droplet,
  droplets: Droplets, bone: Bone, route: Route, footprints: Footprints, hammer: Hammer,
  package: Package, glass: GlassWater, fuel: Fuel, gem: Gem,
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

type Props = {
  selectedId: string | null;
  sceneElements: SceneElement[];
  onAdd: (item: CatalogItem) => void;
  onRemove: (uid: string) => void;
};

export default function CatalogPanel({ selectedId, sceneElements, onAdd, onRemove }: Props) {
  const [tab, setTab] = useState<CatalogCategory>("rigid");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sceneOpen, setSceneOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / Cmd+K enfoca el buscador desde cualquier parte de la app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searching = query.trim().length > 0;
  const tabMeta = CATALOG_TABS.find((entry) => entry.id === tab)!;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    // Con texto, la búsqueda es global; sin texto, se filtra por pestaña (chunking).
    return catalogItems.filter((item) => {
      if (!needle) return item.category === tab;
      return `${item.label} ${item.group} ${item.detail} ${CATEGORY_LABEL[item.category]}`.toLowerCase().includes(needle);
    });
  }, [query, tab]);

  const groups = useMemo(() => [...new Set(visible.map((item) => item.group))], [visible]);

  const countById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const element of sceneElements) map[element.catalogId] = (map[element.catalogId] ?? 0) + 1;
    return map;
  }, [sceneElements]);

  const countByTab = useMemo(() => {
    const map: Partial<Record<CatalogCategory, number>> = {};
    for (const element of sceneElements) map[element.category] = (map[element.category] ?? 0) + 1;
    return map;
  }, [sceneElements]);

  return (
    <aside className="catalog-pane">
      <div className="catalog-header">
        <div>
          <span className="eyebrow">BIBLIOTECA DE ESCENA</span>
          <h2>Elementos y evidencias</h2>
          <p>Selecciona un elemento para inyectarlo en la escena con sus propiedades base.</p>
        </div>
        <span className="catalog-count" title="Elementos visibles">{visible.length}</span>
      </div>

      <div className="catalog-tabs" role="tablist" aria-label="Categorías del catálogo">
        {CATALOG_TABS.map((entry) => {
          const Icon = ICONS[entry.icon];
          const added = countByTab[entry.id];
          return (
            <button
              aria-selected={!searching && tab === entry.id}
              className={`catalog-tab tone-text-${entry.tone} ${!searching && tab === entry.id ? "is-active" : ""}`}
              key={entry.id}
              onClick={() => { setQuery(""); setTab(entry.id); }}
              role="tab"
              type="button"
            >
              <Icon aria-hidden size={17} />
              <span>{entry.label}</span>
              {added ? <i className="catalog-tab-badge">{added}</i> : null}
            </button>
          );
        })}
      </div>

      <label className="catalog-search">
        <Search aria-hidden className="icon" size={16} />
        <input
          aria-label="Buscar en el catálogo"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }}
          placeholder="Buscar en todo el catálogo…"
          ref={inputRef}
          value={query}
        />
        {searching ? (
          <button aria-label="Limpiar búsqueda" className="catalog-clear" onClick={() => setQuery("")} type="button"><X aria-hidden size={15} /></button>
        ) : (
          <kbd>{isMac ? "⌘K" : "Ctrl K"}</kbd>
        )}
      </label>

      <div className="catalog-breadcrumb">{searching ? `Resultados para “${query.trim()}”` : tabMeta.parent}</div>

      <div className="catalog-list">
        {groups.map((group, index) => {
          const key = `${tab}/${group}`;
          const open = searching || (expanded[key] ?? index === 0);
          const items = visible.filter((item) => item.group === group);
          return (
            <section className="catalog-group" key={key}>
              <button
                aria-expanded={open}
                className="catalog-group-toggle"
                disabled={searching}
                onClick={() => setExpanded((current) => ({ ...current, [key]: !open }))}
                type="button"
              >
                <span>{group}</span>
                <small>{items.length}</small>
                <ChevronDown aria-hidden className={`chevron ${open ? "is-open" : ""}`} size={16} />
              </button>
              {open && items.map((item) => {
                const Icon = ICONS[item.icon];
                const added = countById[item.id];
                return (
                  <button
                    className={`catalog-item ${selectedId === item.id ? "is-selected" : ""}`}
                    key={item.id}
                    onClick={() => onAdd(item)}
                    title={item.detail}
                    type="button"
                  >
                    <span className={`catalog-icon tone-${item.tone}`}><Icon aria-hidden size={19} /></span>
                    <span className="catalog-item-copy">
                      <b>{item.label}{added ? <i className="catalog-added">×{added}</i> : null}</b>
                      <small>{item.detail}</small>
                      <em>{describeDefaults(item.defaults)}</em>
                    </span>
                    <ArrowRight aria-hidden className="icon" size={15} />
                  </button>
                );
              })}
            </section>
          );
        })}
        {visible.length === 0 && (
          <div className="catalog-empty"><Search aria-hidden className="icon" size={22} /><b>Sin resultados</b><span>Prueba con otro término.</span></div>
        )}
      </div>

      <div className="scene-list">
        <button aria-expanded={sceneOpen} className="scene-list-head" onClick={() => setSceneOpen((value) => !value)} type="button">
          <Sparkles aria-hidden className="icon" size={15} />
          <span>En escena</span>
          <small>{sceneElements.length}</small>
          <ChevronDown aria-hidden className={`chevron ${sceneOpen ? "is-open" : ""}`} size={16} />
        </button>
        {sceneOpen && (
          <ul>
            {sceneElements.length === 0 && <li className="scene-empty">Aún no hay elementos. Se incluirán en el dictamen PDF.</li>}
            {sceneElements.map((element) => (
              <li key={element.uid}>
                <span className={`scene-dot tone-${element.tone}`} />
                <span className="scene-name"><b>{element.label}</b><small>{element.scene}</small></span>
                <button aria-label={`Quitar ${element.label}`} className="scene-remove" onClick={() => onRemove(element.uid)} type="button"><X aria-hidden size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
