# OperAID-Dev-Challenge

## Frontend configuration

The Angular client reads the backend URL from `src/environments/environment.ts`.
The default points to `http://localhost:3000`:

```ts
export const environment = {
  backendUrl: 'http://localhost:3000'
};
```

Change `backendUrl` to match the address of your running API server.
