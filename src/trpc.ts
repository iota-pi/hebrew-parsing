import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../lambda/router';

export const trpc = createTRPCReact<AppRouter>({
  abortOnUnmount: true,
});
