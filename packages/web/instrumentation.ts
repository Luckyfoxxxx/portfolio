export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPriceCron } = await import("./lib/price-cron/index");
    startPriceCron();
  }
}
