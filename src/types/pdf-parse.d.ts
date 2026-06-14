declare module 'pdf-parse' {
  export class PDFParse {
    constructor(options: { data: Buffer | Uint8Array; verbosity?: number });
    static setWorker(workerSrc: string): string;
    getText(params?: any): Promise<{ text: string; total: number; pages: Array<{ text: string; num: number }> }>;
    getInfo(params?: any): Promise<{
      total: number;
      info: any;
      metadata: any;
      fingerprints: string;
      outline: any[];
      permission: any;
      pages: any[];
    }>;
  }
}
