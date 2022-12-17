import NextAuth, {AuthOptions} from "next-auth";
import MyAdapter from "../../../lib/customAdapter";
import {steam_web} from "../../../lib/steam_web";


export const authOptions: AuthOptions = {
    adapter: MyAdapter(),
    session: {
        strategy: "jwt"
    },
    callbacks: {
        jwt: async function ({token, profile, user}) {
            if(user){
                token.sub = user.steam_id;
            }
            return token;
        },
        session: async function ({session, token,user}) {
            let steam_id = token.sub!;
            let summary = await steam_web.getPlayerSummary(steam_id);
            session.user = {
                steam_id,
                name: summary!.personaname,
                profile_picture_url: summary!.avatarfull
            };
            return session;
        }
    },
    // Configure one or more authentication providers
    providers: [
        {
            id: "steam",
            name: "Steam",
            clientId: process.env.OIDC_STEAM_CLIENT_ID,
            clientSecret: process.env.OIDC_STEAM_CLIENT_SECRET,
            type: "oauth",
            idToken: true,
            wellKnown: process.env.OIDC_STEAM_CLIENT_URL, // TODO: change this to the real one
            authorization: {params: {scope: "openid profile"}},
            profile(data: any) {
                return {
                    id: data.steam_id,
                    steam_id: data.steam_id,
                    name: data.preferred_username,
                    refresh_token: null,
                    machine_id: null
                };
            }
        }
    ],
    pages: {
        signIn: "/login"
    }
};

export default NextAuth(authOptions);