declare module "bwip-js" {
  type ToBufferOptions = {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
    backgroundcolor?: string;
  };

  const bwipjs: {
    toBuffer(options: ToBufferOptions): Promise<Buffer>;
  };

  export default bwipjs;
}
