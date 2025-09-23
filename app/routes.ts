import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/simulations", "routes/simulations.tsx"),
  route("/simulations/:id", "routes/simulation.:id.tsx"),
  route("/api/stock-info", "routes/api.stock-info.ts"),
  route("/api/simulations", "routes/api.simulations.ts"),
] satisfies RouteConfig;
