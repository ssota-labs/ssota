import { Outlet, createRootRoute, createRoute } from "@tanstack/react-router";

import { StarterHome } from "./index";

function RootLayout(): React.JSX.Element {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  component: StarterHome,
  getParentRoute: () => rootRoute,
  path: "/",
});

export const routeTree = rootRoute.addChildren([indexRoute]);
