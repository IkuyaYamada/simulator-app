import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/simulations/:id", "routes/simulation.:id.tsx"),
  route("/api/stock-info", "routes/api.stock-info.ts"),
  route("/api/stock-prices", "routes/api.stock-prices.ts"),
  route("/api/simulations", "routes/api.simulations.ts"),
  route("/api/checkpoints/*", "routes/api.checkpoints.ts"),
] satisfies RouteConfig;
