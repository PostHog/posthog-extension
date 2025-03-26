declare module "tree-sitter" {
  export class Parser {
    setLanguage(language: any): void;
    parse(input: string): Tree;
  }

  export class Tree {
    rootNode: SyntaxNode;
  }

  export class SyntaxNode {
    type: string;
    text: string;
    startPosition: { row: number; column: number };
    query(queryString: string): Query;
  }

  export class Query {
    matches(): QueryMatch[];
  }

  export interface QueryMatch {
    captures: QueryCapture[];
  }

  export interface QueryCapture {
    node: SyntaxNode;
  }
}

declare module "tree-sitter-python" {
  const Python: any;
  export = Python;
}

declare module "tree-sitter-typescript" {
  const TypeScript: any;
  export = TypeScript;
}
