/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface GraphRewritingRuleSchema {
  key: string;
  patternGraph: PatternGraphSchema;
  replacementGraph: ReplacementGraphSchema | ExternalReplacementGraphConfig;
  options?: {
    homomorphic?: boolean;
  };
}
export interface PatternGraphSchema {
  options: {
    /**
     * Type of the graph: either directed or undirected
     */
    type: "directed" | "undirected";
  };
  nodes: PatternNodeSchema[];
  edges: GraphEdgeSchema[];
  nacs?: NacSchema[];
}
export interface PatternNodeSchema {
  key: string;
  attributes?: {
    [k: string]: number | string | boolean | null | (number | string | boolean)[];
  };
}
export interface GraphEdgeSchema {
  /**
   * The edge's ID
   */
  key: string;
  /**
   * The key of the node at the edge's source
   */
  source: string;
  /**
   * The key of the node at the edge's target
   */
  target: string;
  /**
   * The edges attributes & values
   */
  attributes: {
    [k: string]: number | string | boolean;
  };
}
export interface NacSchema {
  options?: {
    /**
     * Type of the graph: either directed or undirected
     */
    type?: "directed" | "undirected";
    [k: string]: unknown;
  };
  nodes: PatternNodeSchema[];
  edges: GraphEdgeSchema[];
}
export interface ReplacementGraphSchema {
  options: {
    /**
     * Type of the graph: either directed or undirected
     */
    type: "directed" | "undirected";
  };
  nodes: ReplacementNodeSchema[];
  edges: ReplacementEdgeSchema[];
}
export interface ReplacementNodeSchema {
  key: string;
  attributes?: {
    [k: string]: number | string | boolean | null | GraphInstantiatedAttributeSchema;
  };
  rewriteOptions?: {
    /**
     * Defines how the attributes are handles during rewrite. 'Modify' mode adds or updates the given attributes. Setting an attribute to null deletes it. 'Replace' mode deletes all attributes of the matched node and then sets the given attributes. 'Delete' mode deletes all attributes and doesn't add any new ones.
     */
    attributeReplacementMode?: "modify" | "replace" | "delete";
  };
}
export interface GraphInstantiatedAttributeSchema {
  type: "randexp" | "jsonLogic" | "faker";
  args: {
    [k: string]: unknown;
  };
}
export interface ReplacementEdgeSchema {
  /**
   * The edge's ID
   */
  key: string;
  /**
   * The key of the node at the edge's source
   */
  source: string;
  /**
   * The key of the node at the edge's target
   */
  target: string;
  /**
   * The edges attributes & values
   */
  attributes: {
    type?: string;
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^(?!type$).*".
     */
    [k: string]: number | string | boolean | GraphInstantiatedAttributeSchema;
  };
  rewriteOptions?: {
    /**
     * Defines how the attributes are handles during rewrite. 'Modify' mode adds or updates the given attributes (setting an attribute to null deletes it). 'Replace' mode deletes all attributes of the matched node and then sets the given attributes. 'Delete' mode deletes all attributes and doesn't add any new ones.
     */
    attributeReplacementMode?: "modify" | "replace" | "delete";
  };
}
export interface ExternalReplacementGraphConfig {
  type: "externalApi";
  args?: ExternalApiInstantiationOptions;
}
export interface ExternalApiInstantiationOptions {
  endpoint: string;
  additionalRequestBodyParameters?: {
    [k: string]: unknown;
  };
}
