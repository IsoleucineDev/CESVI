"""Lógica del chat (sin mlx_lm, para poder probarla): aplica la respuesta del perito al estado del caso.
El modelo PROPONE los datos (de todos los temas pendientes que mencione la respuesta) y el código VERIFICA."""
import re

from .facts_utils import extract_literal_number, verify_extractions
from .schema import SALTADO, SYSTEM_E2, build_e2_user, parse_json_loose

# "No hay dato" con otras palabras. OJO: "no hay señales" o "no se observan huellas" SÍ son respuestas válidas.
NO_DATA = re.compile(
    r"^\W*(saltar|n/?a|sin (dato|informaci[oó]n)|desconozco|no sé\b|no se\W*$|"
    r"no se (sabe|define|menciona|especifica|indica|determina)|"
    r"no (tengo|tenemos|hay|se tiene|se cuenta con|est[aá]|existe|consta)( el| ese| ningun[ao]?| mayor)? ?"
    r"(dato|detalle|declaraci[oó]n|informaci[oó]n))", re.I)


def process_answer(estado, tema, pregunta, resp, pend, modalidad, vehiculos, extract_fn):
    """Actualiza `estado` in situ y devuelve los mensajes para el perito.
    pend: lista de temas pendientes (dicts id/desc) ANTES de esta respuesta. extract_fn(system, user, max_tokens)->texto."""
    resp = resp.strip()
    if NO_DATA.match(resp):
        estado[tema] = SALTADO
        return ["→ registrado como sin dato"]
    out = extract_fn(SYSTEM_E2, build_e2_user(modalidad, vehiculos, pend, pregunta, resp, tema), 500)
    acc, rej = verify_extractions(parse_json_loose(out), resp, {t["id"] for t in pend}, asked=tema)
    msgs = []
    num = extract_literal_number(tema, resp)
    if tema.startswith("declaracion_"):
        estado[tema] = resp              # la declaración se guarda TEXTUAL
    elif num is not None:
        estado[tema] = num               # número leído directo de la respuesta
    elif tema in acc:
        estado[tema] = acc[tema]
    else:
        estado[tema] = resp
        msgs.append("(no pude verificar la extracción; guardé tu texto tal cual)")
    msgs.append(f"→ {tema} = {estado[tema]!r}")
    for k, v in acc.items():
        if k != tema and k not in estado:
            estado[k] = v
            msgs.append(f"  también entendí: {k} = {v!r}")
    bad = [k for k, _ in rej if k not in (tema, "*")]
    if bad:
        msgs.append("  (descarté por no coincidir con tu respuesta: " + ", ".join(bad) + "; los preguntaré)")
    return msgs