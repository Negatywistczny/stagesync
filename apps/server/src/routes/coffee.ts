import { Router, type Request, type Response } from "express";

/**
 * RFC 2324 / RFC 7168 Hyper Text Coffee Pot Control Protocol (HTCPCP/1.0).
 * Easter egg endpoint for weary stage technicians, sound engineers, and musicians.
 */
export function createCoffeeRouter(): Router {
  const router = Router();

  const handleCoffee = (_req: Request, res: Response): void => {
    res.setHeader("X-Guitar-Tuning", "E-A-D-G-B-E");
    res.setHeader("X-Drummer-Punctuality", "404 Not Found");
    res.status(418).json({
      ok: false,
      error: "I'm a teapot",
      rfc: "RFC 2324",
      message:
        "StageSync mixes audio and synchronizes stages with sub-millisecond precision, but is fundamentally incapable of brewing coffee... yet. ☕",
      temperature: "93.5°C",
      beans: "100% Arabica Specialty (Roasted for FOH Engineers)",
      advice: "Grab an espresso from the backstage catering and rock on!",
    });
  };

  router.get("/coffee", handleCoffee);
  router.get("/brew", handleCoffee);
  router.post("/brew", handleCoffee);

  return router;
}
