import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "@/lib/customSession";
import {prisma} from "@/lib/db";
import {check_machine_id} from "@/lib/check_machine_id";
import {Buffer} from "buffer/";
import {invalidateSteamUser} from "@/lib/customSteamUser";
import * as Sentry from "@sentry/nextjs"


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getApiServerSession(req, res);
  Sentry.setUser({
    id: session.user.steam_id,
    username: session.user.name
  })
  if (!req.body.machine_id || typeof req.body.machine_id !== "string") {
    return res.status(400).send("Bad request, missing machine_id");
  }

  if (!check_machine_id(Buffer.from(req.body.machine_id, "hex"))) {
    return res.status(400).send("Bad request, machine_id invalid");
  }
  await prisma.user.update({
    where: {
      id: session.user.steam_id
    },
    data: {
      MachineId: req.body.machine_id
    }
  });
  await invalidateSteamUser(session.user.steam_id);
  console.log(`Updated machine_id of user ${session.user.name}`);
  res.status(200).end()
}