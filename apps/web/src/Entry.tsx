"use client";
import { useSearchParams } from "next/navigation";
import { App } from "./App";
export function Entry({ page }: { page: string }) {
  const params = useSearchParams();
  const id = params.get("id");
  if (page === "portfolio" || page === "holding") {
    if (!id || !/^[a-f0-9-]{36}$/i.test(id))
      return (
        <main className="standalone">
          <h1>Choose a valid portfolio or holding.</h1>
          <a href="/dashboard">Return to overview</a>
        </main>
      );
    const path = `/${page === "portfolio" ? "portfolios" : "holdings"}/${id}`;
    return <App key={path} path={path} />;
  }
  const portfolio = params.get("portfolio");
  return (
    <App
      key={page}
      path={"/" + page}
      assistantPortfolioId={
        page === "assistant" && portfolio && /^[a-f0-9-]{36}$/i.test(portfolio) ? portfolio : undefined
      }
    />
  );
}
