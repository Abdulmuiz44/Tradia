// src/types/bcrypt.d.ts
// Simple module declaration to silence TypeScript errors for the bcrypt package
declare module "bcrypt" {
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
  export function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  export function hashSync(data: string | Buffer, saltOrRounds: string | number): string;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  export function compareSync(data: string | Buffer, encrypted: string): boolean;
}