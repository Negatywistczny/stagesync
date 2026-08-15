import { Router, type Request, type Response } from "express";

/**
 * Concert / Festival Backstage Technical & Hospitality Rider.
 * Easter egg endpoint paying tribute to Van Halen's 1982 Brown M&M's QA clause
 * and legendary backstage sound engineer traditions.
 */
export function createRiderRouter(): Router {
  const router = Router();

  const handleRider = (_req: Request, res: Response): void => {
    res.setHeader("X-Stage-Rider-Status", "APPROVED");
    res.setHeader("X-MMS-Clause", "NO-BROWN-MMS");
    res.json({
      ok: true,
      event: "StageSync Global Tour — Technical & Hospitality Rider",
      version: "1982.04.14-REV-11",
      hospitality: {
        dressingRoom: [
          "1x Large bowl of M&M's candies (ABSOLUTELY NO BROWN ONES — QA safety inspection test for electrical rigging)",
          "24x Room-temperature non-carbonated mineral water bottles for lead vocal",
          "12x Fresh espresso shots delivered to Front-of-House (FOH) console at 15-minute intervals",
          "1x Bowl of guacamole prepared exactly 18 minutes prior to stage call",
        ],
      },
      technicalEquipment: {
        fohDesk: [
          "StageSync sub-millisecond timeline synchronization server",
          "1x Dedicated heavy-duty roll of matte black Gaffa Tape (Strictly forbidden to lend to other departments)",
          "1x Drum key (designated to mysteriously vanish before soundcheck)",
          "Direct DI box lines labeled with glow-in-the-dark tape",
          "Guitar amplifiers with master volume dials capable of going to 11",
        ],
        emergencySafety: [
          "1x MIDI Panic 'Gaśnica Sceniczna' button within arm's reach of keyboard tech",
        ],
      },
      quote:
        "Article 126: If brown M&M's are found in the backstage area, the venue production shall be considered non-compliant with technical power specifications.",
    });
  };

  router.get("/rider", handleRider);

  return router;
}
