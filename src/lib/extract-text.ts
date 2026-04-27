import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite handles ?url
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  return text;
}

export async function extractFromDOCX(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

export async function extractFromImage(
  source: File | Blob | string,
  onProgress?: (p: number) => void
): Promise<string> {
  const result = await Tesseract.recognize(source as any, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text;
}

export async function extractFromFile(
  file: File,
  onProgress?: (p: number) => void
): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractFromPDF(file);
  if (name.endsWith(".docx") || name.endsWith(".doc")) return extractFromDOCX(file);
  if (file.type.startsWith("image/")) return extractFromImage(file, onProgress);
  // Fallback: read as text
  return file.text();
}
