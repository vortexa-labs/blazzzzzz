/// <reference types="chrome"/>

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PUBLIC_URL: string;
  }
}

declare module '*.png' {
  const value: string;
  export default value;
} 