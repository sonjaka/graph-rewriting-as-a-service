/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

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
export interface GraphInstantiatedAttributeSchema {
  type: "randexp" | "jsonLogic" | "faker";
  args: {
    [k: string]: unknown;
  };
}
