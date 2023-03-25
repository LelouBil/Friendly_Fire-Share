import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "@/lib/customSession";
import {prisma} from "@/lib/db";
import {BorrowingUser, ShareInfo} from "@/lib/getSharesOfUser";
import {steam_web} from "@/lib/steam_web";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getApiServerSession(req, res);


  if (!req.body.borrower || typeof req.body.borrower !== "string") {
    return res.status(400).send("Missing property borrower");
  }


  const borrower_id = req.body.borrower;

  const borrower = await prisma.user.findUnique({
    where: {
      id: borrower_id
    }
  });
  if (borrower === null) {
    return res.status(400).send(`User with steam id ${borrower_id} does not exist`);
  }

  await prisma.user
    .update({
      where: {
        id: session.user.steam_id
      },
      data: {
        Borrowers: {
          connect: {
            id: borrower_id
          }
        }
      }
    });

  const newShare: ShareInfo = {
    computer: null,
    in_use: false,
    lastUse: null
  };

  let steamPlayerSummary = (await steam_web.getPlayerSummary(borrower_id))!;
  const borrowerInfo: BorrowingUser = {
    name: steamPlayerSummary.personaname,
    steam_id: borrower_id,
    avatar_url: steamPlayerSummary.avatarfull,
    profile_url: steamPlayerSummary.profileurl
  };

  return res.status(200).send({...borrowerInfo, ...newShare});
}