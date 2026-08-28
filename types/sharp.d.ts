declare module "sharp" {
  type Metadata = { width?: number; height?: number; autoOrient?: { width: number; height: number } };
  type OutputInfo = { width: number; height: number };
  type ResizeOptions = { width: number; withoutEnlargement?: boolean };
  type WebpOptions = { quality?: number; effort?: number };
  interface SharpInstance {
    rotate(): SharpInstance;
    resize(options: ResizeOptions): SharpInstance;
    webp(options?: WebpOptions): SharpInstance;
    metadata(): Promise<Metadata>;
    toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: OutputInfo }>;
  }
  export default function sharp(input: Buffer): SharpInstance;
}
