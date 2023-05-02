import {GetServerSidePropsContext, NextApiRequest, NextApiResponse} from "next";
import {unstable_getServerSession} from "next-auth/next";
import {authOptions} from "@/pages/api/auth/[...nextauth]";
import {Session} from "next-auth";
import {NextResponse} from "next/server";
import * as Sentry from "@sentry/nextjs"

export async function getServerSession(ctx: GetServerSidePropsContext): Promise<Session> {
  return getActualServerSession(ctx.req, ctx.res);
}

async function getActualServerSession(req: GetServerSidePropsContext["req"] | NextApiRequest,
                                      res: GetServerSidePropsContext["res"] | NextResponse): Promise<Session> {
  // @ts-ignore
  let session = await unstable_getServerSession(req, res, authOptions);
  if (session == null) {
    console.warn("Session est null, alors que normalement non");
    Sentry.setUser(null)
  }else{
    Sentry.setUser({
      id: session.user.steam_id,
      username: session.user.name
    })
  }
  return session!;
}

export async function getApiServerSession(req: NextApiRequest, res: NextApiResponse): Promise<Session> {
  return getActualServerSession(req, res);
}