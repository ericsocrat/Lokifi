import { notFound } from "next/navigation";
import { App } from "../../src/App";
export default async function Page({ params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const path = "/" + route.join("/");
  if (!/^\/(login|register|dashboard|watchlist|settings|portfolios\/[a-zA-Z0-9-]+|holdings\/[a-zA-Z0-9-]+)$/.test(path))
    notFound();
  return <App key={path} path={path} />;
}
