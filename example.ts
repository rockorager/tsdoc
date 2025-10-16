/**
 * A simple greeting function that says hello
 * @param name The name of the person to greet
 * @returns A greeting message
 * @example
 * ```ts
 * greet("Alice") // Returns "Hello, Alice!"
 * ```
 */
export function greet(name: string): string {
    return `Hello, ${name}!`;
}

/**
 * A person interface representing basic user data
 */
export interface Person {
    /** The person's full name */
    name: string;
    /** The person's age in years */
    age: number;
    /** Optional email address */
    email?: string;
}

/**
 * Calculate the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum of a and b
 */
export const add = (a: number, b: number): number => a + b;

/**
 * A configuration type
 */
export type Config = {
    /** Enable debug mode */
    debug: boolean;
    /** Port number */
    port: number;
};
