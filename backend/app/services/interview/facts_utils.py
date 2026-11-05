"""Verificación de los hechos extraídos contra el texto del reporte.

1) grounded(): una CITA literal debe aparecer en el reporte (tolerando saltos de línea, acentos y mayúsculas).
2) clean_values(): "No se menciona"/"null" escritos como texto -> null; números que no están en el reporte -> null.
"""
import re
import unicodedata

from .schema import SALTADO

NO_INFO = re.compile(
    r"^\W*(null|none|nulo|n/?a|n/?d|no aplica|no disponible|desconocid[oa]|se desconoce|sin (dato|informaci)|"
    r"no (se )?(menciona|mencionan|especifica|especifican|indica|indican|consta|constan|dice|proporciona|"
    r"cuenta con (dato|informaci)|hay (dato|informaci)|existe (dato|informaci)|determina|registra)|"
    r"no se tiene|no se cuenta)\W*",
    re.I,
)
STRICT_NUMERIC = re.compile(r"^(velocidad_V[1-3]_kmh|huellas_frenado_m|altura_marca_objeto_cm)$")
NUM = re.compile(r"\d+(?:[.,]\d+)?")


def _norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()


def grounded(cita, text, min_words=3):
    """True si la cita aparece (casi) literal en el texto."""
    q = _norm(cita)
    words = q.split()
    if len(words) < min_words:
        return False
    t = _norm(text)
    if q in t:
        return True
    # tolerancia a pequeñas diferencias: 85% de los 3-gramas de la cita existen en el texto
    tw = t.split()
    tri_t = {tuple(tw[i:i + 3]) for i in range(len(tw) - 2)}
    tri_q = [tuple(words[i:i + 3]) for i in range(len(words) - 2)]
    return bool(tri_q) and sum(g in tri_t for g in tri_q) / len(tri_q) >= 0.85


def _nums(s):
    out = set()
    for m in NUM.findall(str(s)):
        try:
            out.add(float(m.replace(",", ".")))
        except ValueError:
            pass
    return out


def clean_values(valores, text):
    text_nums = _nums(text)
    out, log = {}, []
    for k, v in valores.items():
        if v is None or (isinstance(v, str) and not v.strip()):
            out[k] = None
            continue
        if isinstance(v, str) and NO_INFO.match(v.strip()) and len(v.strip()) < 40:
            out[k] = None
            log.append(("no_info", k, v))
            continue
        if STRICT_NUMERIC.match(k):
            vn = _nums(v)
            if not vn or not (vn & text_nums):
                out[k] = None
                log.append(("numero_no_en_reporte", k, v))
                continue
        else:
            # cualquier otro tema: si trae cifras (>=10 o decimales) y NINGUNA está en el reporte -> inventada
            vn = {n for n in _nums(re.sub(r"\bV\d\b", "", str(v))) if n >= 10 or n != int(n)}
            if vn and not (vn & text_nums):
                out[k] = None
                log.append(("numero_no_en_reporte", k, v))
                continue
        out[k] = v
    return out, log


# ---------------------------------------------------------------- respaldo de la cita
# Para temas propensos a inferencia, la cita debe contener palabras propias del tema (sobre texto normalizado:
# minúsculas, sin acentos). Evita, p. ej., deducir "noche" solo porque la cita trae una hora.
KEYWORDS = {
    "superficie": r"asfalt|paviment|concret|terracer|grava|empedr|adoquin|mojad|\bseco|humed|lluvi|superficie|carpeta|tierra|lodo|aceite",
    "iluminacion": r"noche|nocturn|diurn|de dia|ilumin|alumbrad|\bluz\b|oscur|visibilidad|amanec|atardec|niebla|lluvia|penumbra",
    "senalizacion_preferencia": r"semaforo|senal|\balto\b|ceda|preferencia|raya|linea|marca vial|glorieta|prioridad",
    "angulo_impacto": r"grados|perpendicul|oblicu|angul|paralel",
    "velocidad_{V}_kmh": r"velocidad|km h|kmh|kilometros",
    "huellas_frenado_m": r"huella|frenad|derrape|marcas? de",
    "airbags_{V}": r"bolsa|airbag|aire",
    "altura_marca_objeto_cm": r"altura|\bcm\b|centimetro|metro",
    "vueltas_volcadura": r"vuelta|volc|giro|rod",
}
# Temas donde además se exige que >=50% de las palabras del valor aparezcan en la cita.
OVERLAP_TOPICS = {"punto_impacto_via", "angulo_impacto", "iluminacion", "superficie"}  # senalizacion: basta la palabra clave
VALUE_KEYWORD_TOPICS = {"superficie", "iluminacion", "angulo_impacto"}
ZONE_START = re.compile(r"^(vertice|parte|lado|costado|fascia|defensa|salpicadera|puerta|cofre|toldo|frente|zona)\b")
BAD_FINAL = re.compile(r"^(ubicacion final|posicion final|posiciones finales|ubicacion del|posicion del|desconocid|no se|impacto|choque|colision)")
STOP = {"vehiculo", "vehiculos", "marca", "tipo", "modelo", "color"}


def _base(k):
    return re.sub(r"V[1-3]", "{V}", k)


def _stems(s):
    return {w[:5] for w in _norm(re.sub(r"\bV\d\b", " ", str(s))).split() if len(w) >= 5 and w not in STOP}


def supported(k, valor, cita):
    """True si la cita respalda el valor para este tema."""
    b = _base(k)
    if b in KEYWORDS and not re.search(KEYWORDS[b], _norm(cita)):
        return False
    nv = _norm(valor) if isinstance(valor, str) else ""
    if b in VALUE_KEYWORD_TOPICS and nv and not re.search(KEYWORDS[b], nv):
        return False  # el VALOR debe expresar el tema (p. ej. una condición de superficie)
    if b == "punto_impacto_via" and ZONE_START.match(nv):
        return False  # es una zona del vehículo, no un lugar en la vía
    if b == "posicion_final_{V}" and nv and (len(nv.split()) < 3 or BAD_FINAL.match(nv)):
        return False  # repite el tema o describe el impacto
    if b in OVERLAP_TOPICS and not isinstance(valor, (int, float)):
        vs = _stems(valor)
        if vs and len(vs & _stems(cita)) / len(vs) < 0.5:
            return False
    return True


def _cap(s, words):
    w = str(s).split()
    if len(w) <= words:
        return s
    cut = " ".join(w[: int(words * 0.85)])
    i = max(cut.rfind(";"), cut.rfind("."))
    if i > len(cut) * 0.5:  # cortar en un límite natural, sin dejar frases a medias
        cut = cut[:i]
    return cut.rstrip(" ,;") + " [...]"


def _strip_quotes(s):
    return re.sub(r'^[\s"“”«»\']+|[\s"“”«»\',;]+$', "", s)


def postprocess(vals, citas):
    """Limita longitudes y elimina declaraciones duplicadas entre vehículos. Devuelve (vals, bitácora)."""
    log = []
    for k, v in list(vals.items()):
        if isinstance(v, str) and k.startswith("declaracion_"):
            vals[k] = v = _strip_quotes(v)
        if isinstance(v, str):
            lim = 150 if k.startswith("declaracion_") else 70
            if len(v.split()) > lim:
                vals[k] = _cap(v, lim)
                log.append(("recortado", k, f"{len(v.split())} palabras"))
    seen = {}
    for k in sorted(k for k in vals if k.startswith("declaracion_") and vals[k]):
        n = _norm(vals[k])
        if n in seen:  # el reporte transcribe una sola declaración: queda para el primer vehículo
            log.append(("declaracion_duplicada", k, f"igual a {seen[n]}"))
            vals[k] = None
        else:
            seen[n] = k
    return vals, log


def normalize_numeric(k, v):
    """Unifica unidades: *_cm en centímetros, *_m en metros, *_kmh sin 'km/h'. Rangos/textos se dejan igual."""
    if v is None or isinstance(v, (int, float)):
        return v
    s = str(v).lower().strip()
    b = _base(k)
    if b == "velocidad_{V}_kmh":
        m = re.fullmatch(r"~?\s*(\d+(?:[.,]\d+)?)\s*(km/?h|kph|kilometros? por hora|kil[oó]metros por hora)?\.?", s)
        if not m:
            return v
        n = float(m.group(1).replace(",", "."))
        return int(n) if n == int(n) else round(n, 1)
    target = {"altura_marca_objeto_cm": "cm", "huellas_frenado_m": "m"}.get(b)
    if not target:
        return v
    m = re.fullmatch(r"~?\s*(\d+(?:[.,]\d+)?)\s*(cm|cent[ií]metros?|m|mts?|metros?)?\.?", s)
    if not m:
        return v
    n = float(m.group(1).replace(",", "."))
    unit = "cm" if (m.group(2) or target).startswith("c") else "m"
    if target == "cm" and unit == "m":
        n *= 100
    if target == "m" and unit == "cm":
        n /= 100
    return int(round(n)) if abs(n - round(n)) < 1e-9 else round(n, 2)


def revalidate(d, text):
    """Re-aplica las reglas a hechos YA extraídos (usa las citas guardadas; no necesita el modelo).
    Los valores de archivos antiguos sin cita no se tocan. Devuelve (valores, citas, descartados, bitácora)."""
    vals, citas = dict(d["valores"]), dict(d.get("citas", {}))
    desc, log = dict(d.get("descartados", {})), []
    for k, v in list(vals.items()):
        c = citas.get(k)
        if v is None or c is None:
            continue
        if not supported(k, v, c):
            desc[k], vals[k] = v, None
            citas.pop(k, None)
            log.append(("no_respaldado", k, v))
    vals, l2 = postprocess(vals, citas)
    vals, l3 = clean_values(vals, text)
    log += l2 + l3
    for k, v in list(vals.items()):
        nv = normalize_numeric(k, v)
        if nv != v:
            log.append(("unidad_normalizada", k, f"{v} -> {nv}"))
            vals[k] = nv
    return vals, citas, desc, log


# ------------------------------------------------------------ fidelidad respuesta -> valor (para el chat)
ORIENT = [r"\bizquierd\w*", r"\bderech\w*", r"\bnorte\b", r"\bsur\b", r"\boriente\b", r"\bponiente\b",
          r"\beste\b", r"\boeste\b"]
NUMERIC_BASES = {"velocidad_{V}_kmh", "huellas_frenado_m", "altura_marca_objeto_cm"}


_FILLER = {"tipo", "para", "como", "sobre", "hacia", "desde", "entre", "esta", "este", "esos", "esas", "otro", "otra",
           "cuando", "donde", "pero", "porque", "tiene", "tenia", "habia", "estaba", "estan", "muy", "mas", "menos"}


def _stems4(s):
    """Raíces de palabras de >=4 letras (incluye 'seco', 'mojado', 'noche'), sin conectores ni V1/V2."""
    return {w[:5] for w in _norm(re.sub(r"\bV\d\b", " ", str(s))).split() if len(w) >= 4 and w not in _FILLER}


def faithful(value, resp):
    """True si el valor propuesto por el modelo se sostiene con lo que dijo el perito:
    (1) toda orientación del valor (izquierda/derecha/rumbos) debe estar en la respuesta;
    (2) casi todas sus palabras de contenido deben aparecer en la respuesta (1 de cada 5 puede faltar)."""
    if not isinstance(value, str):
        return True
    v, r = _norm(value), _norm(resp)
    for pat in ORIENT:
        if re.search(pat, v) and not re.search(pat, r):
            return False
    qty = r"\b(?:dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+(?:[.,]\d+)?)\b"
    if not set(re.findall(qty, v)) <= set(re.findall(qty, r)):
        return False  # una cantidad del valor que el perito no dijo
    vs, rs = _stems4(value), _stems4(resp)
    return len(vs - rs) <= len(vs) // 5


def extract_literal_number(tema, resp):
    """Para temas numéricos: lee el número directamente de la respuesta (sin modelo). None si no es trivial."""
    if _base(tema) not in NUMERIC_BASES:
        return None
    nv = normalize_numeric(tema, resp.strip())
    return nv if isinstance(nv, (int, float)) else None


def mentions_other_vehicle(topic_id, pregunta, vehiculos):
    """True si la pregunta de un tema 'por vehículo' menciona al otro vehículo."""
    m = re.search(r"_(V[1-3])(?:_|$)", topic_id)
    if not m:
        return False
    own, q = m.group(1), pregunta.lower()
    own_short = " ".join(vehiculos.get(own, "").lower().split()[:2])
    for vid, desc in vehiculos.items():
        if vid == own:
            continue
        short = " ".join(desc.lower().split()[:2])
        if re.search(rf"\b{vid.lower()}\b", q) or (short and short != own_short and short in q):
            return True
    return False


def verify_extractions(pred, respuesta, pending_ids, asked=None):
    """Guardia del extractor multi-campo. pred = JSON del modelo {tema: {"valor", "evidencia"}}.
    Acepta un dato solo si: el tema está pendiente, la evidencia aparece LITERALMENTE en la respuesta
    y el valor concuerda con la evidencia. Devuelve (aceptados {tema: valor}, rechazados [(tema, motivo)])."""
    acc, rej = {}, []
    if not isinstance(pred, dict):
        return acc, [("*", "no es un JSON")]
    rn = _norm(respuesta)
    for k, e in pred.items():
        if k not in pending_ids:
            rej.append((k, "tema no pendiente"))
            continue
        if not isinstance(e, dict) or "valor" not in e:
            rej.append((k, "formato"))
            continue
        v, ev = e.get("valor"), str(e.get("evidencia") or "")
        if v == SALTADO:
            if k == asked:
                acc[k] = SALTADO
            else:
                rej.append((k, "'sin dato' solo vale para el tema preguntado"))
            continue
        if v is None or (isinstance(v, str) and not v.strip()):
            continue
        if isinstance(v, bool) or not isinstance(v, (str, int, float)):
            rej.append((k, "formato del valor"))
            continue
        en = _norm(ev)
        if not en or en not in rn or not (len(en.split()) >= 2 or re.search(r"\d", en) or en == rn):
            rej.append((k, "evidencia no literal"))
            continue
        if isinstance(v, (int, float)):
            ok = v in _nums(ev) or extract_literal_number(k, ev) == v
        else:
            ok = faithful(v, ev)
        if ok:
            acc[k] = v
        else:
            rej.append((k, "valor no coincide con la evidencia"))
    return acc, rej