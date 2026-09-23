/**
 * Shared shape returned by the auth Server Actions and read by the auth forms
 * through React's `useActionState`. `undefined` is the initial state (nothing
 * submitted yet).
 */
export type AuthFormState =
  | {
      error?: string;
      status?: "awaiting-confirmation" | "reset-sent";
    }
  | undefined;
