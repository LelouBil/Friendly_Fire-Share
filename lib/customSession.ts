import {GetServerSidePropsContext} from "next";
import {unstable_getServerSession} from "next-auth/next";
import {authOptions} from "../pages/api/auth/[...nextauth]";
import {Session} from "next-auth";

export default function getServerSession(ctx: GetServerSidePropsContext){
    let session =  unstable_getServerSession(ctx.req,ctx.res,authOptions);
    if(session == null){
        console.warn("Session est null, alors que normalement non");
    }
    return session as unknown as Session;
}