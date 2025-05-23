/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface RewritingRuleProcessingConfigSchema {
  /**
   * The key of the graph rewriting rule to execute
   */
  rule: string;
  /**
   * The processing configuration for the rule
   */
  options: {
    /**
     * Replace either 'all', only the 'first' or between x and y pattern matches
     */
    mode?: "all" | "first" | "interval";
    interval?: {
      min: number;
      max: number;
    };
    repeat?: number | [number, number];
  };
}
