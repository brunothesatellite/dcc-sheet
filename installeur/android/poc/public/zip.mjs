/* ============================================================
   zip.mjs — fabrication d'un ZIP non compresse (method 0)
   ------------------------------------------------------------
   Meme structure que tests/php/import-zip.php :
     export.json + images/<uid>.webp
   Aucune dependance : entetes ZIP ecrits a la main (CRC32,
   entete locale, centrale, EOCD).
   ============================================================ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(v) { return [v & 0xff, (v >>> 8) & 0xff]; }
function u32(v) { return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]; }

/**
 * Construit un ZIP valide (methode stockee).
 * @param {Array<{name: string, data: Uint8Array}>} entries
 * @returns {Blob}
 */
export function buildZip(entries) {
  const enc = new TextEncoder();
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);

    /* Entete locale (30 octets) */
    const local = [
      ...u32(0x04034b50), // signature
      ...u16(20),          // version extraie
      ...u16(0),           // drapeaux
      ...u16(0),           // methode : stocke
      ...u16(0), ...u16(0), // heure / date
      ...u32(crc),
      ...u32(data.length), // taille compressee
      ...u32(data.length), // taille brute
      ...u16(nameBytes.length),
      ...u16(0),           // longueur extra
    ];
    localChunks.push(new Uint8Array(local), nameBytes, data);

    centralChunks.push({ nameBytes, crc, size: data.length, offset });
    offset += local.length + nameBytes.length + data.length;
  }

  /* Repertoire central */
  const cdChunks = [];
  let cdSize = 0;
  for (const e of centralChunks) {
    const header = [
      ...u32(0x02014b50), // signature
      ...u16(20), ...u16(20), // versions
      ...u16(0), ...u16(0),   // drapeaux / methode
      ...u16(0), ...u16(0),   // heure / date
      ...u32(e.crc),
      ...u32(e.size),
      ...u32(e.size),
      ...u16(e.nameBytes.length),
      ...u16(0), ...u16(0), // extra / commentaire
      ...u16(0), ...u16(0), // disque / attributs internes
      ...u32(0),            // attributs externes
      ...u32(e.offset),
    ];
    cdChunks.push(new Uint8Array(header), e.nameBytes);
    cdSize += header.length + e.nameBytes.length;
  }

  /* Fin de repertoire central (22 octets) */
  const eocd = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0), ...u16(0),
    ...u16(entries.length), ...u16(entries.length),
    ...u32(cdSize),
    ...u32(offset),
    ...u16(0),
  ]);

  return new Blob([...localChunks, ...cdChunks, eocd], { type: 'application/zip' });
}
