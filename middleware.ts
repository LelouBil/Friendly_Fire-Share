import { withAuth } from "next-auth/middleware"
import {authOptions} from "./pages/api/auth/[...nextauth]";

export default withAuth(
    {
        pages:{
            signIn:"/login"
        }
    }
);
