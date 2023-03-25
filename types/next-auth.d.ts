// noinspection ES6UnusedImports

import NextAuth from "next-auth";

declare module "next-auth" {


  interface Session {
    user: {
      steam_id: string
      name: string,
      profile_picture_url: string
    };
  }

  interface User {
    name: string,
    steam_id: string,
    refresh_token: string | null
    machine_id: string | null
  }
}