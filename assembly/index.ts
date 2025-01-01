export function sayHello(name: string | null = null): string {
  return `Hello, ${name || "World"}!`;
}

// some
export * from "./knowledge-graph";
export * from "./example-tools";
