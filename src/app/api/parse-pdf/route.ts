import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import path from 'path';
import { pathToFileURL } from 'url';

// Resolve the absolute path to the PDF.js worker module and configure the parser.
// This resolves the "Setting up fake worker failed" error in Next.js/Turbopack server environments
// by explicitly directing PDF.js to the worker file on disk instead of letting it auto-detect relative to Next.js chunks.
const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
PDFParse.setWorker(pathToFileURL(workerPath).href);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please select a valid PDF file.' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF files are supported.' },
        { status: 400 }
      );
    }

    // Convert file to buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF text using modern class-based PDFParse API
    const parser = new PDFParse({ data: buffer });
    const parsedData = await parser.getText();
    const cleanedText = parsedData.text.trim();

    if (!cleanedText) {
      return NextResponse.json(
        { error: 'The PDF file seems to be empty or contains only scanned images (no selectable text).' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      text: cleanedText,
      pageCount: parsedData.total,
      info: {},
    });
  } catch (error: any) {
    console.error('Error details during PDF parsing:', error);
    return NextResponse.json(
      { error: `Failed to parse PDF file. Reason: ${error.message || 'Unknown parsing error'}` },
      { status: 500 }
    );
  }
}
