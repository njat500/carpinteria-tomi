import { useEffect, useState } from "react";
import type { Attachment } from "../types";
import { loadFile } from "../storage";
export function Reference({ attachments }: { attachments: Attachment[] }) {
  const supported = attachments.filter(
    (a) =>
      /^image\/(png|jpeg|webp|gif)$/.test(a.type) ||
      a.type === "application/pdf",
  );
  const [selected, setSelected] = useState(""),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const attachment = supported.find((a) => a.id === selected) ?? supported[0];
  useEffect(() => {
    let revoked = false,
      objectUrl = "";
    setUrl("");
    setError("");
    if (attachment)
      void loadFile(attachment.id)
        .then((blob) => {
          if (revoked) return;
          if (!blob) {
            setError("Descargá el archivo desde Nube o adjuntalo otra vez.");
            return;
          }
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        })
        .catch(() => setError("No se pudo abrir el original."));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment?.id]);
  if (!supported.length) return null;
  return (
    <aside className="reference-panel card">
      <h3>Tu plano original</h3>
      <select
        aria-label="Plano de referencia"
        value={attachment?.id ?? ""}
        onChange={(e) => setSelected(e.target.value)}
      >
        {supported.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {url &&
        (attachment.type === "application/pdf" ? (
          <object
            data={url}
            type="application/pdf"
            aria-label="PDF de referencia"
          >
            <a href={url} target="_blank" rel="noreferrer">
              Abrir PDF original
            </a>
          </object>
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={`Plano original: ${attachment.name}`} />
          </a>
        ))}
      {error && <p>{error}</p>}
      <p className="muted">
        Tocá la imagen para ampliarla. Copiá las medidas escritas; no se deducen
        dimensiones por la escala de la fotografía.
      </p>
    </aside>
  );
}
