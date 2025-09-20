import type { Route } from "./+types/home";
import { InvestmentDashboard } from "../components/dashboard/InvestmentDashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "投資シミュレーション ダッシュボード" },
    {
      name: "description",
      content: "AIを活用した投資戦略の仮説検証と学習支援システム",
    },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  // TODO: ダッシュボード用のデータを取得
  return {
    message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
    // 将来的にここでダッシュボードのデータを取得
    dashboardData: {
      stats: {},
      activeSimulations: [],
      completedSimulations: [],
      learningData: {},
    },
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <InvestmentDashboard />;
}
