export async function readDocument(
  file: File,
  progress: (message: string) => void,
): Promise<string> {
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose a file smaller than 15 MB.");
  if (/\.csv$/i.test(file.name)) return file.text();
  let worker:
    | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
    | undefined;
  async function ocr(image: File | HTMLCanvasElement) {
    progress(
      "Reading the scan… The first scan downloads a free English reading model.",
    );
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng");
    }
    const result = await worker.recognize(image);
    return result.data.text;
  }
  try {
    if (/\.(png|jpe?g|webp)$/i.test(file.name)) return await ocr(file);
    if (!/\.pdf$/i.test(file.name))
      throw new Error("Choose a PDF, CSV, JPG, PNG or WebP file.");
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 20)
        throw new Error(
          "This PDF has more than 20 pages. Split it into smaller files first.",
        );
      let text = "";
      let scans = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        progress(`Reading page ${i} of ${pdf.numPages}…`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lines: { y: number; items: { x: number; text: string }[] }[] = [];
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = item.transform[5];
          let line = lines.find((l) => Math.abs(l.y - y) < 3);
          if (!line) {
            line = { y, items: [] };
            lines.push(line);
          }
          line.items.push({ x: item.transform[4], text: item.str });
        }
        let pageText = lines
          .sort((a, b) => b.y - a.y)
          .map((l) =>
            l.items
              .sort((a, b) => a.x - b.x)
              .map((v) => v.text)
              .join(" "),
          )
          .join("\n");
        if (pageText.replace(/\s/g, "").length < 20) {
          if (++scans > 5)
            throw new Error(
              "For scanned documents, choose up to 5 pages at a time.",
            );
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
          pageText = await ocr(canvas);
          canvas.width = canvas.height = 0;
        }
        text += pageText + "\n";
        page.cleanup();
      }
      return text;
    } finally {
      await task.destroy();
    }
  } finally {
    await worker?.terminate();
  }
}
