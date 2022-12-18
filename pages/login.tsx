import styles from '@/styles/Login.module.css';
import Head from "next/head";
import {Button, Loading} from "@nextui-org/react";
import {signIn} from "next-auth/react";
import {GetServerSidePropsContext} from "next";
import {useRouter} from "next/router";
import {useEffect} from "react";
import {getServerSession} from "../lib/customSession";


export default function Login() {
    let router = useRouter();
    let error = router.query.error;
    let callbackUrl: string = router.query.callbackUrl as (string | undefined) || "/me";
    if (error) {
        return (
            <div className={styles.container}>
                <Head>
                    <title>Login - Friendly Fire-Share</title>
                </Head>
                <main className={styles.main}>
                    <h1 className={styles.title}>
                        Login on Steam
                    </h1>
                    <p>Something went wrong, please try again</p>
                    <Button onPress={() => signIn("steam", {callbackUrl})}>Click me</Button>
                </main>
            </div>
        );
    } else {
        useEffect(() => {
            // noinspection JSIgnoredPromiseFromCall
            signIn("steam", {callbackUrl});
        });
        return <Loading size="xl">Loading</Loading>;
    }
}

// If connected, then redirect to given callback uri query param
export async function getServerSideProps(context: GetServerSidePropsContext) {
    let session = await getServerSession(context);

    // If session exists, and there is no error in query param
    if (session) {
        return {
            redirect: {
                permanent: false,
                destination: context.query.callbackUrl || "/me"
            }
        };
    }
    return {props: {}};
}