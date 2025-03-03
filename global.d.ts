declare module "*.png" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: string;
  export = value;
}

declare const BASE_URL: string;
declare const VERSION: string;
declare const PRODUCTION: boolean;
