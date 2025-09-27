import type { Route } from "./+types/home";
import { InvestmentDashboard } from "../components/dashboard/InvestmentDashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "投資シミュレーション ダッシュボード" },
    {
      name: "description",
      content: "投資戦略の仮説検証と学習支援システム",
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  try {
    const db = context.cloudflare.env.simulator_app_db;

    const simulations = await db.prepare(`
      SELECT 
        s.simulation_id,
        s.symbol,
        s.initial_capital,
        s.start_date,
        s.end_date,
        s.status,
        s.created_at,
        st.name as stock_name,
        st.sector,
        st.industry
      FROM simulations s
      JOIN stocks st ON s.symbol = st.symbol
      ORDER BY s.created_at DESC
    `).all();

    return Response.json({ simulations: simulations.results });

  } catch (error) {
    console.error("Simulation list error:", error);
    return Response.json({ 
      error: "Internal server error",
      simulations: []
    });
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <InvestmentDashboard />;
}
