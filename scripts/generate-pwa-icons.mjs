// PWA 아이콘 생성 스크립트 (Task 015) — 일회성 로컬 도구.
//
// 외부 다운로드·이미지 라이브러리(sharp 등) 없이 순수 Node 내장 zlib만으로 PNG를 직접
// 인코딩한다. 디자인은 아주 단순하다: 남색/보라 배경 + 흰색 십자가 도형. maskable 아이콘도
// 겸하도록 도형을 캔버스 중앙 안전 영역(약 80%) 안에만 그려 가장자리가 잘려도 무방하게 한다.
//
// 실행: node scripts/generate-pwa-icons.mjs
// 결과: public/icons/icon-192.png, public/icons/icon-512.png
import { createWriteStream } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// 배경: 남색/보라 계열(#4338ca 인디고 700). 도형: 흰색 십자가.
const BG = [67, 56, 202, 255];
const FG = [255, 255, 255, 255];

/** size x size RGBA 픽셀 버퍼에 중앙 십자가를 그린다(안전 영역 80% 이내). */
function renderIconPixels(size) {
  const buf = Buffer.alloc(size * size * 4);
  const armThickness = Math.round(size * 0.16); // 십자가 팔 두께
  const armLength = Math.round(size * 0.62); // 십자가 팔 길이(안전 영역 내)
  const cx = size / 2;
  const cy = size / 2;

  const halfThick = armThickness / 2;
  const halfLen = armLength / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inVerticalArm = Math.abs(x - cx) <= halfThick && Math.abs(y - cy) <= halfLen;
      const inHorizontalArm = Math.abs(y - cy) <= halfThick && Math.abs(x - cx) <= halfLen;
      const isCross = inVerticalArm || inHorizontalArm;
      const color = isCross ? FG : BG;
      const idx = (y * size + x) * 4;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = color[3];
    }
  }
  return buf;
}

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = makeCrcTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    crc = (crc >>> 8) ^ table[c];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** RGBA 픽셀 버퍼(size x size)를 PNG 파일 바이트로 인코딩한다. */
function encodePng(pixels, size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  // 각 행 앞에 필터 타입 바이트(0 = None)를 붙인다.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idatData = zlib.deflateSync(raw);
  const idat = chunk("IDAT", idatData);

  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function writeIcon(size, filename) {
  const pixels = renderIconPixels(size);
  const png = encodePng(pixels, size);
  const outPath = path.join(outDir, filename);
  const stream = createWriteStream(outPath);
  stream.write(png);
  stream.end();
  console.log(`생성됨: ${outPath} (${png.length} bytes)`);
}

writeIcon(192, "icon-192.png");
writeIcon(512, "icon-512.png");
